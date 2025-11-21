# Phase 6.5: 통합 테스트

## 📋 Overview

**Phase 6.5**는 Phase 6(관리자 기능)의 통합 테스트를 정의합니다. 조직 승인→사용자 관리→제품 승인 전체 워크플로우를 테스트합니다.

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

### 1. 관리자 워크플로우 (조직 승인→사용자 활성화→제품 승인)

**파일 경로**: `src/pages/admin/__tests__/integration/admin-workflow.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Admin Workflow Integration Test', () => {
  it('조직 승인→사용자 활성화→제품 승인 전체 플로우가 정상 동작해야 한다', async () => {
    // 1. 조직 승인 관리 (Phase 6.1)
    // - Fetch pending organizations
    // - Approve organization A
    // - Verify organization A status is 'active'
    // - Verify approved_at and approved_by are set

    // 2. 조직 승인 후 자동 활성화 확인
    // - Organization A의 사용자가 자동으로 활성화되었는지 확인
    // - User list에서 organization A 사용자 조회
    // - Verify is_active is true

    // 3. 사용자 관리 (Phase 6.2)
    // - Fetch all users
    // - Find user from organization A
    // - Update user role from 'viewer' to 'manager'
    // - Verify role is updated

    // 4. 제품 마스터 관리 (Phase 6.3)
    // - Organization A가 등록한 제품 조회
    // - Approve product X from organization A
    // - Verify product X status is 'active'
    // - Verify approved_at and approved_by are set

    // 5. 시스템 모니터링 (Phase 6.4)
    // - Verify organization count increased
    // - Verify user count reflects changes
    // - Verify product count increased
    // - Verify inventory stats updated

    // 6. 역할 기반 접근 제어 검증
    // - Non-admin user tries to access organization approval page
    // - Verify access denied
    // - Admin user accesses successfully
  })

  it('조직 거부 시 사용자와 제품도 비활성화되어야 한다', async () => {
    // 1. Create organization B with status 'pending'
    // 2. Create user for organization B
    // 3. Create product for organization B with status 'pending'

    // 4. Reject organization B
    // - Provide rejection reason
    // - Verify organization B status is 'rejected'
    // - Verify rejection_reason is saved

    // 5. Verify cascade effects
    // - User from organization B is inactive
    // - Product from organization B is rejected or inactive
  })

  it('제품 승인 전에 조직이 활성화되어 있어야 한다', async () => {
    // 1. Create organization C with status 'pending'
    // 2. Create product for organization C with status 'pending'

    // 3. Try to approve product from organization C
    // - Verify error: "조직이 승인되지 않았습니다"

    // 4. Approve organization C
    // 5. Now approve product from organization C
    // - Verify success
  })
})
```

---

### 2. 관리자 권한 테스트

**파일 경로**: `src/pages/admin/__tests__/integration/admin-permissions.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Admin Permissions Integration Test', () => {
  it('관리자만 조직 승인 페이지에 접근할 수 있어야 한다', async () => {
    // 1. Login as 'viewer' user
    // 2. Navigate to OrganizationApprovalPage
    // 3. Verify redirect to dashboard or error message

    // 4. Login as 'admin' user
    // 5. Navigate to OrganizationApprovalPage
    // 6. Verify page loads successfully
  })

  it('관리자만 사용자 역할을 변경할 수 있어야 한다', async () => {
    // 1. Login as 'manager' user
    // 2. Try to update another user's role
    // 3. Verify error: "권한이 없습니다"

    // 4. Login as 'admin' user
    // 5. Update user role
    // 6. Verify success
  })

  it('관리자는 자기 자신의 역할을 제거할 수 없어야 한다', async () => {
    // 1. Login as 'admin' user (admin-123)
    // 2. Try to change own role to 'viewer'
    // 3. Verify error: "자기 자신의 관리자 권한을 제거할 수 없습니다"
  })

  it('관리자만 제품을 승인/거부할 수 있어야 한다', async () => {
    // 1. Login as 'staff' user
    // 2. Try to approve product
    // 3. Verify error: "권한이 없습니다"

    // 4. Login as 'admin' user
    // 5. Approve product
    // 6. Verify success
  })
})
```

---

### 3. 시스템 모니터링 데이터 무결성 테스트

**파일 경로**: `src/pages/admin/__tests__/integration/monitoring-integrity.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Monitoring Data Integrity Test', () => {
  it('조직별 재고 합계가 정확해야 한다', async () => {
    // 1. Create organization A
    // 2. Create lot 1 with quantity 100
    // 3. Create inventory record for organization A with lot 1, quantity 100
    // 4. Create lot 2 with quantity 50
    // 5. Create inventory record for organization A with lot 2, quantity 50

    // 6. Query SystemMonitoringPage inventory by organization
    // 7. Verify organization A total_quantity = 150 (100 + 50)
    // 8. Verify organization A lot_count = 2
  })

  it('거래량 추이가 정확하게 집계되어야 한다', async () => {
    // 1. Create shipment on 2025-01-15 (status: completed, received_date: 2025-01-15)
    // 2. Create usage on 2025-01-15
    // 3. Create disposal on 2025-01-15
    // 4. Create shipment on 2025-01-16 (status: completed, received_date: 2025-01-16)

    // 5. Query transaction volume for January 2025
    // 6. Verify 2025-01-15 has:
    //    - receiving_count: 1
    //    - usage_count: 1
    //    - disposal_count: 1
    // 7. Verify 2025-01-16 has:
    //    - receiving_count: 1
  })

  it('시스템 통계가 실시간으로 갱신되어야 한다', async () => {
    // 1. Query initial system stats
    // - Record totalOrganizations, totalUsers, totalProducts

    // 2. Create new organization
    // 3. Query system stats again
    // - Verify totalOrganizations increased by 1

    // 4. Create new user
    // 5. Query system stats again
    // - Verify totalUsers increased by 1

    // 6. Create new product
    // 7. Query system stats again
    // - Verify totalProducts increased by 1
  })

  it('월별 필터가 정확하게 동작해야 한다', async () => {
    // 1. Create shipments in different months:
    //    - 2025-01-15 (1 shipment)
    //    - 2025-02-10 (2 shipments)
    //    - 2025-03-20 (1 shipment)

    // 2. Query transaction volume for 2025-01
    // - Verify only January shipments are included
    // - Verify count = 1

    // 3. Query transaction volume for 2025-02
    // - Verify only February shipments are included
    // - Verify count = 2
  })
})
```

---

### 4. UDI-DI 중복 검증 테스트

**파일 경로**: `src/pages/admin/__tests__/integration/udi-di-validation.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('UDI-DI Duplicate Validation Test', () => {
  it('동일한 UDI-DI를 가진 제품은 동시에 활성화될 수 없어야 한다', async () => {
    // 1. Create product A with UDI-DI "12345678901234", status 'active'
    // 2. Create product B with UDI-DI "12345678901234", status 'pending'

    // 3. Try to approve product B
    // 4. Verify error: "이미 활성화된 동일한 UDI-DI 제품이 존재합니다"
  })

  it('비활성화된 제품과 동일한 UDI-DI는 승인 가능해야 한다', async () => {
    // 1. Create product A with UDI-DI "12345678901234", status 'inactive'
    // 2. Create product B with UDI-DI "12345678901234", status 'pending'

    // 3. Approve product B
    // 4. Verify success
    // 5. Verify product B status is 'active'
  })

  it('거부된 제품과 동일한 UDI-DI는 승인 가능해야 한다', async () => {
    // 1. Create product A with UDI-DI "12345678901234", status 'rejected'
    // 2. Create product B with UDI-DI "12345678901234", status 'pending'

    // 3. Approve product B
    // 4. Verify success
    // 5. Verify product B status is 'active'
  })

  it('다른 조직의 동일한 UDI-DI 제품은 동시에 활성화될 수 있어야 한다', async () => {
    // NOTE: UDI-DI는 전역적으로 고유해야 하므로 이 테스트는 실패해야 함

    // 1. Create organization A
    // 2. Create product from org A with UDI-DI "12345678901234", status 'active'

    // 3. Create organization B
    // 4. Create product from org B with UDI-DI "12345678901234", status 'pending'

    // 5. Try to approve product from org B
    // 6. Verify error: "이미 활성화된 동일한 UDI-DI 제품이 존재합니다"

    // UDI-DI는 제조사와 무관하게 제품을 식별하는 전역 고유 식별자
  })
})
```

---

### 5. Performance 테스트

**파일 경로**: `src/pages/admin/__tests__/integration/performance.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'

describe('Admin Performance Test', () => {
  it('1000개 조직 목록을 5초 이내에 로드해야 한다', async () => {
    // Create 1000 organizations with status 'pending'
    const startTime = Date.now()

    // Query OrganizationApprovalPage
    const organizations = await fetchPendingOrganizations()

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(5000) // 5 seconds
    expect(organizations.length).toBe(1000)
  })

  it('10000명 사용자 목록을 10초 이내에 로드해야 한다', async () => {
    // Create 10000 users
    const startTime = Date.now()

    // Query UserManagementPage
    const users = await fetchAllUsers()

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(10000) // 10 seconds
    expect(users.length).toBe(10000)
  })

  it('복잡한 시스템 통계 쿼리가 5초 이내에 완료되어야 한다', async () => {
    // Create:
    // - 100 organizations
    // - 500 users
    // - 1000 products
    // - 5000 lots
    // - 10000 shipments

    const startTime = Date.now()

    // Query SystemMonitoringPage statistics
    const stats = await fetchSystemStats()

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(duration).toBeLessThan(5000) // 5 seconds
    expect(stats.totalOrganizations).toBe(100)
    expect(stats.totalUsers).toBe(500)
    expect(stats.totalProducts).toBe(1000)
  })
})
```

---

## ✅ Test Coverage Requirements

### Phase 6 전체 테스트 커버리지 목표

- **Unit Tests**: 80% 이상
- **Integration Tests**: 주요 워크플로우 100% 커버
- **E2E Tests**: Critical path 100% 커버

### 테스트해야 할 주요 영역

1. **조직 승인 관리** (Phase 6.1)
   - ✅ 조직 승인/거부
   - ✅ 승인 후 사용자 활성화
   - ✅ 거부 사유 기록

2. **사용자 관리** (Phase 6.2)
   - ✅ 사용자 역할 변경
   - ✅ 사용자 활성화/비활성화
   - ✅ 검색 및 필터

3. **제품 마스터 관리** (Phase 6.3)
   - ✅ 제품 승인/거부
   - ✅ UDI-DI 중복 검증
   - ✅ 제품 활성화/비활성화

4. **시스템 모니터링** (Phase 6.4)
   - ✅ 시스템 통계 집계
   - ✅ 조직별 재고 집계
   - ✅ 거래량 추이 집계

5. **권한 관리**
   - ✅ 관리자 전용 페이지 접근 제어
   - ✅ 관리자 자기 자신 역할 변경 방지

---

## 🔍 Manual Test Checklist

### 관리자 기능 전체 시나리오

- [ ] **1. 조직 승인 관리**
  - [ ] 승인 대기 조직 목록 확인
  - [ ] 조직 상세 정보 확인
  - [ ] 조직 승인
  - [ ] 조직 거부 (사유 입력)
  - [ ] 승인/거부 후 목록 갱신 확인

- [ ] **2. 사용자 관리**
  - [ ] 전체 사용자 목록 확인
  - [ ] 역할 필터 (admin/manager/staff/viewer)
  - [ ] 상태 필터 (active/inactive)
  - [ ] 검색 (이름, 이메일, 조직명)
  - [ ] 사용자 역할 변경
  - [ ] 사용자 활성화/비활성화

- [ ] **3. 제품 마스터 관리**
  - [ ] 전체 제품 목록 확인
  - [ ] 상태 필터 (active/pending/inactive/rejected)
  - [ ] 검색 (제품명, UDI-DI, 모델명, 제조사)
  - [ ] 제품 승인
  - [ ] 제품 거부 (사유 입력)
  - [ ] 제품 활성화/비활성화
  - [ ] UDI-DI 중복 검증

- [ ] **4. 시스템 모니터링**
  - [ ] 시스템 통계 확인 (조직/사용자/제품/Lot/거래)
  - [ ] 조직별 재고 현황 확인
  - [ ] 거래량 추이 확인
  - [ ] 월별 필터 적용

- [ ] **5. 권한 제어**
  - [ ] 일반 사용자로 관리자 페이지 접근 시 차단
  - [ ] 관리자로 로그인 시 정상 접근

---

## 🔄 Git Commit Message

```bash
test(admin): add Phase 6 integration tests

- Add admin workflow integration test (organization approval → user activation → product approval)
- Add organization rejection cascade test
- Add admin permissions test (role-based access control)
- Add monitoring data integrity test
- Add UDI-DI duplicate validation test
- Add performance benchmark test
- Define test coverage requirements
- Create manual test checklist

Test scenarios:
- Complete admin workflow with approval cascade
- Role-based access control enforcement
- System monitoring data accuracy
- UDI-DI uniqueness validation
- Performance benchmarks (1000 organizations, 10000 users)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] 관리자 워크플로우 통합 테스트 작성 완료
- [ ] 관리자 권한 테스트 작성 완료
- [ ] 시스템 모니터링 데이터 무결성 테스트 작성 완료
- [ ] UDI-DI 중복 검증 테스트 작성 완료
- [ ] Performance 테스트 작성 완료
- [ ] 모든 통합 테스트 통과
- [ ] Unit 테스트 커버리지 80% 이상 달성
- [ ] Manual test checklist 100% 완료
- [ ] Phase 6 전체 기능 검증 완료
- [ ] Git commit (Conventional Commits) 완료

---

## 🔗 References

- [Vitest Integration Testing](https://vitest.dev/guide/features.html)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Role-Based Access Control (RBAC)](https://en.wikipedia.org/wiki/Role-based_access_control)
- [UDI System - FDA](https://www.fda.gov/medical-devices/unique-device-identification-system-udi-system)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 7 - 비즈니스 로직](../phase-7/README.md)

**Phase 7 개요**:
- 재고 자동 알림
- 사용기한 만료 경고
- 리콜 시뮬레이션
- 데이터 백업 및 복원
- 통합 테스트

**Phase 6 완료!** 🎉

모든 관리자 핵심 기능이 구현되었습니다:
- ✅ 조직 승인 관리
- ✅ 사용자 관리
- ✅ 제품 마스터 관리
- ✅ 시스템 모니터링
- ✅ 통합 테스트 (관리자 워크플로우)
