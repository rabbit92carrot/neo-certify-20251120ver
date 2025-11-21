# SSOT 상수: locks.ts

## 📋 개요

**목적**: Concurrency 제어 관련 모든 상수 중앙화 (Lock 설정, 타임아웃, 재시도)
**SSOT 원칙**: 동시성 제어 규칙에 대한 단일 진실 공급원
**파일 위치**: `src/constants/locks.ts`

---

## 🎯 포함 내용

1. **Lock 타입**: Advisory Lock 유형 정의
2. **Lock 범위**: organization_id + product_id 조합
3. **타임아웃 설정**: Lock 대기 시간, 재시도 설정
4. **Lock 키 생성**: 일관된 Lock 키 생성 함수

---

## 📝 파일 내용

**src/constants/locks.ts**:
```typescript
/**
 * Concurrency 제어 (Lock) 상수
 * SSOT: 동시성 제어 규칙에 대한 단일 진실 공급원
 *
 * PostgreSQL Advisory Lock 기반:
 * - Lock 범위: organization_id + product_id
 * - 영향: 동일 조직의 동일 제품 Lot 생성 시에만 대기
 * - 다른 조직, 다른 제품: 영향 없음
 */

/**
 * Lock 타입 정의
 */
export const LOCK_TYPES = {
  /**
   * Lot 생성 시 Lock
   * - 동일 조직 + 동일 제품 조합에 대한 Lot 번호 중복 방지
   */
  LOT_CREATION: 'lot_creation',

  /**
   * 출고 처리 시 Lock (Optional, MVP 미사용)
   * - 동일 재고에 대한 동시 출고 방지
   */
  SHIPMENT: 'shipment',
} as const;

export type LockType = typeof LOCK_TYPES[keyof typeof LOCK_TYPES];

/**
 * Lock 설정
 */
export const LOCK_CONFIG = {
  /**
   * Lock 키 구분자
   * - organization_id와 product_id를 연결하는 문자
   */
  SCOPE_SEPARATOR: ':',

  /**
   * Lock 대기 최대 시간 (밀리초)
   * - 이 시간 내에 Lock을 획득하지 못하면 에러
   */
  TIMEOUT_MS: 5000,

  /**
   * Lock 재시도 간격 (밀리초)
   * - Lock 획득 실패 시 다음 시도까지 대기 시간
   */
  RETRY_DELAY_MS: 100,

  /**
   * 최대 재시도 횟수
   * - TIMEOUT_MS / RETRY_DELAY_MS로 계산됨
   */
  MAX_RETRIES: 50,

  /**
   * Hash 함수 (Lock ID 생성용)
   * - PostgreSQL의 hashtext() 함수 사용
   */
  HASH_FUNCTION: 'hashtext',
} as const;

/**
 * Lock 키 생성 함수
 *
 * @param organizationId 조직 ID
 * @param productId 제품 ID
 * @returns Lock 키 (organization_id:product_id)
 *
 * @example
 * generateLockKey('org-123', 'prod-456')
 * // Returns: "org-123:prod-456"
 */
export function generateLockKey(organizationId: string, productId: string): string {
  return `${organizationId}${LOCK_CONFIG.SCOPE_SEPARATOR}${productId}`;
}

/**
 * Lock ID 해시 함수 (클라이언트 측)
 *
 * PostgreSQL의 hashtext() 함수와 동일한 결과를 얻기 위한 간단한 해시
 * 실제로는 서버(PostgreSQL)에서 hashtext()를 사용하므로 참고용
 *
 * @param lockKey Lock 키
 * @returns 정수 해시값
 */
export function hashLockKey(lockKey: string): number {
  let hash = 0;
  for (let i = 0; i < lockKey.length; i++) {
    const char = lockKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Lock 범위 설명 (문서화용)
 */
export const LOCK_SCOPE_INFO = {
  /**
   * Lock이 영향을 미치는 범위
   */
  AFFECTED: [
    '동일 organization_id + 동일 product_id 조합의 Lot 생성',
  ],

  /**
   * Lock이 영향을 미치지 않는 범위
   */
  NOT_AFFECTED: [
    '동일 조직의 다른 제품 Lot 생성',
    '다른 조직의 동일 제품 Lot 생성',
    '다른 조직의 서비스 이용 (출고, 입고, 시술 등)',
    '동일 조직의 다른 작업 (출고, 재고 조회 등)',
  ],

  /**
   * 예상 대기 시간
   */
  TYPICAL_WAIT_TIME: {
    BEST_CASE_MS: 0,      // 경합 없을 때
    AVERAGE_MS: 100,      // 일반적인 경우
    WORST_CASE_MS: 2000,  // 대량 생산 시 (1000개 이상)
  },
} as const;

/**
 * Lock 에러 메시지
 */
export const LOCK_ERROR_MESSAGES = {
  /**
   * Lock 획득 타임아웃
   */
  TIMEOUT: `Lock 획득 시간 초과 (${LOCK_CONFIG.TIMEOUT_MS}ms). 잠시 후 다시 시도해주세요.`,

  /**
   * Lock 해제 실패
   */
  RELEASE_FAILED: 'Lock 해제에 실패했습니다.',

  /**
   * 동시 생산 경고 (사용자 안내용)
   */
  CONCURRENT_PRODUCTION: '다른 사용자가 동일 제품의 Lot를 생성 중입니다. 잠시만 기다려주세요...',
} as const;

/**
 * Lock 사용 예시 (코드 스니펫)
 */
export const LOCK_USAGE_EXAMPLE = `
// PostgreSQL 함수 호출 예시
const lockKey = generateLockKey(organizationId, productId);

// Lock 획득
await supabase.rpc('acquire_org_product_lock', {
  p_organization_id: organizationId,
  p_product_id: productId,
});

try {
  // Lot 생성 작업
  const lot = await createLot(...);
} finally {
  // Lock 해제
  await supabase.rpc('release_org_product_lock', {
    p_organization_id: organizationId,
    p_product_id: productId,
  });
}
`;

/**
 * TypeScript 타입 추론
 */
export type LockConfig = typeof LOCK_CONFIG;
```

---

## 🔧 사용 예시

### 1. Lock 키 생성
```typescript
import { generateLockKey } from '@/constants/locks';

const lockKey = generateLockKey(
  'org-uuid-123',
  'product-uuid-456'
);
// Returns: "org-uuid-123:product-uuid-456"
```

### 2. Lot 생성 시 Lock 사용
```typescript
import { generateLockKey, LOCK_CONFIG, LOCK_ERROR_MESSAGES } from '@/constants/locks';
import { DATABASE_FUNCTIONS } from '@/constants/database';

async function createLotWithLock(
  organizationId: string,
  productId: string,
  lotData: LotData
) {
  // Lock 획득
  const { error: lockError } = await supabase.rpc(
    DATABASE_FUNCTIONS.ACQUIRE_ORG_PRODUCT_LOCK,
    {
      p_organization_id: organizationId,
      p_product_id: productId,
    }
  );

  if (lockError) {
    throw new Error(LOCK_ERROR_MESSAGES.TIMEOUT);
  }

  try {
    // Lot 생성 (트랜잭션)
    const { data: lotId, error } = await supabase.rpc(
      DATABASE_FUNCTIONS.CREATE_LOT_WITH_CODES,
      {
        p_product_id: productId,
        p_lot_number: lotData.lotNumber,
        p_manufacture_date: lotData.manufactureDate,
        p_expiry_date: lotData.expiryDate,
        p_quantity: lotData.quantity,
        p_organization_id: organizationId,
      }
    );

    if (error) throw error;

    return lotId;
  } finally {
    // Lock 해제 (반드시 실행)
    await supabase.rpc(
      DATABASE_FUNCTIONS.RELEASE_ORG_PRODUCT_LOCK,
      {
        p_organization_id: organizationId,
        p_product_id: productId,
      }
    );
  }
}
```

### 3. Lock 대기 시 사용자 피드백
```typescript
import { LOCK_CONFIG, LOCK_ERROR_MESSAGES } from '@/constants/locks';

// UI에서 로딩 표시
toast.info(LOCK_ERROR_MESSAGES.CONCURRENT_PRODUCTION);

// 타임아웃 설정
const timeoutId = setTimeout(() => {
  toast.error(LOCK_ERROR_MESSAGES.TIMEOUT);
}, LOCK_CONFIG.TIMEOUT_MS);

try {
  await createLotWithLock(...);
  clearTimeout(timeoutId);
  toast.success('Lot 생성 완료');
} catch (error) {
  clearTimeout(timeoutId);
  // 에러 처리
}
```

---

## 🔍 Lock 범위 이해

### 영향을 받는 경우 (대기 발생)
```
조직 A, 제품 X → Lot 생성 (사용자 1) ✅ 진행 중
조직 A, 제품 X → Lot 생성 (사용자 2) ⏳ 대기 (약 100~2000ms)
```

### 영향을 받지 않는 경우 (병렬 실행)
```
조직 A, 제품 X → Lot 생성 (사용자 1) ✅ 진행 중
조직 A, 제품 Y → Lot 생성 (사용자 2) ✅ 동시 진행
조직 B, 제품 X → Lot 생성 (사용자 3) ✅ 동시 진행
조직 A, 출고 처리 (사용자 4) ✅ 동시 진행
```

---

## ✅ 완료 기준

- [x] Lock 타입 정의
- [x] Lock 설정 상수 정의
- [x] Lock 키 생성 함수
- [x] Lock 범위 문서화
- [x] Lock 에러 메시지 정의
- [x] 사용 예시 코드 포함
- [x] JSDoc 주석으로 각 함수 설명

---

## 🔗 관련 문서

- [Phase 7.4 - Concurrency Control](../phase-7/phase-7.4-concurrency.md)
- [Phase 3.4 - Lot Production](../phase-3/phase-3.4-lot-production.md)
- [Phase 1.2 - Core Tables](../phase-1/phase-1.2-core-tables.md) (Advisory Lock 함수 정의)
