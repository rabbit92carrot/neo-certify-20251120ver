# Phase 0.5: Constants 시스템 구축

## 📋 개요

**목표**: SSOT 원칙에 따른 전역 상수 시스템 완성
**선행 조건**: Phase 0.4 (폴더 구조 생성) 완료
**예상 소요 시간**: 2-3시간

---

## 🎯 개발 원칙 준수 체크리스트

- [x] SSOT: 모든 상수를 constants/에 집중
- [x] No Magic Numbers: 모든 리터럴 값 제거
- [x] No 'any' type: as const로 타입 안전성
- [x] Clean Code: 명확한 네이밍
- [ ] 테스트 작성: Constants 값 검증 테스트
- [ ] Git commit: 파일별 커밋

---

## 📦 작업 내용

### 1. 상태값 상수 (status.ts)

**src/constants/status.ts**:
```typescript
// Virtual Code 상태
export const VIRTUAL_CODE_STATUS = {
  IN_STOCK: 'IN_STOCK',
  PENDING: 'PENDING',
  USED: 'USED',
  DISPOSED: 'DISPOSED',
} as const

export type VirtualCodeStatus = typeof VIRTUAL_CODE_STATUS[keyof typeof VIRTUAL_CODE_STATUS]

// Organization 상태
export const ORGANIZATION_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DELETED: 'DELETED',
} as const

export type OrganizationStatus = typeof ORGANIZATION_STATUS[keyof typeof ORGANIZATION_STATUS]

// Organization 유형
export const ORGANIZATION_TYPE = {
  MANUFACTURER: 'MANUFACTURER',
  DISTRIBUTOR: 'DISTRIBUTOR',
  HOSPITAL: 'HOSPITAL',
} as const

export type OrganizationType = typeof ORGANIZATION_TYPE[keyof typeof ORGANIZATION_TYPE]

// Return Request 상태
export const RETURN_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type ReturnStatus = typeof RETURN_STATUS[keyof typeof RETURN_STATUS]

// Notification 유형
export const NOTIFICATION_TYPE = {
  AUTHENTICATION: 'AUTHENTICATION', // 인증 발급
  RECALL: 'RECALL', // 회수
} as const

export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE]

// History Action 유형
export const HISTORY_ACTION = {
  PRODUCTION: 'PRODUCTION', // 생산
  SHIPMENT: 'SHIPMENT', // 출고
  RECEIVE: 'RECEIVE', // 입고
  TREATMENT: 'TREATMENT', // 시술
  RECALL: 'RECALL', // 회수
  RETURN: 'RETURN', // 반품
  DISPOSE: 'DISPOSE', // 폐기
} as const

export type HistoryAction = typeof HISTORY_ACTION[keyof typeof HISTORY_ACTION]
```

### 2. 역할 및 권한 (roles.ts)

**src/constants/roles.ts**:
```typescript
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANUFACTURER: 'MANUFACTURER',
  DISTRIBUTOR: 'DISTRIBUTOR',
  HOSPITAL: 'HOSPITAL',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// 역할별 접근 가능 경로 (Phase 2에서 사용)
export const ROLE_ROUTES = {
  [USER_ROLES.ADMIN]: ['/admin'],
  [USER_ROLES.MANUFACTURER]: ['/manufacturer'],
  [USER_ROLES.DISTRIBUTOR]: ['/distributor'],
  [USER_ROLES.HOSPITAL]: ['/hospital'],
} as const
```

### 3. 경로 상수 (routes.ts)

**src/constants/routes.ts**:
```typescript
export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Manufacturer
  MANUFACTURER: {
    DASHBOARD: '/manufacturer/dashboard',
    PRODUCTS: '/manufacturer/products',
    PRODUCTION: '/manufacturer/production',
    SHIPMENT: '/manufacturer/shipment',
    INVENTORY: '/manufacturer/inventory',
    HISTORY: '/manufacturer/history',
    SETTINGS: '/manufacturer/settings',
  },

  // Distributor
  DISTRIBUTOR: {
    DASHBOARD: '/distributor/dashboard',
    RECEIVING: '/distributor/receiving',
    SHIPMENT: '/distributor/shipment',
    INVENTORY: '/distributor/inventory',
    HISTORY: '/distributor/history',
  },

  // Hospital
  HOSPITAL: {
    DASHBOARD: '/hospital/dashboard',
    TREATMENT: '/hospital/treatment',
    INVENTORY: '/hospital/inventory',
    HISTORY: '/hospital/history',
    RETURN: '/hospital/return',
  },

  // Admin
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    ORGANIZATIONS: '/admin/organizations',
    USERS: '/admin/users',
    APPROVALS: '/admin/approvals',
    HISTORY: '/admin/history',
    RECALLS: '/admin/recalls',
  },

  // Mock
  MOCK: {
    KAKAOTALK: '/mock/kakao',
  },
} as const
```

### 4. 메시지 상수 (messages.ts)

**src/constants/messages.ts**:
```typescript
// 에러 메시지
export const ERROR_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  UNAUTHORIZED: '해당 기능에 대한 접근 권한이 없습니다.',

  // Validation
  REQUIRED_FIELD: '{field}을(를) 입력해주세요.',
  INVALID_FORMAT: '{field} 형식이 올바르지 않습니다.',
  INVALID_BUSINESS_NUMBER: '사업자등록번호 형식이 올바르지 않습니다.',

  // Inventory
  INSUFFICIENT_STOCK: '재고가 부족합니다. 현재 재고: {stock}개',
  EXCEED_STOCK: '보유 수량을 초과할 수 없습니다. 현재 재고: {stock}개',

  // Recall
  RECALL_TIME_EXCEEDED: '24시간 경과하여 처리할 수 없습니다. 관리자에게 연락해주세요.',

  // File
  FILE_SIZE_EXCEEDED: '파일 크기는 10MB를 초과할 수 없습니다.',
  INVALID_FILE_TYPE: 'PDF, JPG, PNG 파일만 업로드 가능합니다.',

  // Data
  DUPLICATE_DATA: '이미 등록된 {item}입니다.',
  NOT_FOUND: '{item}을(를) 찾을 수 없습니다.',

  // Transaction
  CANCEL_ONLY_PENDING: 'pending 상태에서만 출고를 취소할 수 있습니다.',

  // Server
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
} as const

// 성공 메시지
export const SUCCESS_MESSAGES = {
  CREATED: '{item}이(가) 등록되었습니다.',
  UPDATED: '{item}이(가) 수정되었습니다.',
  DELETED: '{item}이(가) 삭제되었습니다.',
  SAVED: '저장되었습니다.',
  SENT: '전송되었습니다.',
} as const

// 확인 메시지
export const CONFIRM_MESSAGES = {
  DELETE: '{item}을(를) 삭제하시겠습니까?',
  CANCEL: '취소하시겠습니까? 작성 중인 내용이 사라집니다.',
  SUBMIT: '제출하시겠습니까?',
  APPROVE: '승인하시겠습니까?',
  REJECT: '거부하시겠습니까?',
} as const

// 메시지 템플릿 치환 함수
export const formatMessage = (template: string, params: Record<string, string | number>): string => {
  return Object.entries(params).reduce(
    (msg, [key, value]) => msg.replace(`{${key}}`, String(value)),
    template
  )
}
```

### 5. 검증 규칙 (validation.ts)

**src/constants/validation.ts**:
```typescript
// 파일 크기 제한
export const FILE_SIZE_LIMITS = {
  BUSINESS_LICENSE: 10 * 1024 * 1024, // 10MB
} as const

// 시간 제한
export const TIME_LIMITS = {
  RECALL_WINDOW: 24 * 60 * 60 * 1000, // 24시간 (밀리초)
} as const

// 비밀번호 규칙
export const PASSWORD_RULES = {
  MIN_LENGTH: 6,
} as const

// 정규식
export const REGEX = {
  // 사업자등록번호: 000-00-00000
  BUSINESS_NUMBER: /^\d{3}-\d{2}-\d{5}$/,

  // 전화번호: 010-0000-0000 (입력 시)
  PHONE_INPUT: /^01[0-9]-\d{3,4}-\d{4}$/,

  // 전화번호 정규화: 01000000000 (저장 시)
  PHONE_NORMALIZED: /^01[0-9]\d{7,8}$/,

  // 이메일
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Lot 번호 (기본): ND + 5자리 + yymmdd
  LOT_NUMBER_DEFAULT: /^ND\d{5}\d{6}$/,
} as const

// 허용 파일 확장자
export const ALLOWED_FILE_TYPES = {
  BUSINESS_LICENSE: ['.pdf', '.jpg', '.jpeg', '.png'],
} as const

// 페이지네이션
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  INFINITE_SCROLL_THRESHOLD: 0.8, // 스크롤 80% 도달 시 다음 페이지
} as const

// 수량 제한
export const QUANTITY_LIMITS = {
  MIN: 1,
  MAX: 1000000,
} as const

// Lot 설정 제한
export const LOT_SETTINGS = {
  MODEL_DIGITS: {
    MIN: 3,
    MAX: 10,
  },
  EXPIRY_MONTHS: {
    STEP: 6, // 6개월 단위
    MIN: 6,
    MAX: 36,
  },
} as const

// 날짜 형식
export const DATE_FORMATS = {
  DISPLAY: 'yyyy-MM-dd HH:mm',
  DATE_ONLY: 'yyyy-MM-dd',
  LOT_DATE_DEFAULT: 'yyMMdd',
} as const
```

### 6. 중앙 Export (index.ts)

**src/constants/index.ts**:
```typescript
// Status
export * from './status'

// Roles
export * from './roles'

// Routes
export * from './routes'

// Messages
export * from './messages'

// Validation
export * from './validation'

// 편의를 위한 그룹 export
export { VIRTUAL_CODE_STATUS, ORGANIZATION_STATUS, ORGANIZATION_TYPE } from './status'
export { USER_ROLES } from './roles'
export { ROUTES } from './routes'
export { ERROR_MESSAGES, SUCCESS_MESSAGES, CONFIRM_MESSAGES, formatMessage } from './messages'
export { REGEX, FILE_SIZE_LIMITS, TIME_LIMITS, PASSWORD_RULES } from './validation'
```

### 7. 테스트 작성

**src/constants/validation.test.ts**:
```typescript
import { describe, it, expect } from 'vitest'
import { REGEX, FILE_SIZE_LIMITS, TIME_LIMITS } from './validation'

describe('Validation Constants', () => {
  describe('REGEX', () => {
    it('should validate business number format', () => {
      expect('123-45-67890').toMatch(REGEX.BUSINESS_NUMBER)
      expect('1234567890').not.toMatch(REGEX.BUSINESS_NUMBER)
    })

    it('should validate phone number format', () => {
      expect('010-1234-5678').toMatch(REGEX.PHONE_INPUT)
      expect('01012345678').toMatch(REGEX.PHONE_NORMALIZED)
    })

    it('should validate email format', () => {
      expect('test@example.com').toMatch(REGEX.EMAIL)
      expect('invalid-email').not.toMatch(REGEX.EMAIL)
    })
  })

  describe('Limits', () => {
    it('should have correct file size limit', () => {
      expect(FILE_SIZE_LIMITS.BUSINESS_LICENSE).toBe(10 * 1024 * 1024)
    })

    it('should have 24 hour recall window', () => {
      expect(TIME_LIMITS.RECALL_WINDOW).toBe(24 * 60 * 60 * 1000)
    })
  })
})
```

**src/constants/messages.test.ts**:
```typescript
import { describe, it, expect } from 'vitest'
import { formatMessage, ERROR_MESSAGES } from './messages'

describe('Message Formatting', () => {
  it('should replace placeholders correctly', () => {
    const result = formatMessage('현재 재고: {stock}개', { stock: 10 })
    expect(result).toBe('현재 재고: 10개')
  })

  it('should handle multiple placeholders', () => {
    const result = formatMessage('{field}이(가) {action}되었습니다.', {
      field: '제품',
      action: '등록',
    })
    expect(result).toBe('제품이(가) 등록되었습니다.')
  })
})
```

---

## 📝 TypeScript 타입 정의

타입은 각 constants 파일에 함께 정의됨 (위 참조)

---

## 🔧 Constants 정의

모든 파일이 Constants 정의임

---

## 📁 생성/수정 파일 목록

**생성**:
- `src/constants/status.ts`
- `src/constants/roles.ts`
- `src/constants/routes.ts`
- `src/constants/messages.ts`
- `src/constants/validation.ts`
- `src/constants/index.ts`
- `src/constants/validation.test.ts`
- `src/constants/messages.test.ts`

---

## ✅ 테스트 요구사항

```bash
# Constants 테스트 실행
npm run test -- src/constants

# 전체 테스트
npm run test
```

**예상 결과**:
- ✅ 정규식 검증 테스트 통과
- ✅ 메시지 포맷팅 테스트 통과
- ✅ TypeScript 타입 에러 없음

---

## 🔄 Git Commit

```bash
git add src/constants/status.ts src/constants/roles.ts
git commit -m "feat(constants): Add status and role constants"

git add src/constants/routes.ts
git commit -m "feat(constants): Add route constants"

git add src/constants/messages.ts
git commit -m "feat(constants): Add message constants with formatter"

git add src/constants/validation.ts
git commit -m "feat(constants): Add validation rules and regex"

git add src/constants/index.ts
git commit -m "feat(constants): Add central constants export"

git add src/constants/*.test.ts
git commit -m "test(constants): Add constants validation tests"
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] 모든 상태값 상수 정의
- [ ] 모든 메시지 상수 정의
- [ ] 모든 검증 규칙 정의
- [ ] 경로 상수 정의
- [ ] 중앙 export 설정
- [ ] 테스트 작성 및 통과
- [ ] TypeScript 타입 에러 없음
- [ ] Git commit 완료 (6개)
- [ ] Phase 0 전체 완료

---

## 🔗 참고 자료

- [TypeScript const assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)
- [SSOT Pattern](https://en.wikipedia.org/wiki/Single_source_of_truth)

---

## ⏭️ 다음 단계

**Phase 0 완료!**

다음: [Phase 1.1 - 데이터베이스 설계](../phase-1/phase-1.1-db-design.md)

**Phase 1 시작 전 확인사항**:
- [ ] Phase 0.1-0.5 모든 작업 완료
- [ ] Git repository push 완료
- [ ] 개발 서버 정상 실행
- [ ] 테스트 전체 통과
