# Phase 7.6: 성능 최적화 및 버그 수정

## 📋 Overview

**목표**: MVP 전체 기능을 검증하고, 성능 병목 지점을 개선하며, 발견된 버그를 수정하여 프로덕션 배포 준비를 완료합니다.

**PRD 참조**:
- Section 15.3: 성능 요구사항
- Section 16: 품질 보증

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

## 🎯 성능 최적화 영역

### 1. 데이터베이스 쿼리 최적화

#### 인덱스 추가

**분석 쿼리**:
```sql
-- 느린 쿼리 찾기
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100 -- 100ms 이상
ORDER BY total_time DESC
LIMIT 20;
```

**필수 인덱스**:
```sql
-- 1. Shipments 조회 최적화
CREATE INDEX IF NOT EXISTS idx_shipments_composite
ON shipments(to_organization_id, status, shipped_at DESC);

-- 2. Inventory FIFO 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_inventory_fifo
ON inventory(organization_id, lot_id)
INCLUDE (current_quantity);

CREATE INDEX IF NOT EXISTS idx_lots_fifo
ON lots(product_id, expiry_date, manufacture_date, created_at);

-- 3. Usage Records 조회 최적화
CREATE INDEX IF NOT EXISTS idx_usage_records_composite
ON usage_records(inventory_id, used_at DESC);

-- 4. Virtual Code 검색 최적화
CREATE INDEX IF NOT EXISTS idx_shipment_items_virtual_code
ON shipment_items(virtual_code);

-- 5. Patient Phone 검색 최적화
CREATE INDEX IF NOT EXISTS idx_usage_records_patient
ON usage_records(patient_phone);
```

#### N+1 쿼리 문제 해결

**Before (N+1)**:
```typescript
// 100개 shipment를 조회하면 100+1개의 쿼리 발생
const { data: shipments } = await supabase
  .from('shipments')
  .select('*')

for (const shipment of shipments) {
  const { data: items } = await supabase
    .from('shipment_items')
    .select('*')
    .eq('shipment_id', shipment.id) // N번 쿼리
}
```

**After (JOIN 사용)**:
```typescript
// 단일 쿼리로 모든 데이터 가져오기
const { data: shipments } = await supabase
  .from('shipments')
  .select(`
    *,
    shipment_items(
      *,
      lot(
        *,
        product(*)
      )
    ),
    from_organization:organizations!from_organization_id(*),
    to_organization:organizations!to_organization_id(*)
  `)
```

---

### 2. 프론트엔드 성능 최적화

#### React Query 캐싱 전략

**설정** (`src/lib/queryClient.ts`):
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      cacheTime: 1000 * 60 * 30, // 30분
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
```

**쿼리 Prefetching**:
```typescript
// 사용자가 페이지에 접근하기 전에 데이터 미리 로드
const prefetchInventory = async () => {
  await queryClient.prefetchQuery({
    queryKey: ['inventory', userData.organization_id],
    queryFn: fetchInventory,
  })
}

// Link 컴포넌트에 onMouseEnter 추가
<Link href="/inventory" onMouseEnter={prefetchInventory}>
  재고 관리
</Link>
```

#### Code Splitting

**동적 import**:
```typescript
// 큰 컴포넌트는 동적으로 로드
import dynamic from 'next/dynamic'

const HeavyReportChart = dynamic(
  () => import('@/components/HeavyReportChart'),
  {
    loading: () => <Skeleton className="h-64" />,
    ssr: false, // 클라이언트에서만 렌더링
  }
)
```

#### 이미지 최적화

```tsx
import Image from 'next/image'

// Before
<img src="/logo.png" alt="Logo" />

// After
<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority // LCP 개선
  placeholder="blur" // 로딩 중 블러 효과
/>
```

---

### 3. 번들 사이즈 최적화

#### 분석 도구 설치

```bash
npm install -D @next/bundle-analyzer
```

**next.config.js**:
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // 기존 설정...
})
```

#### Tree Shaking

**Before**:
```typescript
import _ from 'lodash' // 전체 라이브러리 번들링 (71KB)
```

**After**:
```typescript
import debounce from 'lodash/debounce' // 필요한 함수만 (2KB)
```

---

## 🐛 버그 수정 체크리스트

### Critical Bugs

- [ ] **재고 음수 방지**
  - 동시성 락 적용 확인
  - 재고 차감 전 항상 검증

- [ ] **Virtual Code 중복 방지**
  - Unique constraint 확인
  - 생성 시 충돌 처리

- [ ] **24시간 회수 기한 정확성**
  - 타임존 처리 (UTC 기준)
  - 경계 케이스 테스트 (정확히 24:00:00)

---

### High Priority Bugs

- [ ] **FIFO 정렬 오류**
  - 사용기한 → 제조일 → 생성일 순서 검증
  - 날짜 파싱 오류 확인

- [ ] **Pending 상태 전이 오류**
  - pending → approved → recalled 순서 강제
  - 잘못된 상태 전이 차단

- [ ] **RLS 정책 누락**
  - 모든 테이블 RLS 활성화 확인
  - 조직별 데이터 격리 검증

---

### Medium Priority Bugs

- [ ] **UI/UX 개선**
  - 로딩 인디케이터 추가
  - 에러 메시지 사용자 친화적으로 개선
  - 빈 상태 화면 추가

- [ ] **폼 검증 강화**
  - 필수 필드 검증
  - 숫자 범위 검증 (수량 > 0)
  - 날짜 유효성 검증 (제조일 < 사용기한)

- [ ] **접근성 (a11y)**
  - 키보드 네비게이션 지원
  - ARIA 레이블 추가
  - 색상 대비 개선

---

## 📊 성능 벤치마크

### 목표 성능 지표

**PRD Section 12.1 성능 요구사항**:
- 동시 접속자: 100명
- 월간 거래량: 20,000 units

| 지표 | 목표 | 측정 방법 | 우선순위 |
|------|------|-----------|----------|
| **1. 페이지 로드 시간 (FCP)** | < 2초 | Lighthouse, WebPageTest | High |
| **2. API 응답 시간** | < 500ms | Chrome DevTools Network | High |
| **3. FIFO 할당 (100개 Lot)** | < 500ms | Performance Benchmark 테스트 | High |
| **4. 재고 조회 쿼리** | < 100ms | PostgreSQL EXPLAIN ANALYZE | High |
| **5. 번들 사이즈 (gzipped)** | < 500KB | webpack-bundle-analyzer | Medium |
| **6. Lighthouse 성능 점수** | > 90/100 | Lighthouse CI | Medium |
| **7. 동시 사용자 처리** | 100 users | k6 load testing (RPS > 50) | High |
| **8. 데이터베이스 커넥션** | < 20 connections | Supabase Dashboard | Low |
| **9. 메모리 사용량** | < 512MB | Node.js heap profiling | Low |

**측정 시나리오**:
1. **페이지 로드 시간**: 제조사 로그인 → 제품 목록 페이지 접근
2. **API 응답 시간**: 재고 조회 API (100개 Lot 포함)
3. **FIFO 할당**: 100개 Lot 중 50개 할당 요청
4. **재고 조회 쿼리**: `SELECT * FROM inventory WHERE organization_id = ? ORDER BY lot.expiry_date`
5. **동시 사용자**: 100명이 동시에 출고 처리 (10 RPS × 10초)

**성능 측정 도구**:
- **프론트엔드**: Lighthouse, WebPageTest, Chrome DevTools Performance
- **백엔드**: PostgreSQL EXPLAIN ANALYZE, Supabase Dashboard
- **로드 테스트**: k6 (Grafana k6), Artillery
- **번들 분석**: webpack-bundle-analyzer, @next/bundle-analyzer

### 벤치마크 테스트

**파일**: `src/__tests__/performance/benchmark.test.ts`

```typescript
import { describe, it, expect } from 'vitest'

describe('Performance Benchmark', () => {
  it('FIFO 할당이 500ms 이내에 완료되어야 한다', async () => {
    // 100개 Lot 생성
    const lots = Array.from({ length: 100 }, (_, i) => ({
      id: `lot-${i}`,
      current_quantity: 100,
      expiry_date: new Date(Date.now() + i * 86400000), // i일 후
    }))

    const start = performance.now()
    const result = allocateFIFO(lots, 'product-1', 500)
    const end = performance.now()

    expect(end - start).toBeLessThan(500) // 500ms
    expect(result.length).toBeGreaterThan(0)
  })

  it('재고 조회 쿼리가 100ms 이내에 완료되어야 한다', async () => {
    const start = performance.now()

    const { data } = await supabase
      .from('inventory')
      .select('*, lot(*, product(*))')
      .eq('organization_id', testOrgId)

    const end = performance.now()

    expect(end - start).toBeLessThan(100) // 100ms
  })
})
```

---

## 🧪 통합 검증 시나리오

### 시나리오 1: 전체 플로우 End-to-End

1. 제조사 로그인
2. Lot 생산 (100개)
3. 유통사에 출고 (50개)
4. 유통사 입고 승인
5. 병원에 출고 (30개)
6. 병원 입고 승인
7. 환자에게 투여 (10개)
8. 최종 재고 확인
   - 제조사: 50개
   - 유통사: 20개
   - 병원: 20개

**검증 포인트**:
- [ ] 모든 단계에서 로딩 시간 < 2초
- [ ] 재고 정확성 100%
- [ ] Virtual Code 추적 가능
- [ ] 에러 없음

---

### 시나리오 2: 스트레스 테스트 (k6)

**목표**: PRD Section 12.1 요구사항 검증
- 100명 동시 접속자 처리
- 응답 시간 < 500ms (p95)
- 에러율 < 1%

**도구**: k6 (Grafana k6)

**설치**:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**테스트 스크립트** (`tests/performance/load-test.js`):

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

// PRD Section 12.1: 100 concurrent users
export const options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp-up to 20 users
    { duration: '2m', target: 50 },  // Ramp-up to 50 users
    { duration: '2m', target: 100 }, // Ramp-up to 100 users (PRD requirement)
    { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
    { duration: '1m', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
    'errors': ['rate<0.01'],            // Error rate must be below 1%
    'http_req_failed': ['rate<0.01'],   // Request failure rate must be below 1%
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const API_URL = `${BASE_URL}/api`

let authToken = null

export function setup() {
  // Login to get auth token
  const loginRes = http.post(`${API_URL}/auth/login`, JSON.stringify({
    email: 'manufacturer@test.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  })

  authToken = loginRes.json('access_token')
  return { authToken }
}

export default function (data) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.authToken}`,
    },
  }

  // Scenario 1: 재고 조회 (읽기 부하)
  const inventoryRes = http.get(`${API_URL}/inventory`, params)
  check(inventoryRes, {
    'inventory status is 200': (r) => r.status === 200,
    'inventory response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1)

  sleep(1)

  // Scenario 2: 출고 처리 (쓰기 부하 + FIFO 알고리즘)
  const shipmentRes = http.post(`${API_URL}/shipment`, JSON.stringify({
    to_organization_id: 'test-distributor-id',
    items: [
      { product_id: 'test-product-1', quantity: 5 },
      { product_id: 'test-product-2', quantity: 10 },
    ],
  }), params)

  check(shipmentRes, {
    'shipment status is 200': (r) => r.status === 200,
    'shipment response time < 2000ms': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1)

  sleep(2)

  // Scenario 3: 제품 목록 조회 (캐싱 효과 측정)
  const productsRes = http.get(`${API_URL}/products`, params)
  check(productsRes, {
    'products status is 200': (r) => r.status === 200,
    'products response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1)

  sleep(1)
}

export function teardown(data) {
  // Cleanup if needed
  console.log('Load test completed')
}
```

**실행 방법**:

```bash
# 로컬 환경 테스트
k6 run tests/performance/load-test.js

# 프로덕션 환경 테스트
k6 run --env BASE_URL=https://neo-certify-prod.com tests/performance/load-test.js

# 결과를 JSON으로 출력
k6 run --out json=test-results.json tests/performance/load-test.js

# InfluxDB + Grafana 대시보드 연동
k6 run --out influxdb=http://localhost:8086/k6 tests/performance/load-test.js
```

**성능 목표**:
- ✅ **p95 응답 시간**: < 500ms (PRD 요구사항)
- ✅ **에러율**: < 1%
- ✅ **동시 사용자**: 100명 안정적 처리
- ✅ **처리량 (RPS)**: > 50 requests/second

**예상 출력**:
```
     ✓ inventory status is 200
     ✓ inventory response time < 500ms
     ✓ shipment status is 200
     ✓ shipment response time < 2000ms
     ✓ products status is 200
     ✓ products response time < 300ms

     checks.........................: 100.00% ✓ 15000      ✗ 0
     data_received..................: 45 MB   75 kB/s
     data_sent......................: 5.2 MB  8.7 kB/s
     http_req_duration..............: avg=324ms min=112ms med=298ms max=1.2s p(95)=476ms
     http_req_failed................: 0.00%   ✓ 0         ✗ 5000
     http_reqs......................: 5000    8.33/s
     iteration_duration.............: avg=4.5s  min=4.2s  med=4.4s  max=5.2s
     iterations.....................: 1250    2.08/s
     vus............................: 100     min=0       max=100
     vus_max........................: 100     min=100     max=100
```

---

## ✅ Definition of Done

### 성능 최적화
- [ ] 데이터베이스 인덱스 추가 완료
- [ ] N+1 쿼리 문제 해결
- [ ] React Query 캐싱 전략 적용
- [ ] Code Splitting 구현
- [ ] 이미지 최적화 완료
- [ ] 번들 사이즈 < 500KB (gzipped)

### 버그 수정
- [ ] Critical bugs 0개
- [ ] High priority bugs 0개
- [ ] Medium priority bugs < 3개

### 성능 벤치마크
- [ ] 페이지 로드 시간 < 2초
- [ ] FIFO 할당 < 500ms
- [ ] 재고 조회 < 100ms
- [ ] Lighthouse 점수 > 90

### 통합 검증
- [ ] 전체 플로우 E2E 테스트 통과
- [ ] 스트레스 테스트 통과 (10 VUs)
- [ ] 브라우저 호환성 테스트 (Chrome, Safari, Firefox)
- [ ] 모바일 반응형 확인

### 문서화
- [ ] 성능 최적화 내역 문서화
- [ ] 알려진 이슈 목록 작성
- [ ] 프로덕션 배포 체크리스트 작성

---

## 🔗 관련 문서

- [Phase 7.1: FIFO 알고리즘](phase-7.1-fifo-algorithm.md)
- [Phase 7.4: 동시성 처리](phase-7.4-concurrency.md)
- [Phase 7.5: E2E 테스트](phase-7.5-e2e-test.md)
- [Phase 8: 프로덕션 배포 준비](../phase-8/README.md)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 8 - 프로덕션 배포 준비](../phase-8/README.md)

**Phase 7 완료!** 🎉

MVP 통합 테스트 및 최적화가 완료되었습니다:
- ✅ FIFO 알고리즘 구현 및 테스트
- ✅ Virtual Code 생성 및 검증
- ✅ Pending 워크플로우 구현
- ✅ 동시성 처리 (Advisory Lock)
- ✅ E2E 테스트 (Playwright)
- ✅ 성능 최적화 및 버그 수정
