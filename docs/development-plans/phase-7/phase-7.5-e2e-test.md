# Phase 7.5: E2E 테스트 (Playwright)

## 📋 Overview

**목표**: Playwright를 사용하여 제조사 → 유통사 → 병원 → 환자 전체 공급망 플로우를 E2E 테스트합니다.

**PRD 참조**:
- Section 5.3: 공급망 플로우 전체
- Section 16: 테스트 전략

**예상 소요 시간**: 2-3일

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

## 🎯 테스트 전략

### 1. Playwright 설정

**설치**:
```bash
npm install -D @playwright/test
npx playwright install
```

**설정 파일** (`playwright.config.ts`):
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

### 2. 테스트 데이터 준비

**Seed 데이터** (`e2e/setup/seed.ts`):
```typescript
import { createClient } from '@supabase/supabase-js'

export async function seedTestData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin key
  )

  // 1. 조직 생성
  const { data: manufacturer } = await supabase
    .from('organizations')
    .insert({ name: 'Test Manufacturer', type: 'manufacturer' })
    .select()
    .single()

  const { data: distributor } = await supabase
    .from('organizations')
    .insert({ name: 'Test Distributor', type: 'distributor' })
    .select()
    .single()

  const { data: hospital } = await supabase
    .from('organizations')
    .insert({ name: 'Test Hospital', type: 'hospital' })
    .select()
    .single()

  // 2. 사용자 생성
  // 3. 제품 생성
  // 4. Lot 생성

  return { manufacturer, distributor, hospital }
}
```

---

## 🧪 E2E 테스트 시나리오

### 시나리오 1: 제조사 → 유통사 → 병원 → 환자 전체 플로우

**파일**: `e2e/full-supply-chain.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { seedTestData } from './setup/seed'

test.describe('전체 공급망 플로우', () => {
  test('제조사 → 유통사 → 병원 → 환자', async ({ page, context }) => {
    // Setup
    const testData = await seedTestData()

    // ===================
    // 1. 제조사: Lot 생산
    // ===================
    await page.goto('/login')
    await page.fill('[name="email"]', 'manufacturer@test.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/manufacturer/lot-production')
    await page.click('text=Lot 생산')

    await page.selectOption('[name="product_id"]', testData.product.id)
    await page.fill('[name="quantity"]', '100')
    await page.fill('[name="manufacture_date"]', '2025-01-01')
    await page.fill('[name="expiry_date"]', '2025-12-31')

    await page.click('button:has-text("생산 등록")')
    await expect(page.locator('text=Lot 생산 완료')).toBeVisible()

    // ===================
    // 2. 제조사: 유통사에 출고
    // ===================
    await page.goto('/manufacturer/shipment')
    await page.click('text=출고 생성')

    await page.selectOption('[name="distributor"]', testData.distributor.id)
    await page.fill('[name="quantity"]', '50')
    await page.click('button:has-text("출고")')

    await expect(page.locator('text=출고 완료 (Pending)')).toBeVisible()

    // ===================
    // 3. 유통사: 입고 승인
    // ===================
    await context.clearCookies() // 로그아웃
    await page.goto('/login')
    await page.fill('[name="email"]', 'distributor@test.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/distributor/receiving')
    await expect(page.locator('tbody tr')).toHaveCount(1) // Pending 1개

    await page.click('button:has-text("승인")')
    await expect(page.locator('text=입고 승인 완료')).toBeVisible()

    // 재고 확인
    await page.goto('/distributor/inventory')
    await expect(page.locator('td:has-text("50")')).toBeVisible()

    // ===================
    // 4. 유통사: 병원에 출고
    // ===================
    await page.goto('/distributor/hospital-shipment')
    await page.click('text=출고 생성')

    await page.selectOption('[name="hospital"]', testData.hospital.id)
    await page.fill('[name="quantity"]', '30')
    await page.click('button:has-text("출고")')

    await expect(page.locator('text=출고 완료 (Pending)')).toBeVisible()

    // ===================
    // 5. 병원: 입고 승인
    // ===================
    await context.clearCookies()
    await page.goto('/login')
    await page.fill('[name="email"]', 'hospital@test.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.goto('/hospital/receiving')
    await expect(page.locator('tbody tr')).toHaveCount(1)

    await page.click('button:has-text("승인")')
    await expect(page.locator('text=입고 승인 완료')).toBeVisible()

    // ===================
    // 6. 병원: 환자에게 투여
    // ===================
    await page.goto('/hospital/usage')
    await page.click('text=사용 등록')

    await page.fill('[name="patient_phone"]', '010-1234-5678')
    await page.fill('[name="quantity"]', '5')
    await page.click('button:has-text("사용 등록")')

    await expect(page.locator('text=사용 등록 완료')).toBeVisible()

    // ===================
    // 7. 최종 재고 검증
    // ===================
    // 제조사 재고: 100 - 50 = 50
    // 유통사 재고: 50 - 30 = 20
    // 병원 재고: 30 - 5 = 25

    await page.goto('/hospital/inventory')
    await expect(page.locator('td:has-text("25")')).toBeVisible()
  })
})
```

---

### 시나리오 2: Pending 승인/거부 플로우

**파일**: `e2e/pending-approval.spec.ts`

```typescript
test.describe('Pending 승인/거부', () => {
  test('유통사가 입고 거부', async ({ page }) => {
    // Setup: 제조사가 출고 완료

    // 유통사 로그인
    await login(page, 'distributor@test.com')

    await page.goto('/distributor/receiving')
    await page.click('button:has-text("거부")')

    // 거부 사유 입력
    await page.fill('[name="reject_reason"]', '품질 이상')
    await page.click('button:has-text("확인")')

    await expect(page.locator('text=입고 거부 완료')).toBeVisible()

    // 제조사 재고 복원 확인
    // (제조사 로그인 후 재고 확인)
  })
})
```

---

### 시나리오 3: 회수 (24시간 이내)

**파일**: `e2e/recall.spec.ts`

```typescript
test.describe('회수', () => {
  test('24시간 이내 회수 성공', async ({ page }) => {
    // Setup: 유통사가 입고 승인 완료 (1시간 전)

    await login(page, 'distributor@test.com')

    await page.goto('/distributor/approved-shipments')
    await page.click('button:has-text("회수")')

    await page.fill('[name="recall_reason"]', '오배송')
    await page.click('button:has-text("확인")')

    await expect(page.locator('text=회수 완료')).toBeVisible()

    // 재고 복원 확인
    await page.goto('/manufacturer/inventory')
    // 재고 확인...
  })

  test('24시간 경과 후 회수 불가', async ({ page }) => {
    // Setup: 유통사가 입고 승인 완료 (25시간 전)
    // Mock 시간 또는 DB 타임스탬프 조작

    await login(page, 'distributor@test.com')

    await page.goto('/distributor/approved-shipments')
    await expect(page.locator('button:has-text("회수")')).toBeDisabled()
    await expect(page.locator('text=회수 불가 (24h 경과)')).toBeVisible()
  })
})
```

---

### 시나리오 4: 동시 출고 (동시성 테스트)

**파일**: `e2e/concurrency.spec.ts`

```typescript
test.describe('동시성 테스트', () => {
  test('2명이 동시에 출고 시도', async ({ browser }) => {
    // Setup: Product A 재고 10개

    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    // 두 사용자 모두 로그인
    await login(page1, 'user1@test.com')
    await login(page2, 'user2@test.com')

    // 두 사용자 모두 출고 페이지 접근
    await Promise.all([
      page1.goto('/manufacturer/shipment'),
      page2.goto('/manufacturer/shipment'),
    ])

    // 동시에 8개씩 출고 시도
    const shipment1 = page1.fill('[name="quantity"]', '8').then(() => page1.click('button:has-text("출고")'))
    const shipment2 = page2.fill('[name="quantity"]', '8').then(() => page2.click('button:has-text("출고")'))

    await Promise.allSettled([shipment1, shipment2])

    // 하나는 성공, 하나는 실패 (재고 부족)
    const success = await page1.locator('text=출고 완료').isVisible()
    const failure = await page2.locator('text=재고 부족').isVisible()

    expect(success || failure).toBe(true)
    expect(success && failure).toBe(false) // 둘 다 성공하면 안됨
  })
})
```

---

### 시나리오 5: FIFO 검증

**파일**: `e2e/fifo-validation.spec.ts`

```typescript
test.describe('FIFO 검증', () => {
  test('사용기한 가까운 Lot부터 출고', async ({ page }) => {
    // Setup
    // Lot #1: 수량 50, 사용기한 2025-06-30
    // Lot #2: 수량 50, 사용기한 2025-12-31

    await login(page, 'manufacturer@test.com')

    await page.goto('/manufacturer/shipment')
    await page.fill('[name="quantity"]', '60')
    await page.click('button:has-text("출고")')

    // 출고 상세 확인
    const shipmentItems = await page.locator('table tbody tr').all()

    // Lot #1에서 50개, Lot #2에서 10개 할당 확인
    expect(shipmentItems).toHaveLength(2)

    const lot1Row = shipmentItems[0]
    await expect(lot1Row.locator('td').nth(1)).toHaveText('50') // 수량
    await expect(lot1Row.locator('td').nth(2)).toHaveText('2025-06-30') // 사용기한

    const lot2Row = shipmentItems[1]
    await expect(lot2Row.locator('td').nth(1)).toHaveText('10')
    await expect(lot2Row.locator('td').nth(2)).toHaveText('2025-12-31')
  })
})
```

---

## 📂 프로젝트 구조

```
e2e/
├── setup/
│   ├── seed.ts              # 테스트 데이터 생성
│   └── helpers.ts           # 로그인, 공통 함수
├── full-supply-chain.spec.ts
├── pending-approval.spec.ts
├── recall.spec.ts
├── concurrency.spec.ts
└── fifo-validation.spec.ts
```

---

## ✅ Definition of Done

### Playwright 설정
- [ ] Playwright 설치 및 설정 완료
- [ ] `playwright.config.ts` 작성
- [ ] `e2e/setup/seed.ts` 테스트 데이터 생성 함수
- [ ] `e2e/setup/helpers.ts` 공통 함수 (로그인 등)

### 테스트 작성
- [ ] 시나리오 1: 전체 공급망 플로우 (제조사 → 환자)
- [ ] 시나리오 2: Pending 승인/거부
- [ ] 시나리오 3: 회수 (24시간 이내/이후)
- [ ] 시나리오 4: 동시 출고 (동시성)
- [ ] 시나리오 5: FIFO 검증

### CI/CD 통합
- [ ] GitHub Actions 워크플로우 추가
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 검증
- [ ] 5개 시나리오 모두 통과
- [ ] 스크린샷/비디오 캡처 확인
- [ ] 실패 시 자동 재시도 (flaky test 방지)
- [ ] CI 환경에서 안정적으로 실행

### 문서화
- [ ] E2E 테스트 실행 방법 README 작성
- [ ] 테스트 시나리오 문서화
- [ ] 실패 시 디버깅 가이드

---

## 🔗 관련 문서

- [Phase 7.1: FIFO 알고리즘](phase-7.1-fifo-algorithm.md)
- [Phase 7.3: Pending 워크플로우](phase-7.3-pending-workflow.md)
- [Phase 7.4: 동시성 처리](phase-7.4-concurrency.md)
- [Playwright 공식 문서](https://playwright.dev/)
- [PRD Section 16: 테스트 전략](../../neo-cert-prd-1.2.md#16-테스트-전략)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 7.6 - 성능 최적화 및 버그 수정](phase-7.6-optimization.md)
