# Phase 7.1: FIFO 알고리즘 구현 및 테스트

## 📋 Overview

**목표**: FIFO (First-In-First-Out) 재고 할당 알고리즘을 구현하고 다양한 시나리오에서 정확히 동작하는지 검증합니다.

**PRD 참조**:
- Section 5.2: 재고 관리 및 FIFO 정책
- Section 15.1: FIFO 알고리즘 상세 명세

**예상 소요 시간**: 1-2일

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

## 🎯 핵심 요구사항

### 1. FIFO 정렬 기준 (PRD Section 15.1)

**우선순위 순서**:
1. **사용기한(expiry_date)**: 가까운 날짜 우선 (오름차순)
2. **제조일(manufacture_date)**: 오래된 날짜 우선 (오름차순)
3. **Lot 생성일(created_at)**: 오래된 Lot 우선 (오름차순)

```typescript
const sortedInventory = [...inventory].sort((a, b) => {
  // 우선순위 1: 사용기한 (오름차순 - 가까운 것부터)
  const expiryCompare = new Date(a.lot.expiry_date).getTime() - new Date(b.lot.expiry_date).getTime()
  if (expiryCompare !== 0) return expiryCompare

  // 우선순위 2: 제조일 (오름차순 - 오래된 것부터)
  const mfgCompare = new Date(a.lot.manufacture_date).getTime() - new Date(b.lot.manufacture_date).getTime()
  if (mfgCompare !== 0) return mfgCompare

  // 우선순위 3: Lot 생성일 (오름차순)
  return new Date(a.lot.created_at).getTime() - new Date(b.lot.created_at).getTime()
})
```

### 2. 다중 Lot 할당

**요구사항**:
- 단일 제품 출고 시 여러 Lot에서 수량을 나눠서 할당 가능
- FIFO 순서대로 재고가 소진될 때까지 순차 할당
- 요청 수량을 모두 충족할 수 있을 때만 할당 진행

**알고리즘**:
```typescript
const allocateFIFO = (productId: string, requestedQuantity: number) => {
  // 1. 제품별 재고 필터링
  const productInventory = inventory.filter(inv => inv.lot.product_id === productId)

  // 2. FIFO 정렬
  const sortedInventory = sortByFIFO(productInventory)

  // 3. 총 가용 재고 확인
  const totalAvailable = sortedInventory.reduce((sum, inv) => sum + inv.current_quantity, 0)
  if (totalAvailable < requestedQuantity) {
    throw new Error(`재고 부족: 요청 ${requestedQuantity}, 가용 ${totalAvailable}`)
  }

  // 4. FIFO 순서로 할당
  const allocatedLots: { lot: Lot; quantity: number }[] = []
  let remaining = requestedQuantity

  for (const inv of sortedInventory) {
    if (remaining === 0) break

    const allocateQty = Math.min(inv.current_quantity, remaining)
    allocatedLots.push({ lot: inv.lot, quantity: allocateQty })
    remaining -= allocateQty
  }

  return allocatedLots
}
```

### 3. 재고 부족 처리

**요구사항**:
- 요청 수량 > 가용 재고: 에러 발생 (부분 출고 불가)
- 에러 메시지에 요청/가용 수량 명시
- 트랜잭션 롤백 보장

---

## 🧪 테스트 시나리오

### 시나리오 1: 단일 Lot 할당

**Given**:
- Product A의 Lot #1: 수량 100, 사용기한 2025-06-30

**When**:
- 50개 출고 요청

**Then**:
- Lot #1에서 50개 할당
- Lot #1 잔여 수량: 50

---

### 시나리오 2: 다중 Lot 할당 (FIFO 순서)

**Given**:
- Product A의 Lot #1: 수량 30, 사용기한 2025-06-30
- Product A의 Lot #2: 수량 50, 사용기한 2025-07-31

**When**:
- 60개 출고 요청

**Then**:
- Lot #1에서 30개 할당 (먼저 소진)
- Lot #2에서 30개 할당
- Lot #1 잔여: 0
- Lot #2 잔여: 20

---

### 시나리오 3: 사용기한 동일 시 제조일 기준 정렬

**Given**:
- Product A의 Lot #1: 사용기한 2025-12-31, 제조일 2025-01-15
- Product A의 Lot #2: 사용기한 2025-12-31, 제조일 2025-01-10

**When**:
- 10개 출고 요청

**Then**:
- Lot #2에서 할당 (제조일이 더 빠름)

---

### 시나리오 4: 사용기한/제조일 동일 시 생성일 기준

**Given**:
- Product A의 Lot #1: 사용기한 2025-12-31, 제조일 2025-01-15, created_at 2025-01-16 10:00
- Product A의 Lot #2: 사용기한 2025-12-31, 제조일 2025-01-15, created_at 2025-01-16 09:00

**When**:
- 10개 출고 요청

**Then**:
- Lot #2에서 할당 (생성일이 더 빠름)

---

### 시나리오 5: 재고 부족 에러

**Given**:
- Product A의 총 재고: 40개

**When**:
- 50개 출고 요청

**Then**:
- 에러 발생: "재고 부족: 요청 50, 가용 40"
- 어떤 재고도 차감되지 않음 (트랜잭션 롤백)

---

## 📂 구현 위치

### 1. 제조사 출고 (Phase 3.5)
**파일**: `src/pages/manufacturer/ShipmentPage.tsx`
- `allocateFIFO` 함수 구현
- 출고 전 FIFO 할당 로직 실행
- Virtual Code 생성 및 shipment_items 저장

### 2. 유통사 출고 (Phase 4.3)
**파일**: `src/pages/distributor/HospitalShipmentPage.tsx`
- 제조사와 동일한 FIFO 로직 재사용
- 유통사 재고에서 FIFO 할당

### 3. 공통 유틸리티 (권장)
**파일**: `src/utils/fifo.ts` (신규 생성)
```typescript
export function sortByFIFO<T extends { lot: Lot }>(inventory: T[]): T[] {
  return [...inventory].sort((a, b) => {
    const expiryCompare = new Date(a.lot.expiry_date).getTime() - new Date(b.lot.expiry_date).getTime()
    if (expiryCompare !== 0) return expiryCompare

    const mfgCompare = new Date(a.lot.manufacture_date).getTime() - new Date(b.lot.manufacture_date).getTime()
    if (mfgCompare !== 0) return mfgCompare

    return new Date(a.lot.created_at).getTime() - new Date(b.lot.created_at).getTime()
  })
}

export function allocateByFIFO(
  inventory: InventoryWithLot[],
  productId: string,
  requestedQuantity: number
): { lot: Lot; quantity: number }[] {
  // 구현 내용...
}
```

---

## ✅ Definition of Done

### 코드 구현
- [ ] `src/utils/fifo.ts` 파일 생성
- [ ] `sortByFIFO` 함수 구현 (제네릭 타입 지원)
- [ ] `allocateByFIFO` 함수 구현
- [ ] Phase 3.5 ShipmentPage에 FIFO 로직 적용
- [ ] Phase 4.3 HospitalShipmentPage에 FIFO 로직 적용

### 테스트 작성
- [ ] 5개 시나리오 모두 테스트 케이스 작성
- [ ] Jest 단위 테스트 (`src/utils/fifo.test.ts`)
- [ ] E2E 테스트 시나리오 준비 (Phase 7.5에서 실행)

### 검증
- [ ] 단일 Lot 할당 정상 동작
- [ ] 다중 Lot 할당 FIFO 순서 준수
- [ ] 사용기한 → 제조일 → 생성일 정렬 정확성
- [ ] 재고 부족 시 에러 발생 및 롤백
- [ ] 브라우저 콘솔에 FIFO 할당 로그 출력 (디버깅용)

### 문서화
- [ ] `src/utils/fifo.ts` JSDoc 주석 추가
- [ ] README에 FIFO 로직 사용법 추가
- [ ] PRD Section 15.1 요구사항 충족 확인

---

## 🔗 관련 문서

- [Phase 3.5: 제조사 출고](../phase-3/phase-3.5-shipment.md)
- [Phase 4.3: 병원 출고](../phase-4/phase-4.3-hospital-shipment.md)
- [Phase 7.3: FIFO 검증](phase-7.3-fifo-validation.md)
- [PRD Section 5.2: 재고 관리](../../neo-cert-prd-1.2.md#52-재고-관리)
- [PRD Section 15.1: FIFO 알고리즘](../../neo-cert-prd-1.2.md#151-fifo-알고리즘)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 7.2 - Virtual Code 생성 및 할당](phase-7.2-virtual-code.md)
