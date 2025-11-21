# Phase 7.4: 동시성 처리 (락 메커니즘)

## 📋 Overview

**목표**: 동시에 여러 사용자가 같은 제품을 출고할 때 발생하는 재고 부족 문제를 PostgreSQL Advisory Lock을 사용하여 해결합니다.

**PRD 참조**:
- Section 14: 동시성 제어
- Section 15.2: 트랜잭션 격리 수준

**예상 소요 시간**: 1-2일

---

## 🎯 문제 상황

### Race Condition 시나리오

**Given**:
- Product A의 재고: 10개

**When**:
- 사용자 1: 8개 출고 요청 (동시)
- 사용자 2: 8개 출고 요청 (동시)

**Expected**:
- 사용자 1: 성공 (재고 10 → 2)
- 사용자 2: 실패 (재고 부족 에러)

**Actual (락 없이)**:
- 사용자 1: 재고 확인 (10개) → 통과
- 사용자 2: 재고 확인 (10개) → 통과
- 사용자 1: 재고 차감 (10 → 2)
- 사용자 2: 재고 차감 (2 → -6) ⚠️ **음수 재고 발생!**

---

## 🔒 PostgreSQL Advisory Lock 솔루션

### 1. Advisory Lock 함수 생성

**파일**: Supabase SQL Editor

```sql
-- Advisory Lock 획득 함수
CREATE OR REPLACE FUNCTION acquire_product_lock(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  lock_id BIGINT;
BEGIN
  -- UUID를 BIGINT로 변환 (해시 사용)
  lock_id := ('x' || substring(p_product_id::text, 1, 16))::bit(64)::bigint;

  -- Advisory Lock 획득 (대기)
  PERFORM pg_advisory_lock(lock_id);

  RETURN TRUE;
END;
$$;

-- Advisory Lock 해제 함수
CREATE OR REPLACE FUNCTION release_product_lock(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  lock_id BIGINT;
BEGIN
  -- UUID를 BIGINT로 변환
  lock_id := ('x' || substring(p_product_id::text, 1, 16))::bit(64)::bigint;

  -- Advisory Lock 해제
  PERFORM pg_advisory_unlock(lock_id);

  RETURN TRUE;
END;
$$;
```

### 2. 출고 처리 함수 (락 포함)

```sql
CREATE OR REPLACE FUNCTION process_shipment_with_lock(
  p_product_id UUID,
  p_organization_id UUID,
  p_requested_quantity INTEGER,
  p_target_org_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_available INTEGER;
  v_shipment_id UUID;
  v_result JSON;
BEGIN
  -- 1. Product Lock 획득
  PERFORM acquire_product_lock(p_product_id);

  BEGIN
    -- 2. 재고 확인
    SELECT COALESCE(SUM(current_quantity), 0)
    INTO v_available
    FROM inventory
    WHERE organization_id = p_organization_id
      AND lot_id IN (
        SELECT id FROM lots WHERE product_id = p_product_id
      );

    -- 3. 재고 부족 체크
    IF v_available < p_requested_quantity THEN
      RAISE EXCEPTION '재고 부족: 요청 %, 가용 %', p_requested_quantity, v_available;
    END IF;

    -- 4. Shipment 생성
    INSERT INTO shipments (from_organization_id, to_organization_id, status)
    VALUES (p_organization_id, p_target_org_id, 'pending')
    RETURNING id INTO v_shipment_id;

    -- 5. 재고 차감 (FIFO 순서대로)
    -- (FIFO 로직 구현 - Phase 7.1 참조)

    -- 6. 성공 결과 반환
    v_result := json_build_object(
      'success', TRUE,
      'shipment_id', v_shipment_id,
      'allocated_quantity', p_requested_quantity
    );

    -- Lock 해제
    PERFORM release_product_lock(p_product_id);

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- 에러 발생 시 Lock 해제
      PERFORM release_product_lock(p_product_id);
      RAISE;
  END;
END;
$$;
```

---

## 🚀 프론트엔드 구현

### 1. 락을 사용한 출고 처리

**파일**: `src/pages/manufacturer/ShipmentPage.tsx`

```typescript
import { toast } from 'sonner'

const handleShipmentWithLock = async (
  productId: string,
  quantity: number,
  targetOrgId: string
) => {
  try {
    // RPC 호출 (내부적으로 락 사용)
    const { data, error } = await supabase.rpc('process_shipment_with_lock', {
      p_product_id: productId,
      p_organization_id: userData.organization_id,
      p_requested_quantity: quantity,
      p_target_org_id: targetOrgId,
    })

    if (error) throw error

    toast.success(`출고 완료: ${data.shipment_id}`)
    router.push('/manufacturer/shipments')
  } catch (error) {
    if (error.message.includes('재고 부족')) {
      toast.error(error.message)
    } else {
      toast.error('출고 처리 중 오류가 발생했습니다.')
    }
  }
}
```

### 2. 낙관적 락 (Optimistic Lock) - 대안

**장점**: 서버 부하 감소, UI 응답성 향상
**단점**: 충돌 시 재시도 필요

```typescript
const handleShipmentOptimistic = async (
  productId: string,
  quantity: number,
  maxRetries = 3
) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 1. 재고 확인
      const { data: inventory } = await supabase
        .from('inventory')
        .select('id, current_quantity, version')
        .eq('product_id', productId)

      const totalAvailable = inventory.reduce((sum, inv) => sum + inv.current_quantity, 0)

      if (totalAvailable < quantity) {
        throw new Error('재고 부족')
      }

      // 2. 버전 체크와 함께 재고 차감
      const { error } = await supabase
        .from('inventory')
        .update({
          current_quantity: inventory[0].current_quantity - quantity,
          version: inventory[0].version + 1, // 버전 증가
        })
        .eq('id', inventory[0].id)
        .eq('version', inventory[0].version) // 버전 일치 확인

      if (error && error.code === '23505') {
        // Version mismatch - 재시도
        console.log(`충돌 발생, 재시도 ${attempt + 1}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1))) // 백오프
        continue
      }

      if (error) throw error

      toast.success('출고 완료')
      return

    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error
      }
    }
  }
}
```

---

## 📊 성능 비교

### 1. Advisory Lock 방식

**장점**:
- 데이터 정합성 보장 100%
- 동시성 충돌 완전 방지
- 구현 간단

**단점**:
- Lock 대기 시간 발생 (병목 가능)
- 서버 부하 증가 (Lock 관리)

**적합한 상황**:
- 높은 동시성 환경
- 재고 정확성이 critical

---

### 2. Optimistic Lock 방식

**장점**:
- 빠른 응답 속도
- 서버 부하 낮음
- 충돌이 적은 환경에서 효율적

**단점**:
- 충돌 시 재시도 필요
- 재시도 실패 시 사용자 경험 저하

**적합한 상황**:
- 낮은 동시성 환경
- UI 응답성이 중요

---

## 🧪 동시성 테스트 시나리오

### 시나리오 1: 동시 출고 (Advisory Lock)

**Given**:
- Product A 재고: 10개

**When**:
- 사용자 1: 8개 출고 요청 (t=0ms)
- 사용자 2: 8개 출고 요청 (t=5ms)

**Then**:
- 사용자 1: Lock 획득 → 성공 (재고 10 → 2)
- 사용자 2: Lock 대기 → Lock 획득 → 실패 (재고 부족 에러)
- 최종 재고: 2개 (음수 없음)

---

### 시나리오 2: 3명 동시 출고

**Given**:
- Product A 재고: 20개

**When**:
- 사용자 1: 8개 출고 (t=0ms)
- 사용자 2: 8개 출고 (t=5ms)
- 사용자 3: 8개 출고 (t=10ms)

**Then**:
- 사용자 1: 성공 (재고 20 → 12)
- 사용자 2: 성공 (재고 12 → 4)
- 사용자 3: 실패 (재고 부족)
- 최종 재고: 4개

---

### 시나리오 3: Deadlock 방지

**Given**:
- 사용자 1: Product A → Product B 순서로 Lock 획득 시도
- 사용자 2: Product B → Product A 순서로 Lock 획득 시도

**Solution**:
- Product ID를 정렬하여 항상 동일한 순서로 Lock 획득
```typescript
const productIds = [productA, productB].sort()
for (const id of productIds) {
  await supabase.rpc('acquire_product_lock', { p_product_id: id })
}
```

---

## ✅ Definition of Done

### 데이터베이스 함수
- [ ] `acquire_product_lock` 함수 생성
- [ ] `release_product_lock` 함수 생성
- [ ] `process_shipment_with_lock` 함수 생성
- [ ] 에러 처리 및 자동 Lock 해제 보장

### 프론트엔드 구현
- [ ] Phase 3.5: 제조사 출고 시 락 사용
- [ ] Phase 4.3: 유통사 출고 시 락 사용
- [ ] 에러 메시지 사용자 친화적으로 표시
- [ ] Lock 대기 시 로딩 인디케이터 표시

### 테스트
- [ ] 시나리오 1: 동시 출고 테스트 (Jest + Supertest)
- [ ] 시나리오 2: 3명 동시 출고 테스트
- [ ] 시나리오 3: Deadlock 방지 테스트
- [ ] 성능 테스트 (100명 동시 접속)

### 모니터링
- [ ] Lock 대기 시간 측정 (Sentry)
- [ ] Lock 타임아웃 설정 (30초)
- [ ] Lock 충돌 빈도 로깅

### 문서화
- [ ] Advisory Lock vs Optimistic Lock 비교표
- [ ] Deadlock 방지 전략 문서화
- [ ] PRD Section 14, 15.2 요구사항 충족 확인

---

## 🔗 관련 문서

- [Phase 7.1: FIFO 알고리즘](phase-7.1-fifo-algorithm.md)
- [Phase 3.5: 제조사 출고](../phase-3/phase-3.5-shipment.md)
- [Phase 4.3: 병원 출고](../phase-4/phase-4.3-hospital-shipment.md)
- [PostgreSQL Advisory Locks 문서](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
- [PRD Section 14: 동시성 제어](../../neo-cert-prd-1.2.md#14-동시성-제어)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 7.5 - E2E 테스트 (Playwright)](phase-7.5-e2e-test.md)
