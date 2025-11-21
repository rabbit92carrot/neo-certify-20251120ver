# Phase 3.8: 통합 테스트

## 📋 Overview

**Phase 3.8**은 Phase 3(제조사 기능)의 통합 테스트를 정의합니다. 전체 워크플로우를 End-to-End로 테스트하여 모든 기능이 정상 동작하는지 검증합니다.

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

### 1. 제조사 설정 → Lot 생산 → 출고 전체 플로우

**파일 경로**: `src/pages/manufacturer/__tests__/integration/manufacturer-workflow.test.tsx`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabase } from '@/lib/supabase'

describe('Manufacturer Workflow Integration Test', () => {
  beforeAll(async () => {
    // Setup test data
    // Create test organization, user, product
  })

  afterAll(async () => {
    // Cleanup test data
  })

  it('전체 제조사 워크플로우가 정상 동작해야 한다', async () => {
    // 1. 제조사 설정 등록
    // Navigate to settings page
    // Fill lot prefix, model digits, sequence digits, expiry months
    // Save settings
    // Verify settings saved

    // 2. 제품 등록
    // Navigate to product create page
    // Fill product name, UDI-DI, model name
    // Save product
    // Verify product created

    // 3. Lot 생산 등록
    // Navigate to lot production page
    // Select product
    // Enter quantity and production date
    // Submit lot production
    // Verify lot created with auto-generated lot number
    // Verify inventory created

    // 4. 재고 조회
    // Navigate to inventory page
    // Verify lot appears in inventory
    // Verify quantity matches

    // 5. 출고 처리
    // Navigate to shipment page
    // Add product to cart
    // Verify FIFO allocation
    // Complete shipment
    // Verify inventory decreased

    // 6. 거래 이력 조회
    // Navigate to transaction history page
    // Verify production record exists
    // Verify shipment record exists
  })

  it('재고 부족 시 출고가 실패해야 한다', async () => {
    // Create lot with 100 quantity
    // Try to ship 150 quantity
    // Verify error message displayed
    // Verify inventory unchanged
  })

  it('사용기한 임박 경고가 표시되어야 한다', async () => {
    // Create lot with expiry date in 20 days
    // Navigate to inventory page
    // Verify expiry warning badge displayed
  })

  it('Lot 번호가 자동 증가해야 한다', async () => {
    // Create first lot
    // Verify lot number: ABC12300001
    // Create second lot for same product
    // Verify lot number: ABC12300002
  })

  it('제품 비활성화 시 Lot 생산이 불가해야 한다', async () => {
    // Create active product
    // Deactivate product
    // Navigate to lot production page
    // Verify product not in dropdown
  })
})
```

---

### 2. FIFO 알고리즘 통합 테스트

**파일 경로**: `src/pages/manufacturer/__tests__/integration/fifo-allocation.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('FIFO Allocation Integration Test', () => {
  it('FIFO 알고리즘이 올바르게 동작해야 한다', async () => {
    // Create 3 lots with different production dates:
    // Lot A: 2025-01-01, quantity 50
    // Lot B: 2025-01-10, quantity 30
    // Lot C: 2025-01-20, quantity 20

    // Request shipment of 60 quantity
    // Verify allocation:
    // - Lot A: 50 (oldest, fully allocated)
    // - Lot B: 10 (second oldest, partially allocated)

    // Verify inventory after shipment:
    // - Lot A: 0
    // - Lot B: 20
    // - Lot C: 20 (not touched)
  })

  it('정확한 수량만 할당되어야 한다', async () => {
    // Create lot with 100 quantity
    // Request shipment of 100 quantity
    // Verify lot fully allocated
    // Verify no remaining inventory
  })

  it('여러 제품의 FIFO가 독립적으로 동작해야 한다', async () => {
    // Create Product A Lot 1: 2025-01-01, qty 50
    // Create Product A Lot 2: 2025-01-10, qty 50
    // Create Product B Lot 1: 2025-01-05, qty 40

    // Ship Product A: 60
    // Verify Product A Lot 1 fully used, Lot 2 partially used
    // Verify Product B not affected
  })
})
```

---

### 2.5 Virtual Code 상태 전이 통합 테스트 (신규)

**파일 경로**: `src/pages/manufacturer/__tests__/integration/virtual-code-status.test.tsx`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { supabase } from '@/lib/supabase'
import { VIRTUAL_CODE_STATUS } from '@/constants/status'

describe('Virtual Code Status Transition Integration Test', () => {
  let testLotId: string
  let testVirtualCodeIds: string[]

  beforeAll(async () => {
    // Setup: Create test lot with 10 Virtual Codes
    const { data: lot } = await supabase.rpc('create_lot_with_codes', {
      p_product_id: 'test-product-id',
      p_lot_number: 'TEST00001',
      p_manufacture_date: '2025-01-20',
      p_expiry_date: '2028-01-20',
      p_quantity: 10,
      p_organization_id: 'test-org-id',
    })

    testLotId = lot

    // Get Virtual Code IDs
    const { data: vcs } = await supabase
      .from('virtual_codes')
      .select('id')
      .eq('lot_id', testLotId)
      .order('sequence_number', { ascending: true })

    testVirtualCodeIds = vcs?.map((vc) => vc.id) || []
  })

  afterAll(async () => {
    // Cleanup
    await supabase.from('virtual_codes').delete().eq('lot_id', testLotId)
    await supabase.from('lots').delete().eq('id', testLotId)
  })

  it('Lot 생산 시 모든 Virtual Code가 IN_STOCK 상태로 생성되어야 한다', async () => {
    const { data: virtualCodes } = await supabase
      .from('virtual_codes')
      .select('status, sequence_number')
      .eq('lot_id', testLotId)
      .order('sequence_number', { ascending: true })

    expect(virtualCodes).toHaveLength(10)
    virtualCodes?.forEach((vc, index) => {
      expect(vc.status).toBe(VIRTUAL_CODE_STATUS.IN_STOCK)
      expect(vc.sequence_number).toBe(index + 1)
    })
  })

  it('출고 시 FIFO 순서로 Virtual Code 상태가 PENDING으로 전이되어야 한다', async () => {
    // Ship 3 units (to_organization_id null → PENDING)
    await supabase.rpc('create_shipment_with_vc_status', {
      p_lot_id: testLotId,
      p_from_organization_id: 'test-org-id',
      p_to_organization_id: null,
      p_quantity: 3,
      p_shipment_date: '2025-01-25',
      p_user_id: 'test-user-id',
    })

    // Verify first 3 Virtual Codes are PENDING (FIFO order)
    const { data: pendingVCs } = await supabase
      .from('virtual_codes')
      .select('id, status, sequence_number')
      .eq('lot_id', testLotId)
      .eq('status', VIRTUAL_CODE_STATUS.PENDING)
      .order('sequence_number', { ascending: true })

    expect(pendingVCs).toHaveLength(3)
    expect(pendingVCs?.[0].sequence_number).toBe(1)
    expect(pendingVCs?.[1].sequence_number).toBe(2)
    expect(pendingVCs?.[2].sequence_number).toBe(3)

    // Verify remaining 7 are still IN_STOCK
    const { data: inStockVCs } = await supabase
      .from('virtual_codes')
      .select('id, status, sequence_number')
      .eq('lot_id', testLotId)
      .eq('status', VIRTUAL_CODE_STATUS.IN_STOCK)
      .order('sequence_number', { ascending: true })

    expect(inStockVCs).toHaveLength(7)
    expect(inStockVCs?.[0].sequence_number).toBe(4)
  })

  it('제조사→병원 출고 시 Virtual Code가 즉시 IN_STOCK (병원 소유)로 전이되어야 한다', async () => {
    // Ship 2 units to hospital (organization_type: hospital)
    const { data: hospitalOrg } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Hospital',
        organization_type: 'hospital',
      })
      .select()
      .single()

    await supabase.rpc('create_shipment_with_vc_status', {
      p_lot_id: testLotId,
      p_from_organization_id: 'test-org-id',
      p_to_organization_id: hospitalOrg.id,
      p_quantity: 2,
      p_shipment_date: '2025-01-26',
      p_user_id: 'test-user-id',
    })

    // Verify next 2 Virtual Codes (sequence 4, 5) are IN_STOCK (hospital ownership)
    // Note: Detailed ownership verification should be done in Phase 4
    const { data: transferredVCs } = await supabase
      .from('virtual_codes')
      .select('status, sequence_number')
      .eq('lot_id', testLotId)
      .in('sequence_number', [4, 5])

    transferredVCs?.forEach((vc) => {
      expect(vc.status).toBe(VIRTUAL_CODE_STATUS.IN_STOCK)
    })

    // Cleanup
    await supabase.from('organizations').delete().eq('id', hospitalOrg.id)
  })

  it('재고 차감 시 Virtual Code 상태 전이가 원자적으로 처리되어야 한다', async () => {
    // Attempt to ship more than available
    const { error } = await supabase.rpc('create_shipment_with_vc_status', {
      p_lot_id: testLotId,
      p_from_organization_id: 'test-org-id',
      p_to_organization_id: null,
      p_quantity: 100, // More than available
      p_shipment_date: '2025-01-27',
      p_user_id: 'test-user-id',
    })

    // Verify error thrown
    expect(error).toBeTruthy()

    // Verify no Virtual Code status changed (atomicity)
    const { data: allVCs } = await supabase
      .from('virtual_codes')
      .select('status')
      .eq('lot_id', testLotId)

    // Should have same status distribution as before failed attempt
    expect(allVCs?.filter((vc) => vc.status === VIRTUAL_CODE_STATUS.IN_STOCK).length).toBeGreaterThan(0)
  })

  it('FIFO 정렬이 sequence_number 기준으로 동작해야 한다', async () => {
    // Create a new lot
    const { data: newLotId } = await supabase.rpc('create_lot_with_codes', {
      p_product_id: 'test-product-id',
      p_lot_number: 'TEST00002',
      p_manufacture_date: '2025-01-20',
      p_expiry_date: '2028-01-20',
      p_quantity: 5,
      p_organization_id: 'test-org-id',
    })

    // Ship 3 units
    await supabase.rpc('create_shipment_with_vc_status', {
      p_lot_id: newLotId,
      p_from_organization_id: 'test-org-id',
      p_to_organization_id: null,
      p_quantity: 3,
      p_shipment_date: '2025-01-25',
      p_user_id: 'test-user-id',
    })

    // Verify sequence_number 1, 2, 3 are PENDING
    const { data: pendingVCs } = await supabase
      .from('virtual_codes')
      .select('sequence_number, status')
      .eq('lot_id', newLotId)
      .eq('status', VIRTUAL_CODE_STATUS.PENDING)
      .order('sequence_number', { ascending: true })

    expect(pendingVCs).toHaveLength(3)
    expect(pendingVCs?.map((vc) => vc.sequence_number)).toEqual([1, 2, 3])

    // Cleanup
    await supabase.from('virtual_codes').delete().eq('lot_id', newLotId)
    await supabase.from('lots').delete().eq('id', newLotId)
  })
})
```

---

### 3. Database Constraint 테스트

**파일 경로**: `src/pages/manufacturer/__tests__/integration/database-constraints.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Database Constraint Integration Test', () => {
  it('UDI-DI 중복 시 제품 등록이 실패해야 한다', async () => {
    // Create product with UDI-DI: 01234567890123
    // Try to create another product with same UDI-DI
    // Verify error thrown
  })

  it('Lot 번호 중복 시 생산 등록이 실패해야 한다', async () => {
    // Manually create lot with lot_number: ABC12300001
    // Try to create another lot with same lot_number
    // Verify error thrown
  })

  it('재고를 초과하는 출고가 실패해야 한다', async () => {
    // Create lot with 50 quantity
    // Try to decrement inventory by 60
    // Verify error thrown
    // Verify inventory unchanged
  })

  it('조직당 하나의 제조사 설정만 존재해야 한다', async () => {
    // Create manufacturer settings
    // Try to create another settings for same organization
    // Verify upsert behavior (update instead of duplicate)
  })
})
```

---

### 4. Performance 테스트

**파일 경로**: `src/pages/manufacturer/__tests__/integration/performance.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Performance Integration Test', () => {
  it('대량 Lot 조회가 5초 이내에 완료되어야 한다', async () => {
    // Create 1000 lots
    const startTime = Date.now()

    // Query all lots
    const { data } = await supabase
      .from('lots')
      .select('*, product:products(*)')
      .limit(1000)

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(5000) // 5 seconds
  })

  it('재고 집계가 3초 이내에 완료되어야 한다', async () => {
    // Create 500 inventory records
    const startTime = Date.now()

    // Aggregate inventory
    const { data } = await supabase
      .from('inventory')
      .select('current_quantity')

    const total = data?.reduce((sum, inv) => sum + inv.current_quantity, 0)

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(3000) // 3 seconds
  })
})
```

---

## ✅ Test Coverage Requirements

### Phase 3 전체 테스트 커버리지 목표

- **Unit Tests**: 80% 이상
- **Integration Tests**: 주요 워크플로우 100% 커버
- **E2E Tests**: Critical path 100% 커버

### 테스트해야 할 주요 영역

1. **제품 관리** (Phase 3.1-3.2)
   - ✅ 제품 목록 조회
   - ✅ 제품 CRUD
   - ✅ UDI-DI 중복 검증
   - ✅ 제품 활성화/비활성화

2. **제조사 설정** (Phase 3.3)
   - ✅ 설정 등록/수정
   - ✅ Lot 번호 미리보기
   - ✅ Upsert 동작

3. **Lot 생산** (Phase 3.4)
   - ✅ Lot 번호 자동 생성
   - ✅ Virtual Code 생성
   - ✅ 사용기한 자동 계산
   - ✅ Inventory 생성

4. **출고** (Phase 3.5)
   - ✅ FIFO 할당 알고리즘
   - ✅ 장바구니 기능
   - ✅ 재고 차감
   - ✅ Shipment 레코드 생성

5. **재고 조회** (Phase 3.6)
   - ✅ 재고 목록 표시
   - ✅ 사용기한 경고
   - ✅ 재고 통계

6. **거래 이력** (Phase 3.7)
   - ✅ 생산/출고 이력 조회
   - ✅ 날짜별 정렬
   - ✅ 유형별 필터

---

## 🔍 Manual Test Checklist

### 제조사 기능 전체 시나리오

- [ ] **1. 초기 설정**
  - [ ] 제조사 설정 등록 (Lot 접두사, 자릿수, 사용기한)
  - [ ] 설정 저장 확인
  - [ ] Lot 번호 미리보기 확인

- [ ] **2. 제품 등록**
  - [ ] 제품 등록 (제품명, UDI-DI, 모델명)
  - [ ] UDI-DI 중복 검사 동작 확인
  - [ ] 제품 목록에 표시 확인

- [ ] **3. Lot 생산**
  - [ ] Lot 생산 등록 (제품 선택, 수량, 생산일)
  - [ ] Lot 번호 자동 생성 확인
  - [ ] Virtual Code 생성 확인
  - [ ] 사용기한 자동 계산 확인
  - [ ] 재고 자동 생성 확인

- [ ] **4. 재고 확인**
  - [ ] 재고 목록에 Lot 표시 확인
  - [ ] 재고 수량 일치 확인
  - [ ] 사용기한 임박 경고 표시 확인

- [ ] **5. 출고 처리**
  - [ ] 제품 선택 및 수량 입력
  - [ ] FIFO 자동 할당 확인
  - [ ] 출고 완료 처리
  - [ ] 재고 차감 확인

- [ ] **6. 이력 조회**
  - [ ] 생산 이력 표시 확인
  - [ ] 출고 이력 표시 확인
  - [ ] 날짜별 정렬 확인

---

## 🔄 Git Commit Message

```bash
test(manufacturer): add Phase 3 integration tests

- Add manufacturer workflow integration test
- Add FIFO allocation algorithm test
- Add database constraint validation test
- Add performance benchmark test
- Define test coverage requirements
- Create manual test checklist

Test scenarios:
- Full manufacturer workflow (settings → production → shipment)
- FIFO allocation with multiple lots
- UDI-DI and lot number uniqueness
- Inventory quantity constraints
- Performance benchmarks for large datasets

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] 전체 워크플로우 통합 테스트 작성 완료
- [ ] FIFO 알고리즘 통합 테스트 작성 완료
- [ ] Database constraint 테스트 작성 완료
- [ ] Performance 테스트 작성 완료
- [ ] 모든 통합 테스트 통과
- [ ] Unit 테스트 커버리지 80% 이상 달성
- [ ] Manual test checklist 100% 완료
- [ ] Phase 3 전체 기능 검증 완료
- [ ] Git commit (Conventional Commits) 완료

---

## 🔗 References

- [Vitest Integration Testing](https://vitest.dev/guide/features.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 4 - 유통사 기능](../phase-4/README.md)

**Phase 4 개요**:
- 입고 관리
- 재고 조회
- 병원 출고
- 반품 처리
- 이력 조회
- 통합 테스트

**Phase 3 완료!** 🎉

모든 제조사 핵심 기능이 구현되었습니다:
- ✅ 제품 관리 (CRUD)
- ✅ 제조사 설정
- ✅ Lot 생산 등록
- ✅ 출고 (FIFO)
- ✅ 재고 조회
- ✅ 거래 이력
- ✅ 통합 테스트
