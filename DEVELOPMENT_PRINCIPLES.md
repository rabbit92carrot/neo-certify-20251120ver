# 개발 원칙 (Development Principles)

이 문서는 네오인증서 시스템 개발 시 반드시 준수해야 할 핵심 원칙을 정의합니다.
**모든 개발자는 코드 작성 전 이 문서를 숙지하고, 각 Phase 작업 시 체크리스트로 활용해야 합니다.**

---

## 🎯 핵심 원칙 (Core Principles)

### 1. SSOT (Single Source of Truth)

**정의**: 모든 데이터, 상수, 설정은 단일 위치에서 정의하고 관리

**적용 규칙**:
- 모든 상태값(Status)은 `src/constants/status.ts`에 정의
- 모든 에러/성공 메시지는 `src/constants/messages.ts`에 정의
- 모든 검증 규칙은 `src/constants/validation.ts`에 정의
- 모든 URL 경로는 `src/constants/routes.ts`에 정의
- TypeScript 타입은 `src/types/` 하위에 도메인별로 분류

**예시**:

```typescript
// ❌ 잘못된 예
if (code.status === 'IN_STOCK') { ... }
if (user.role === 'manufacturer') { ... }

// ✅ 올바른 예
import { VIRTUAL_CODE_STATUS } from '@/constants/status'
import { USER_ROLES } from '@/constants/roles'

if (code.status === VIRTUAL_CODE_STATUS.IN_STOCK) { ... }
if (user.role === USER_ROLES.MANUFACTURER) { ... }
```

---

### 2. No Magic Numbers

**정의**: 코드 내 리터럴 숫자, 문자열 사용 금지. 모든 값은 의미있는 상수로 정의

**적용 규칙**:
- 숫자 리터럴은 상수로 추출 (0, 1, -1 등 명백한 경우 제외)
- 문자열 리터럴은 상수로 추출
- 시간, 용량, 길이 등 비즈니스 규칙 관련 값은 반드시 상수화

**예시**:

```typescript
// ❌ 잘못된 예
if (files.size > 10485760) { ... }
setTimeout(() => { ... }, 86400000)

// ✅ 올바른 예
import { FILE_SIZE_LIMITS, TIME_LIMITS } from '@/constants/validation'

if (files.size > FILE_SIZE_LIMITS.BUSINESS_LICENSE) { ... } // 10MB
setTimeout(() => { ... }, TIME_LIMITS.RECALL_WINDOW) // 24시간
```

**constants 파일 예시**:

```typescript
// src/constants/validation.ts
export const FILE_SIZE_LIMITS = {
  BUSINESS_LICENSE: 10 * 1024 * 1024, // 10MB
} as const

export const TIME_LIMITS = {
  RECALL_WINDOW: 24 * 60 * 60 * 1000, // 24시간 (ms)
} as const

export const PASSWORD_RULES = {
  MIN_LENGTH: 6,
} as const
```

---

### 3. No 'any' Type

**정의**: TypeScript의 `any` 타입 사용 절대 금지. 타입 안전성 최우선

**적용 규칙**:
- `any` 대신 `unknown` 사용 후 타입 가드로 검증
- 외부 라이브러리 타입 미지원 시에만 예외적으로 `// @ts-ignore` 사용 (주석 필수)
- Supabase Edge Functions에서는 Deno Lint 규칙 준수
- 제네릭 타입 활용으로 타입 안전성 확보

**예시**:

```typescript
// ❌ 잘못된 예
function handleData(data: any) {
  return data.value
}

// ✅ 올바른 예 (unknown + type guard)
function handleData(data: unknown): string {
  if (isValidData(data)) {
    return data.value
  }
  throw new Error('Invalid data format')
}

function isValidData(data: unknown): data is { value: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'value' in data &&
    typeof data.value === 'string'
  )
}

// ✅ 제네릭 활용
function fetchData<T>(url: string): Promise<T> {
  return fetch(url).then(res => res.json())
}
```

**Supabase Edge Functions (Deno)**:

```typescript
// 불가피한 경우만 사용
// deno-lint-ignore no-explicit-any
const externalLibResult: any = someExternalLib()

// 가능한 한 타입 정의
interface SupabaseResponse {
  data: Array<{ id: string; name: string }>
  error: Error | null
}
```

---

### 4. Clean Code

**정의**: 읽기 쉽고 유지보수 가능한 코드 작성

**적용 규칙**:

#### 4.1 의미있는 이름
```typescript
// ❌ 잘못된 예
const d = new Date()
const arr = data.map(x => x.id)
function proc(val: number) { ... }

// ✅ 올바른 예
const currentDate = new Date()
const productIds = products.map(product => product.id)
function calculateTotalQuantity(quantity: number) { ... }
```

#### 4.2 함수는 한 가지 일만
```typescript
// ❌ 잘못된 예
function processOrder(order: Order) {
  // 재고 확인
  const stock = checkStock(order.productId)
  // 재고 차감
  updateStock(order.productId, stock - order.quantity)
  // 주문 생성
  createOrder(order)
  // 이메일 발송
  sendEmail(order.userId)
}

// ✅ 올바른 예
function processOrder(order: Order) {
  validateStock(order)
  deductStock(order)
  createOrderRecord(order)
  notifyUser(order)
}
```

#### 4.3 주석 최소화 (코드 자체가 설명)
```typescript
// ❌ 잘못된 예
// 사용자가 제조사인지 확인
if (user.type === 'MFR') { ... }

// ✅ 올바른 예
const isManufacturer = user.type === USER_TYPES.MANUFACTURER
if (isManufacturer) { ... }
```

#### 4.4 Early Return 패턴
```typescript
// ❌ 잘못된 예
function shipProduct(product: Product) {
  if (product.quantity > 0) {
    if (product.status === 'ACTIVE') {
      // 긴 로직...
    }
  }
}

// ✅ 올바른 예
function shipProduct(product: Product) {
  if (product.quantity === 0) return
  if (product.status !== 'ACTIVE') return

  // 긴 로직...
}
```

---

### 5. Test-Driven Development

**정의**: 모든 비즈니스 로직은 테스트와 함께 개발

**적용 규칙**:
- 단위 테스트: 모든 함수, 유틸리티, 서비스 로직
- 통합 테스트: API 호출, 데이터베이스 상호작용
- E2E 테스트: 핵심 사용자 플로우

**테스트 작성 원칙**:
```typescript
// 테스트 파일명: {파일명}.test.ts

describe('FIFO Algorithm', () => {
  it('should allocate oldest lot first', () => {
    // Given: 테스트 데이터 준비
    const lots = [
      { id: 1, manufactureDate: '2024-01-01', quantity: 100 },
      { id: 2, manufactureDate: '2024-01-15', quantity: 50 },
    ]

    // When: 함수 실행
    const result = allocateVirtualCodes(lots, 30)

    // Then: 결과 검증
    expect(result).toHaveLength(30)
    expect(result.every(code => code.lotId === 1)).toBe(true)
  })
})
```

**테스트 커버리지 목표**:
- 비즈니스 로직: 90% 이상
- UI 컴포넌트: 70% 이상
- 전체: 80% 이상

---

### 6. Git Conventional Commits

**정의**: 일관된 커밋 메시지 작성으로 이력 추적 용이

**커밋 메시지 형식**:
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types**:
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 파일 수정
- `refactor`: 코드 리팩토링 (기능 변경 없음)
- `style`: 코드 포맷팅 (세미콜론, 들여쓰기 등)
- `perf`: 성능 개선

**Scope 예시**:
- `auth`, `db`, `ui`, `manufacturer`, `distributor`, `hospital`, `admin`
- `product`, `lot`, `inventory`, `virtual-code`, `constants`

**예시**:
```bash
git commit -m "feat(auth): 로그인 페이지 구현"
git commit -m "fix(inventory): FIFO 로직에서 Lot 정렬 오류 수정"
git commit -m "test(product): 제품 CRUD 테스트 추가"
git commit -m "docs(phase-1): 데이터베이스 ERD 문서 작성"
git commit -m "chore(setup): ESLint 규칙 추가"
```

**커밋 주기**:
- 최소 작업 단위 완료 시마다 커밋
- 하나의 커밋은 하나의 논리적 변경사항
- 테스트 통과 확인 후 커밋
- 커밋 후 즉시 push (협업 시)

---

### 7. Frontend-First Development

**정의**: UI를 먼저 개발하여 가시적 확인 후 백엔드 로직 구현

**개발 순서**:
1. **UI 컴포넌트 작성** (Mock 데이터 사용)
2. **UI 동작 확인** (사용자 플로우 검증)
3. **API 서비스 연결** (실제 데이터 연동)
4. **비즈니스 로직 구현** (백엔드/Edge Functions)
5. **통합 테스트**

**예시 (제품 목록 개발)**:

```typescript
// 1단계: UI 컴포넌트 (Mock 데이터)
const MOCK_PRODUCTS = [
  { id: '1', name: 'PDO Thread A', udi_di: 'UDI-001' },
  { id: '2', name: 'PDO Thread B', udi_di: 'UDI-002' },
]

function ProductList() {
  return (
    <div>
      {MOCK_PRODUCTS.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

// 2단계: 실제 데이터 연동
function ProductList() {
  const { data: products } = useProducts() // TanStack Query

  return (
    <div>
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

---

### 8. Complete Task Execution (시간 무관 철저한 작업 진행)

**정의**: 작업 소요 시간에 무관하게 요청된 작업 범위를 100% 완료

**적용 규칙**:
- 작업 시간이 오래 걸려도 요청 범위 100% 완료
- 파일 수가 많아도 전체 수정 완료
- 작업 범위를 임의로 축소하지 않음

**예시**:

```typescript
// ❌ 잘못된 행동
사용자: "35개 파일에 원칙 추가"
Claude: "시간이 오래 걸려서 10개만 했습니다"

// ✅ 올바른 행동
사용자: "35개 파일에 원칙 추가"
Claude: 35개 파일 모두 완료
```

---

### 9. Context Memory Alert (Context 메모리 부족 시 알림)

**정의**: Context 메모리 부족 예상 시 사용자에게 알림

**적용 규칙**:
- 대규모 작업 전 Context 메모리 상태 평가
- 부족 예상 시 사용자에게 알림
- 사용자가 메모리 확보 또는 새 세션 진행 결정

**알림 템플릿**:

```
⚠️ Context Memory Alert

현재 작업은 Context 메모리가 부족할 수 있습니다.

옵션:
1. 새 세션에서 진행 (권장)
2. 현재 세션 계속 진행

어떻게 진행하시겠습니까?
```

---

## 📋 Phase별 체크리스트

각 Phase 작업 시 다음 항목을 모두 확인하고 완료해야 합니다:

### 개발 전
- [ ] Phase 계획 문서 읽기
- [ ] 필요한 타입 정의 확인
- [ ] 필요한 상수 정의 확인
- [ ] 선행 작업 완료 확인
- [ ] 작업 범위 및 메모리 사용량 평가 (원칙 9)

### 개발 중
- [ ] SSOT 원칙 준수 (constants 사용)
- [ ] Magic numbers 없음
- [ ] `any` 타입 사용 안 함
- [ ] Clean Code 원칙 준수
- [ ] 의미있는 변수/함수명
- [ ] 주석 최소화 (코드 자체가 설명)
- [ ] 작업 범위 100% 완료 (원칙 8)
- [ ] Context 메모리 모니터링 (원칙 9)

### 개발 후
- [ ] 테스트 작성 및 통과
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 에러 없음
- [ ] 코드 리뷰 (Self-review)
- [ ] Git commit (Conventional Commits)
- [ ] Git push
- [ ] Phase 계획 문서의 완료 기준 충족

---

## 🚫 금지 사항

1. **절대 하지 말아야 할 것**:
   - 민감 정보 커밋 (.env 파일, API 키 등)
   - `any` 타입 사용
   - Magic numbers/strings
   - 테스트 없이 배포
   - Linter 에러 무시

2. **가능한 피해야 할 것**:
   - 100줄 이상의 함수
   - 3단계 이상의 중첩 if문
   - 긴 파라미터 목록 (5개 이상)
   - 주석으로 코드 설명 (코드를 명확하게)

---

## 🎓 학습 자료

- [Clean Code by Robert Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [React Best Practices](https://react.dev/learn)

---

## 📞 문의

원칙 관련 질문이나 예외 상황 발생 시:
- 이메일: rabbit92carrot@gmail.com
- GitHub Issues: https://github.com/rabbit92carrot/neo-certify-20251120ver/issues

---

**마지막 업데이트**: 2025-11-21
**버전**: 2.0.0
