# Phase 4.6: 통합 테스트

## 📋 Overview

**Phase 4.6**은 Phase 4(유통사 기능)의 통합 테스트를 정의합니다. 제조사→유통사→병원 전체 공급망을 End-to-End로 테스트합니다.

---

## 📦 Integration Test Scenarios

### 1. 제조사→유통사→병원 전체 플로우

**파일 경로**: `src/pages/distributor/__tests__/integration/supply-chain-workflow.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Supply Chain Workflow Integration Test', () => {
  it('제조사→유통사→병원 전체 공급망이 정상 동작해야 한다', async () => {
    // 1. 제조사: Lot 생산 (Phase 3.4)
    // - Create lot with quantity 100
    // - Verify manufacturer inventory: 100

    // 2. 제조사: 유통사로 출고 (Phase 3.5)
    // - Ship 50 to distributor
    // - Verify manufacturer inventory: 50
    // - Verify shipment created (status: pending)

    // 3. 유통사: 입고 처리 (Phase 4.1)
    // - Receive shipment with virtual code verification
    // - Verify distributor inventory: 50
    // - Verify shipment status: completed

    // 4. 유통사: 병원으로 출고 (Phase 4.3)
    // - Ship 30 to hospital
    // - Verify distributor inventory: 20
    // - Verify shipment created (status: pending)

    // 5. 병원: 입고 처리 (Phase 5.1)
    // - Receive shipment
    // - Verify hospital inventory: 30

    // 6. 유통사: 재고 조회 (Phase 4.2)
    // - Verify current inventory: 20

    // 7. 유통사: 거래 이력 조회 (Phase 4.5)
    // - Verify receiving record exists
    // - Verify shipment record exists
  })

  it('Virtual Code 불일치 시 입고가 실패해야 한다', async () => {
    // Create shipment from manufacturer
    // Try to receive with wrong virtual code
    // Verify error message
    // Verify inventory unchanged
  })

  it('재고 없이 출고 시 실패해야 한다', async () => {
    // Distributor has 10 quantity
    // Try to ship 20 quantity to hospital
    // Verify error message
    // Verify inventory unchanged
  })

  it('반품 처리가 정상 동작해야 한다', async () => {
    // Hospital returns 5 quantity
    // Distributor processes return (restore action)
    // Verify distributor inventory increased by 5
  })
})
```

---

### 2. FIFO vs FEFO 테스트

**파일 경로**: `src/pages/distributor/__tests__/integration/fifo-fefo.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('FIFO vs FEFO Integration Test', () => {
  it('유통사 재고는 FEFO로 정렬되어야 한다', async () => {
    // Create 3 lots with different expiry dates:
    // Lot A: expires 2025-06-01
    // Lot B: expires 2025-03-01 (earliest)
    // Lot C: expires 2025-09-01

    // Fetch distributor inventory
    // Verify order: Lot B, Lot A, Lot C (FEFO)
  })

  it('출고는 FIFO로 할당되어야 한다', async () => {
    // Create 3 lots with different production dates:
    // Lot A: produced 2025-01-01 (oldest)
    // Lot B: produced 2025-01-10
    // Lot C: produced 2025-01-20

    // Request shipment of 50 quantity
    // Verify allocation starts from Lot A (FIFO)
  })
})
```

---

### 3. Database Constraint 테스트

**파일 경로**: `src/pages/distributor/__tests__/integration/database-constraints.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Database Constraint Integration Test', () => {
  it('입고 처리 시 shipment status가 업데이트되어야 한다', async () => {
    // Create shipment (status: pending)
    // Process receiving
    // Verify shipment status: completed
    // Verify received_date is set
  })

  it('반품 수량이 재고를 초과할 수 없어야 한다', async () => {
    // Distributor has 10 quantity
    // Try to return 15 quantity (restore action)
    // Verify appropriate handling
  })

  it('삭제된 조직으로는 출고할 수 없어야 한다', async () => {
    // Delete hospital organization
    // Try to create shipment to deleted hospital
    // Verify error or constraint violation
  })
})
```

---

### 4. Performance 테스트

**파일 경로**: `src/pages/distributor/__tests__/integration/performance.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Performance Integration Test', () => {
  it('대량 입고 처리가 10초 이내에 완료되어야 한다', async () => {
    // Create 100 pending shipments
    const startTime = Date.now()

    // Process all receivings
    for (const shipment of shipments) {
      await processReceiving(shipment)
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(10000) // 10 seconds
  })

  it('거래 이력 조회가 5초 이내에 완료되어야 한다', async () => {
    // Create 500 transaction records
    const startTime = Date.now()

    // Query all transactions
    const transactions = await fetchAllTransactions()

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(5000) // 5 seconds
  })
})
```

---

## ✅ Test Coverage Requirements

### Phase 4 전체 테스트 커버리지 목표

- **Unit Tests**: 80% 이상
- **Integration Tests**: 주요 워크플로우 100% 커버
- **E2E Tests**: Critical path 100% 커버

### 테스트해야 할 주요 영역

1. **입고 관리** (Phase 4.1)
   - ✅ 입고 대기 목록 조회
   - ✅ Virtual Code 검증
   - ✅ 재고 생성/업데이트
   - ✅ Shipment 상태 업데이트

2. **재고 조회** (Phase 4.2)
   - ✅ 재고 목록 표시 (FEFO 정렬)
   - ✅ 사용기한 경고

3. **병원 출고** (Phase 4.3)
   - ✅ FIFO 할당
   - ✅ 병원 선택
   - ✅ 재고 차감

4. **반품 처리** (Phase 4.4)
   - ✅ Virtual Code 검증
   - ✅ 재고 복구/폐기 선택
   - ✅ 반품 레코드 생성

5. **거래 이력** (Phase 4.5)
   - ✅ 입고/출고/반품 통합 조회
   - ✅ 유형별 필터

---

## 🔍 Manual Test Checklist

### 유통사 기능 전체 시나리오

- [ ] **1. 입고 처리**
  - [ ] 제조사 출고 내역 확인
  - [ ] Virtual Code 입력하여 입고 확인
  - [ ] 재고 증가 확인

- [ ] **2. 재고 확인**
  - [ ] 재고 목록 표시 확인
  - [ ] FEFO 정렬 확인
  - [ ] 사용기한 경고 표시 확인

- [ ] **3. 병원 출고**
  - [ ] 병원 선택 확인
  - [ ] 제품 선택 및 FIFO 할당 확인
  - [ ] 출고 완료 및 재고 차감 확인

- [ ] **4. 반품 처리**
  - [ ] Virtual Code로 Lot 확인
  - [ ] 반품 사유 및 처리 방법 선택
  - [ ] 재고 복구 또는 폐기 처리 확인

- [ ] **5. 이력 조회**
  - [ ] 입고 이력 표시 확인
  - [ ] 출고 이력 표시 확인
  - [ ] 반품 이력 표시 확인

---

## 🔄 Git Commit Message

```bash
test(distributor): add Phase 4 integration tests

- Add supply chain workflow test (manufacturer→distributor→hospital)
- Add FIFO vs FEFO allocation test
- Add database constraint validation test
- Add performance benchmark test
- Define test coverage requirements
- Create manual test checklist

Test scenarios:
- Full supply chain flow with virtual code verification
- FIFO/FEFO allocation algorithms
- Return processing (restore/dispose)
- Shipment status transitions
- Performance benchmarks

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] 전체 공급망 통합 테스트 작성 완료
- [ ] FIFO/FEFO 테스트 작성 완료
- [ ] Database constraint 테스트 작성 완료
- [ ] Performance 테스트 작성 완료
- [ ] 모든 통합 테스트 통과
- [ ] Unit 테스트 커버리지 80% 이상 달성
- [ ] Manual test checklist 100% 완료
- [ ] Phase 4 전체 기능 검증 완료
- [ ] Git commit (Conventional Commits) 완료

---

## 🔗 References

- [Vitest Integration Testing](https://vitest.dev/guide/features.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 5 - 병원 기능](../phase-5/README.md)

**Phase 5 개요**:
- 입고 관리
- 재고 조회
- 사용 등록 (환자 투여)
- 폐기 처리
- 이력 조회
- 통합 테스트

**Phase 4 완료!** 🎉

모든 유통사 핵심 기능이 구현되었습니다:
- ✅ 입고 관리 (Virtual Code 검증)
- ✅ 재고 조회 (FEFO 정렬)
- ✅ 병원 출고 (FIFO 할당)
- ✅ 반품 처리
- ✅ 거래 이력
- ✅ 통합 테스트
