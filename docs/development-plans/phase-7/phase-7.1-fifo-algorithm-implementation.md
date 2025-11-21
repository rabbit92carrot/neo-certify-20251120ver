# Phase 7.1: FIFO 알고리즘 완전 구현

## 📋 개요

**목표**: FIFO (First In First Out) 알고리즘 완전 구현 및 테스트
**우선순위**: P0 - 필수 비즈니스 로직
**예상 소요 시간**: 3-4시간

---

## 🎯 Development Principles Checklist

- [ ] **SSOT (Single Source of Truth)**: 모든 리터럴은 constants에서 관리
- [ ] **No Magic Numbers**: 하드코딩된 숫자 없이 상수 사용
- [ ] **No 'any' Type**: 모든 타입을 명시적으로 정의
- [ ] **Clean Code**: 함수는 단일 책임, 명확한 변수명
- [ ] **Test-Driven Development**: 테스트 시나리오 우선 작성
- [ ] **Git Conventional Commits**: feat/fix/docs/test 등 규칙 준수
- [ ] **Frontend-First Development**: API 호출 전 타입 및 인터페이스 정의
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 🎯 FIFO 정렬 규칙

### 정렬 우선순위 (4단계)

```typescript
import { FIFO_SORT } from '@/constants/business-logic';

// 1차 정렬: manufacture_date ASC (제조일이 빠른 Lot 우선)
// 2차 정렬: expiry_date ASC (유통기한이 가까운 Lot 우선)
// 3차 정렬: sequence_number ASC (같은 Lot 내 순서 번호)
// 4차 정렬: created_at ASC (Lot 생성 시간)
```

---

## 📦 완전 구현 코드

### 1. FIFO 할당 함수

**파일 경로**: `src/services/fifo.ts`

```typescript
import { supabase } from '@/lib/supabase';
import { DATABASE_CONSTANTS, DATABASE_FUNCTIONS } from '@/constants/database';
import { FIFO_SORT } from '@/constants/business-logic';
import { ERROR_MESSAGES, formatMessage } from '@/constants/messages';
import type { VirtualCode, Lot } from '@/types/database';

/**
 * FIFO 알고리즘으로 Virtual Code 할당
 *
 * @param productId 제품 ID
 * @param quantity 필요한 수량
 * @param ownerId 소유자 ID (조직 ID)
 * @returns 할당된 Virtual Code 목록
 * @throws InsufficientStockError 재고 부족 시
 */
export async function allocateVirtualCodesFIFO(
  productId: string,
  quantity: number,
  ownerId: string
): Promise<VirtualCode[]> {
  const { TABLES, COLUMNS } = DATABASE_CONSTANTS;

  // Step 1: FIFO 순서로 Lot 조회
  const { data: lots, error: lotsError } = await supabase
    .from(TABLES.LOTS)
    .select('*, virtual_codes(*)')
    .eq(COLUMNS.LOTS.PRODUCT_ID, productId)
    .order(FIFO_SORT.PRIMARY.FIELD, { ascending: true })
    .order(FIFO_SORT.SECONDARY.FIELD, { ascending: true })
    .order(FIFO_SORT.FALLBACK.FIELD, { ascending: true });

  if (lotsError) throw lotsError;
  if (!lots || lots.length === 0) {
    throw new Error(
      formatMessage(ERROR_MESSAGES.INSUFFICIENT_STOCK, { stock: 0 })
    );
  }

  // Step 2: 각 Lot에서 IN_STOCK 상태의 Virtual Code를 FIFO로 수집
  let remaining = quantity;
  const allocated: VirtualCode[] = [];

  for (const lot of lots) {
    if (remaining === 0) break;

    // Lot 내부에서 sequence_number로 정렬
    const availableCodes = (lot.virtual_codes as VirtualCode[])
      .filter(
        (code) =>
          code[COLUMNS.VIRTUAL_CODES.STATUS] === 'IN_STOCK' &&
          code[COLUMNS.VIRTUAL_CODES.OWNER_ID] === ownerId
      )
      .sort(
        (a, b) =>
          a[COLUMNS.VIRTUAL_CODES.SEQUENCE_NUMBER] -
          b[COLUMNS.VIRTUAL_CODES.SEQUENCE_NUMBER]
      );

    if (availableCodes.length === 0) continue;

    // 필요한 만큼만 할당
    const take = Math.min(remaining, availableCodes.length);
    allocated.push(...availableCodes.slice(0, take));
    remaining -= take;
  }

  // Step 3: 재고 부족 검증
  if (remaining > 0) {
    throw new Error(
      formatMessage(ERROR_MESSAGES.INSUFFICIENT_STOCK, {
        stock: quantity - remaining,
      })
    );
  }

  return allocated;
}

/**
 * FIFO 할당 가능 여부 확인 (재고 조회 전용)
 *
 * @param productId 제품 ID
 * @param ownerId 소유자 ID
 * @returns 사용 가능한 총 수량
 */
export async function getAvailableStock(
  productId: string,
  ownerId: string
): Promise<number> {
  const { data, error } = await supabase
    .from(DATABASE_CONSTANTS.TABLES.VIRTUAL_CODES)
    .select('id', { count: 'exact', head: true })
    .eq('lot_id.product_id', productId)
    .eq(DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.OWNER_ID, ownerId)
    .eq(DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.STATUS, 'IN_STOCK');

  if (error) throw error;

  return data?.count || 0;
}
```

---

## 🧪 테스트 시나리오

### Test 1: 단일 Lot FIFO
```typescript
describe('FIFO Algorithm - Single Lot', () => {
  it('should allocate codes in sequence_number order', async () => {
    // Given: Lot A (quantity: 10, sequence_number: 1-10)
    const allocated = await allocateVirtualCodesFIFO('product-1', 5, 'org-1');

    // Then: sequence_number 1, 2, 3, 4, 5 순서로 할당
    expect(allocated.map(c => c.sequence_number)).toEqual([1, 2, 3, 4, 5]);
  });
});
```

### Test 2: 다중 Lot FIFO
```typescript
describe('FIFO Algorithm - Multiple Lots', () => {
  it('should allocate from oldest manufacture_date first', async () => {
    // Given:
    // - Lot A: manufacture_date = 2025-01-01, quantity: 5
    // - Lot B: manufacture_date = 2025-01-15, quantity: 5
    const allocated = await allocateVirtualCodesFIFO('product-1', 7, 'org-1');

    // Then: Lot A의 5개 + Lot B의 2개 할당
    expect(allocated.slice(0, 5).every(c => c.lot_id === 'lot-A')).toBe(true);
    expect(allocated.slice(5, 7).every(c => c.lot_id === 'lot-B')).toBe(true);
  });
});
```

### Test 3: 재고 부족
```typescript
describe('FIFO Algorithm - Insufficient Stock', () => {
  it('should throw error when stock is insufficient', async () => {
    // Given: 총 재고 10개
    // When: 15개 요청
    await expect(
      allocateVirtualCodesFIFO('product-1', 15, 'org-1')
    ).rejects.toThrow('재고가 부족합니다');
  });
});
```

### Test 4: 유통기한 우선순위
```typescript
describe('FIFO Algorithm - Expiry Date Priority', () => {
  it('should prioritize closer expiry_date when manufacture_date is same', async () => {
    // Given:
    // - Lot A: manufacture_date = 2025-01-01, expiry_date = 2025-07-01
    // - Lot B: manufacture_date = 2025-01-01, expiry_date = 2025-06-01
    const allocated = await allocateVirtualCodesFIFO('product-1', 3, 'org-1');

    // Then: Lot B (유통기한 가까움) 먼저 할당
    expect(allocated.every(c => c.lot_id === 'lot-B')).toBe(true);
  });
});
```

---

## ✅ 완료 기준

- [ ] FIFO 할당 함수 구현 (4단계 정렬)
- [ ] sequence_number 정렬 적용
- [ ] 재고 부족 에러 처리
- [ ] 단위 테스트 4개 이상 작성
- [ ] 성능 테스트 (1000개 Lot, 10000개 Code)
- [ ] TypeScript 타입 에러 없음

---

## 🔗 관련 문서

- [constants-business-logic.md](../phase-0/constants-business-logic.md)
- [Phase 1.3 - Virtual Codes Table](../phase-1/phase-1.3-relations-tables.md)
- [Phase 3.5 - Manufacturer Shipment](../phase-3/phase-3.5-shipment.md)
- [Phase 4.3 - Distributor Outbound](../phase-4/phase-4.3-outbound.md)
