# Phase 5.6: 통합 테스트

## 📋 Overview

**Phase 5.6**은 Phase 5(병원 기능)의 통합 테스트를 정의합니다. 제조사→유통사→병원→환자 전체 공급망을 End-to-End로 테스트합니다.

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

## 📦 Integration Test Scenarios

### 1. 전체 공급망 플로우 (제조사→유통사→병원→환자)

**파일 경로**: `src/pages/hospital/__tests__/integration/end-to-end-workflow.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('End-to-End Supply Chain Workflow', () => {
  it('제조사→유통사→병원→환자 전체 플로우가 정상 동작해야 한다', async () => {
    // 1. 제조사: Lot 생산 (Phase 3.4)
    // - Create lot with quantity 100
    // - Verify manufacturer inventory: 100

    // 2. 제조사→유통사: 출고 (Phase 3.5)
    // - Ship 50 to distributor
    // - Verify manufacturer inventory: 50

    // 3. 유통사: 입고 (Phase 4.1)
    // - Receive with virtual code
    // - Verify distributor inventory: 50

    // 4. 유통사→병원: 출고 (Phase 4.3)
    // - Ship 30 to hospital
    // - Verify distributor inventory: 20

    // 5. 병원: 입고 (Phase 5.1)
    // - Receive with virtual code
    // - Verify hospital inventory: 30

    // 6. 병원: 사용 등록 (Phase 5.3)
    // - Use 10 for patient A
    // - Verify hospital inventory: 20
    // - Verify usage record created

    // 7. 병원: 폐기 처리 (Phase 5.4)
    // - Dispose 5 (expired)
    // - Verify hospital inventory: 15
    // - Verify disposal record created

    // 8. 병원: 이력 조회 (Phase 5.5)
    // - Verify receiving record
    // - Verify usage record (patient A)
    // - Verify disposal record

    // 9. 추적성 검증
    // - Query all transactions for specific lot
    // - Verify complete chain:
    //   - Production: 100
    //   - Ship to distributor: 50
    //   - Receive at distributor: 50
    //   - Ship to hospital: 30
    //   - Receive at hospital: 30
    //   - Usage: 10
    //   - Disposal: 5
    //   - Final hospital inventory: 15
  })

  it('환자 정보를 추적할 수 있어야 한다', async () => {
    // Use product for patient A
    // Use product for patient B
    // Query usages by patient_id
    // Verify lot information for each patient usage
  })

  it('사용기한 만료 제품은 사용할 수 없어야 한다', async () => {
    // Create lot with expiry_date in the past
    // Try to register usage
    // Verify warning or error
    // Recommend disposal instead
  })
})
```

---

### 2. 재고 무결성 테스트

**파일 경로**: `src/pages/hospital/__tests__/integration/inventory-integrity.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Inventory Integrity Test', () => {
  it('모든 거래의 재고 합계가 일치해야 한다', async () => {
    // Create lot: 100
    // Ship to distributor: 50
    // Ship to hospital: 30
    // Usage: 10
    // Disposal: 5

    // Calculate expected inventory:
    // Manufacturer: 100 - 50 = 50
    // Distributor: 50 - 30 = 20
    // Hospital: 30 - 10 - 5 = 15
    // Total: 50 + 20 + 15 = 85 (should equal 100 - 10 - 5)

    // Verify all inventory records
    // Verify no negative quantities
  })

  it('재고를 초과하는 사용은 불가능해야 한다', async () => {
    // Hospital has 10 quantity
    // Try to use 15 quantity
    // Verify error
    // Verify inventory unchanged
  })

  it('동일 Lot에 대한 병렬 사용 처리가 안전해야 한다', async () => {
    // Hospital has 10 quantity
    // Simultaneously register 2 usages of 6 each
    // Verify one succeeds, one fails (or both fail)
    // Verify final inventory is correct
  })
})
```

---

### 3. 추적성 테스트

**파일 경로**: `src/pages/hospital/__tests__/integration/traceability.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Traceability Test', () => {
  it('Virtual Code로 전체 이력을 추적할 수 있어야 한다', async () => {
    // Given: Virtual Code "ABC123456789"

    // Find lot by virtual code
    // Query all related records:
    // - Production (lots table)
    // - Shipments (from manufacturer)
    // - Receiving (at distributor)
    // - Shipments (from distributor)
    // - Receiving (at hospital)
    // - Usages (patient records)
    // - Disposals

    // Verify complete chain exists
    // Verify all timestamps are logical (chronological order)
  })

  it('환자 정보로 역추적이 가능해야 한다', async () => {
    // Given: Patient ID "P12345"

    // Query usages by patient_id
    // For each usage, trace back:
    // - Lot information
    // - Product information
    // - Production date
    // - Expiry date
    // - Manufacturing organization

    // Verify complete traceability from patient to manufacturer
  })

  it('리콜 시나리오를 시뮬레이션할 수 있어야 한다', async () => {
    // Scenario: Product X Lot Y needs to be recalled

    // Find all organizations that received this lot
    // Find all patients who used this lot
    // Generate recall report:
    // - Organizations to notify
    // - Patients to contact
    // - Remaining inventory to quarantine
  })
})
```

---

### 4. Performance 테스트

**파일 경로**: `src/pages/hospital/__tests__/integration/performance.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Performance Test', () => {
  it('대량 사용 등록이 30초 이내에 완료되어야 한다', async () => {
    // Create 200 usage records
    const startTime = Date.now()

    for (let i = 0; i < 200; i++) {
      await registerUsage({
        virtualCode: 'ABC123456789',
        patientId: `P${i}`,
        quantity: 1,
      })
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(30000) // 30 seconds
  })

  it('복잡한 이력 조회가 5초 이내에 완료되어야 한다', async () => {
    // Create 1000 transaction records (receiving, usage, disposal)
    const startTime = Date.now()

    // Query all transactions across all types
    const transactions = await fetchAllHospitalTransactions()

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(5000) // 5 seconds
  })
})
```

---

## ✅ Test Coverage Requirements

### Phase 5 전체 테스트 커버리지 목표

- **Unit Tests**: 80% 이상
- **Integration Tests**: 주요 워크플로우 100% 커버
- **E2E Tests**: Critical path 100% 커버

### 테스트해야 할 주요 영역

1. **입고 관리** (Phase 5.1)
   - ✅ Virtual Code 검증
   - ✅ 재고 생성/업데이트

2. **재고 조회** (Phase 5.2)
   - ✅ FEFO 정렬
   - ✅ 사용기한 경고

3. **사용 등록** (Phase 5.3)
   - ✅ 환자 ID 기록
   - ✅ 재고 차감
   - ✅ Usage 레코드 생성

4. **폐기 처리** (Phase 5.4)
   - ✅ 폐기 사유 기록
   - ✅ 재고 차감
   - ✅ Disposal 레코드 생성

5. **거래 이력** (Phase 5.5)
   - ✅ 입고/사용/폐기 통합 조회
   - ✅ 환자 정보 추적

---

## 🔍 Manual Test Checklist

### 병원 기능 전체 시나리오

- [ ] **1. 입고 처리**
  - [ ] 유통사 출고 내역 확인
  - [ ] Virtual Code 입력하여 입고
  - [ ] 재고 증가 확인

- [ ] **2. 재고 확인**
  - [ ] 재고 목록 표시
  - [ ] 사용기한 임박 경고
  - [ ] FEFO 정렬 확인

- [ ] **3. 사용 등록**
  - [ ] Virtual Code 스캔
  - [ ] 환자 ID 입력
  - [ ] 사용 수량 입력
  - [ ] 재고 차감 확인
  - [ ] 사용 이력 기록 확인

- [ ] **4. 폐기 처리**
  - [ ] Virtual Code로 제품 확인
  - [ ] 폐기 사유 선택
  - [ ] 재고 차감 확인
  - [ ] 폐기 이력 기록 확인

- [ ] **5. 이력 조회**
  - [ ] 입고 이력 표시
  - [ ] 사용 이력 (환자 정보 포함)
  - [ ] 폐기 이력 (사유 포함)

- [ ] **6. 추적성 검증**
  - [ ] Virtual Code로 전체 이력 추적
  - [ ] 환자 ID로 사용 이력 조회

---

## 🔄 Git Commit Message

```bash
test(hospital): add Phase 5 integration tests

- Add end-to-end supply chain workflow test (manufacturer→distributor→hospital→patient)
- Add inventory integrity validation test
- Add traceability test (virtual code → patient → manufacturer)
- Add performance benchmark test
- Define test coverage requirements
- Create manual test checklist

Test scenarios:
- Full supply chain with patient usage tracking
- Inventory integrity across all transactions
- Virtual code and patient ID traceability
- Recall simulation scenario
- Performance benchmarks

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] 전체 공급망 E2E 테스트 작성 완료
- [ ] 재고 무결성 테스트 작성 완료
- [ ] 추적성 테스트 작성 완료
- [ ] Performance 테스트 작성 완료
- [ ] 모든 통합 테스트 통과
- [ ] Unit 테스트 커버리지 80% 이상 달성
- [ ] Manual test checklist 100% 완료
- [ ] Phase 5 전체 기능 검증 완료
- [ ] Git commit (Conventional Commits) 완료

---

## 🔗 References

- [Vitest Integration Testing](https://vitest.dev/guide/features.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [의료기기 추적성 요구사항](https://www.mfds.go.kr/)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 6 - 관리자 기능](../phase-6/README.md)

**Phase 6 개요**:
- 조직 승인 관리
- 사용자 관리
- 제품 마스터 관리
- 시스템 모니터링
- 통합 테스트

**Phase 5 완료!** 🎉

모든 병원 핵심 기능이 구현되었습니다:
- ✅ 입고 관리
- ✅ 재고 조회
- ✅ 사용 등록 (환자 투여)
- ✅ 폐기 처리
- ✅ 거래 이력
- ✅ 통합 테스트 (E2E 추적성)
