# Phase 2: 인증 및 UI 프레임워크

## 📋 개요

**목표**: 로그인/회원가입 + 역할별 레이아웃 완성
**기간**: 4-6일
**완료 상태**: ⏳ 문서화 진행 중

---

## 🎯 개발 원칙 (Development Principles)

이 Phase 작업 시 다음 9가지 개발 원칙을 준수해야 합니다:

### 핵심 원칙
1. **SSOT**: 모든 상수는 `src/constants/`에 정의
2. **No Magic Numbers**: 리터럴 값 금지
3. **No 'any' Type**: TypeScript strict mode
4. **Clean Code**: 명확한 네이밍, 단일 책임
5. **Test-Driven**: 테스트 작성 필수 (커버리지 80%+)
6. **Conventional Commits**: `<type>(<scope>): <subject>`
7. **Frontend-First**: UI 먼저, 백엔드 나중
8. **Complete Task Execution**: 시간 무관 작업 범위 100% 완료 ⭐
9. **Context Memory Alert**: 메모리 부족 시 사용자 알림 ⭐

### 이 Phase 중점 원칙
- **원칙 3 (No any)**: Supabase Auth 타입 안전성 - User, Session 타입 완벽 정의
- **원칙 4 (Clean Code)**: AuthContext 로직 분리 - useAuth hook으로 간결화
- **원칙 7 (Frontend-First)**: UI 먼저 Mock 인증으로 플로우 검증

**상세 내용**: [DEVELOPMENT_PRINCIPLES.md](../../DEVELOPMENT_PRINCIPLES.md)

---

## ✅ 일관성 체크리스트

이 Phase 구현 시 다음 사항을 반드시 확인:

- [ ] **TERMINOLOGY 상수 사용**: 모든 UI 텍스트는 `@/constants/terminology` import
- [ ] **하드코딩 금지**: 한글/영문 텍스트 직접 입력 없음
- [ ] **표준 import 패턴**:
  ```typescript
  import { TERMINOLOGY, VALIDATION, ERROR_MESSAGES } from '@/constants'
  ```
- [ ] **'any' 타입 미사용**: 모든 타입 명시적 정의
- [ ] **PRD 용어 준수**: TERMINOLOGY 상수와 PRD 용어 일치 확인

---

## 세부 계획 (5개 유닛)

- **[Phase 2.1](phase-2.1-auth-setup.md)**: Supabase Auth 통합 및 AuthContext 구현
- **[Phase 2.2](phase-2.2-login-ui.md)**: 로그인 페이지 UI 구현
- **[Phase 2.3](phase-2.3-registration-ui.md)**: 회원가입 페이지 UI 구현
- **[Phase 2.4](phase-2.4-layout-navigation.md)**: 역할별 레이아웃 및 네비게이션
- **[Phase 2.5](phase-2.5-role-routing.md)**: Protected Routes 및 역할 기반 라우팅

---

## 주요 기능

### 1. 인증 시스템
- Supabase Auth 통합
- 이메일/비밀번호 로그인
- 세션 관리 (persistent)
- **30분 비활성 시 자동 로그아웃** ⭐

### 2. 회원가입 플로우
```
1. 역할 선택 (제조사/유통사/병원)
   ↓
2. 조직 조회 (사업자등록번호)
   - 존재: 가입 요청
   - 미존재: 조직 등록
   ↓
3. 사용자 정보 입력
   ↓
4. ⭐ Phase 2: 조직 상태 즉시 ACTIVE (관리자 승인 우회)
   (Phase 6 이후: 승인 대기 organization.status = PENDING_APPROVAL)
   ↓
5. 로그인 가능 (Phase 2에서는 즉시 로그인 가능)
```

> **Phase 2 승인 정책**: 회원가입 시 조직 상태를 `ACTIVE`로 설정하여 즉시 로그인 가능합니다.
> Phase 6에서 관리자 승인 워크플로우 활성화 시, `PENDING_APPROVAL` 상태로 변경하고
> 로그인 시 승인 상태 체크 로직을 활성화합니다.

### 3. 역할별 레이아웃

#### 제조사
- Dashboard
- 제품 관리
- Lot 생산
- 출고
- 재고
- 이력
- 설정

#### 유통사
- Dashboard
- Pending 목록 (입고 대기)
- 출고
- 재고
- 이력

#### 병원
- Dashboard
- 시술 등록
- 회수
- 반품
- 재고
- 이력

#### 관리자
- Dashboard
- 조직/사용자 관리
- 승인 관리
- 전체 이력 조회
- 회수 모니터링

---

## 기술 스택

### Auth
- **Supabase Auth**: 이메일/비밀번호 인증
- **React Context**: 전역 인증 상태 관리
- **TanStack Query**: User profile fetching

### Forms
- **React Hook Form**: 폼 상태 관리
- **Zod**: 스키마 검증
- **Constants**: 에러 메시지 (SSOT)

### UI
- **shadcn/ui**: Button, Input, Card, Select, Label, Form components
- **Tailwind CSS**: Styling
- **Lucide Icons**: 아이콘

### Routing
- **React Router v6**: 클라이언트 사이드 라우팅
- **Protected Routes**: 인증/역할 기반 접근 제어
- **Redirect Logic**: 미인증 시 /login으로 리다이렉트

---

## 파일 구조

```
src/
├── contexts/
│   └── AuthContext.tsx         # 인증 상태 관리
├── lib/
│   ├── supabase.ts             # Supabase 클라이언트
│   └── validation.ts           # 폼 검증 유틸리티
├── hooks/
│   ├── useAuth.ts              # Auth hook (from context)
│   └── useUserRole.ts          # 사용자 역할 조회
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx       # 로그인 페이지
│   │   └── RegisterPage.tsx    # 회원가입 페이지
│   ├── manufacturer/           # 제조사 페이지들
│   ├── distributor/            # 유통사 페이지들
│   ├── hospital/               # 병원 페이지들
│   └── admin/                  # 관리자 페이지들
├── components/
│   ├── common/
│   │   ├── BaseLayout.tsx      # 기본 레이아웃
│   │   ├── Sidebar.tsx         # 사이드바
│   │   └── Header.tsx          # 헤더
│   └── auth/
│       ├── ProtectedRoute.tsx  # 인증 필수 라우트
│       └── RoleRoute.tsx       # 역할 기반 라우트
└── App.tsx                     # 라우터 설정
```

---

## 핵심 구현 사항

### 1. AuthContext

```typescript
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// Session persistence
useEffect(() => {
  supabase.auth.getSession()
  supabase.auth.onAuthStateChange((event, session) => {
    setSession(session)
    setUser(session?.user)
  })
}, [])
```

### 2. Form Validation

```typescript
const loginSchema = z.object({
  email: z.string().email(ERROR_MESSAGES.INVALID_FORMAT),
  password: z.string().min(PASSWORD_RULES.MIN_LENGTH),
})

const registerSchema = z.object({
  businessNumber: z.string().regex(REGEX.BUSINESS_NUMBER),
  email: z.string().email(),
  password: z.string().min(PASSWORD_RULES.MIN_LENGTH),
  // ...
})
```

### 3. Protected Routes

```typescript
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  const { data: userRole } = useUserRole(user?.id)

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" />
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" />
  }

  return children
}
```

---

## 테스트 요구사항

### Unit Tests

```typescript
describe('AuthContext', () => {
  it('should provide auth state', () => { ... })
  it('should handle sign in', () => { ... })
  it('should handle sign out', () => { ... })
})

describe('LoginPage', () => {
  it('should validate email format', () => { ... })
  it('should validate password length', () => { ... })
  it('should redirect after successful login', () => { ... })
})
```

### Integration Tests

```typescript
describe('Registration Flow', () => {
  it('should complete registration for new organization', () => { ... })
  it('should request to join existing organization', () => { ... })
  it('should upload business license file', () => { ... })
})
```

---

## 완료 기준

- ⏳ Supabase Auth 클라이언트 설정
- ⏳ AuthContext 및 useAuth hook 구현
- ⏳ 로그인 페이지 UI 완성 (shadcn/ui)
- ⏳ 회원가입 페이지 UI 완성 (multi-step form)
- ⏳ 역할별 레이아웃 컴포넌트 완성
- ⏳ Protected Routes 구현
- ⏳ 역할 기반 라우팅 설정
- ⏳ 모든 테스트 통과
- ⏳ Git commit (각 Phase별 커밋)

---

## Git Commit 이력 (예상)

```
feat(auth): Setup Supabase Auth client and AuthContext
feat(auth): Implement login page with form validation
feat(auth): Implement registration page with org lookup
feat(layout): Create role-based layout components
feat(routing): Setup protected routes and role-based routing
test(auth): Add auth flow integration tests
```

---

---

## 🔐 Phase 1 RLS 정책 검증 (필수 사전 작업)

Phase 2 시작 전, Phase 1의 **30개 RLS 정책**이 올바르게 설정되었는지 검증합니다.

### 1. Helper Functions 확인 (2개)

Supabase SQL Editor에서 실행:

```sql
-- ✅ auth.user_organization_id() 존재 확인
SELECT auth.user_organization_id();

-- ✅ auth.is_admin() 존재 확인
SELECT auth.is_admin();
```

두 함수가 에러 없이 실행되어야 합니다.

---

### 2. Table RLS 정책 확인

**테스트 계정 생성 후 아래 쿼리 실행**:

#### 2.1 Users Table (본인 프로필 조회)
```sql
-- ✅ 본인 프로필 조회 가능
SELECT * FROM users WHERE id = auth.uid();
-- 예상: 1 row 반환

-- ❌ 다른 조직 사용자 조회 불가
SELECT * FROM users WHERE organization_id != auth.user_organization_id();
-- 예상: 0 rows 반환 (또는 에러)
```

#### 2.2 Organizations Table (본인 조직 조회)
```sql
-- ✅ 본인 조직 조회 가능
SELECT * FROM organizations WHERE id = auth.user_organization_id();
-- 예상: 1 row 반환

-- ❌ 다른 조직 조회 불가 (admin 아닌 경우)
SELECT * FROM organizations WHERE id != auth.user_organization_id();
-- 예상: 0 rows 반환
```

#### 2.3 Products Table (본인 조직 제품 조회)
```sql
-- ✅ 본인 조직 제품 조회 가능
SELECT * FROM products WHERE organization_id = auth.user_organization_id();
-- 예상: 0+ rows 반환 (데이터 없을 수 있음)
```

#### 2.4 Virtual Codes Table (PENDING 접근 확인)
```sql
-- ✅ 본인 소유 virtual_code 조회
SELECT * FROM virtual_codes
WHERE owner_type = 'organization'
  AND owner_id = auth.user_organization_id()::TEXT;

-- ✅ 본인에게 전송 예정인 PENDING virtual_code 조회 (중요!)
SELECT * FROM virtual_codes
WHERE status = 'PENDING'
  AND pending_to = auth.user_organization_id();
```

#### 2.5 History Table (조회만 가능, 수정 불가)
```sql
-- ✅ 본인 관련 히스토리 조회
SELECT * FROM history
WHERE from_owner_id = auth.user_organization_id()::TEXT
   OR to_owner_id = auth.user_organization_id()::TEXT;

-- ❌ 히스토리 수정 시도 (실패해야 함)
UPDATE history SET action = 'TEST' WHERE id = 'any-id';
-- 예상: 에러 또는 0 rows updated
```

---

### 3. Storage RLS 정책 확인 (business-licenses bucket)

#### 3.1 파일 업로드 테스트
```typescript
// ✅ 본인 조직 폴더에 업로드 가능
const { data, error } = await supabase.storage
  .from('business-licenses')
  .upload(`${organizationId}/${Date.now()}_test.pdf`, file)

// 예상: error = null, data 반환
```

#### 3.2 다른 조직 폴더 업로드 시도
```typescript
// ❌ 다른 조직 폴더에 업로드 불가
const { error } = await supabase.storage
  .from('business-licenses')
  .upload(`other-org-id/${Date.now()}_test.pdf`, file)

// 예상: error = "new row violates row-level security policy"
```

---

### 4. RLS 정책 검증 체크리스트

Phase 2 시작 전, 아래 항목을 모두 확인하세요:

- [ ] Helper 함수 2개 존재 확인 (`auth.user_organization_id()`, `auth.is_admin()`)
- [ ] 일반 사용자: 본인 프로필 조회 가능
- [ ] 일반 사용자: 본인 조직 정보 조회 가능
- [ ] 일반 사용자: 다른 조직 데이터 조회 불가
- [ ] 일반 사용자: PENDING virtual_code 조회 가능 (pending_to가 본인 조직인 경우)
- [ ] 일반 사용자: history 테이블 수정 불가 (조회만 가능)
- [ ] 일반 사용자: business-licenses 본인 폴더 업로드 가능
- [ ] 일반 사용자: business-licenses 다른 조직 폴더 업로드 불가
- [ ] Admin 계정: 모든 조직 데이터 조회 가능
- [ ] Admin 계정: 모든 사용자 데이터 조회 가능

**모든 항목이 통과해야 Phase 2 진행 가능합니다.**

---

## 🔧 관리자 계정 생성 (수동 설정)

관리자 계정은 `organization_id = NULL`이며, 회원가입 페이지로 생성 불가합니다.

### Step 1: Auth 사용자 생성 (Supabase Studio)

```sql
-- Supabase SQL Editor에서 실행
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@neocert.com',
  crypt('admin123', gen_salt('bf')), -- 비밀번호: admin123
  NOW(),
  NOW(),
  NOW()
)
RETURNING id;
```

### Step 2: 사용자 프로필 생성

```sql
-- 1단계에서 반환된 UUID 사용
INSERT INTO public.users (id, email, name, contact, organization_id)
VALUES (
  '[1단계에서 반환된 UUID]',
  'admin@neocert.com',
  '시스템 관리자',
  '010-0000-0000',
  NULL -- ← 관리자는 조직 없음
);
```

### Step 3: 로그인 테스트

- 이메일: `admin@neocert.com`
- 비밀번호: `admin123`
- 예상 리다이렉트: `/admin/dashboard`

---

## 🧪 테스트 데이터 생성 (Phase 2 검증용)

### 테스트 조직 생성 (ACTIVE 상태)

```sql
-- 1. 제조사
INSERT INTO organizations (id, type, business_number, name, representative_name, representative_contact, address, status)
VALUES (
  'org-manufacturer-001',
  'MANUFACTURER',
  '123-45-67890',
  '테스트제조사',
  '홍길동',
  '010-1234-5678',
  '서울시 강남구',
  'ACTIVE' -- ← Phase 2: 즉시 활성화
);

-- 2. 유통사
INSERT INTO organizations (id, type, business_number, name, representative_name, representative_contact, address, status)
VALUES (
  'org-distributor-001',
  'DISTRIBUTOR',
  '234-56-78901',
  '테스트유통사',
  '김유통',
  '010-2345-6789',
  '서울시 서초구',
  'ACTIVE'
);

-- 3. 병원
INSERT INTO organizations (id, type, business_number, name, representative_name, representative_contact, address, status)
VALUES (
  'org-hospital-001',
  'HOSPITAL',
  '345-67-89012',
  '테스트병원',
  '박병원',
  '010-3456-7890',
  '서울시 송파구',
  'ACTIVE'
);
```

### 테스트 계정

**권장**: 회원가입 페이지를 통해 생성

- 제조사: `manufacturer@neocert.com` / `test123`
- 유통사: `distributor@neocert.com` / `test123`
- 병원: `hospital@neocert.com` / `test123`

---

## ✅ Phase 2 완료 검증 체크리스트

Phase 3으로 진행하기 전, 다음을 모두 확인하세요:

### 1. 인증 (Authentication)
- [ ] 회원가입 가능 (제조사/유통사/병원 역할 선택)
- [ ] 사업자등록증 파일 업로드 (<10MB, PDF/JPG/PNG)
- [ ] 가입 후 조직 상태 = `ACTIVE` (즉시 로그인 가능)
- [ ] 로그인 성공 시 해당 역할 대시보드로 리다이렉트
- [ ] 로그아웃 후 `/login`으로 리다이렉트
- [ ] 브라우저 새로고침 후에도 세션 유지
- [ ] **30분 비활성 시 자동 로그아웃** ⭐

### 2. 권한 (Authorization)
- [ ] 제조사: 7개 사이드바 메뉴 표시
- [ ] 제조사: `/manufacturer/dashboard` 접근 가능
- [ ] 제조사: `/distributor/dashboard` 접근 시 "권한 없음" 에러
- [ ] 유통사: `/distributor/dashboard` 접근 가능
- [ ] 병원: `/hospital/dashboard` 접근 가능
- [ ] 관리자 (organization_id = NULL): `/admin/dashboard` 접근 가능
- [ ] 비로그인 상태: `/manufacturer/dashboard` 접근 시 `/login`으로 리다이렉트

### 3. 데이터베이스 검증 (Supabase Studio)
```sql
-- 사용자 및 조직 데이터 확인
SELECT id, email, name, organization_id FROM users; -- 1+ rows
SELECT id, name, type, status FROM organizations; -- 1+ rows, status = 'ACTIVE'

-- 파일 업로드 확인
SELECT name FROM storage.objects WHERE bucket_id = 'business-licenses'; -- 1+ files
```

### 4. RLS 정책 검증
- [ ] 일반 사용자: 본인 프로필 조회 가능
- [ ] 일반 사용자: 본인 조직 정보 조회 가능
- [ ] 일반 사용자: 다른 조직 데이터 조회 불가
- [ ] Admin: 모든 데이터 조회 가능

### 5. 세션 관리
- [ ] **30분 비활성 후 자동 로그아웃** ⭐
- [ ] 마우스 이동/키보드 입력 시 타이머 리셋
- [ ] 로그아웃 시 "세션 만료" 토스트 메시지 표시

### 6. UI/UX
- [ ] 모바일에서 사이드바 오버레이 표시
- [ ] 햄버거 메뉴로 사이드바 토글 가능
- [ ] 아이콘이 모든 메뉴에 표시됨 (ICONS 상수 사용)

### 7. 코드 품질
- [ ] `npm run type-check` 통과 (0 errors)
- [ ] `npm run test` 통과 (Phase 2.1-2.5 모든 테스트 green)
- [ ] 하드코딩 없음 (모든 문자열/숫자 상수 사용)
- [ ] ESLint 경고 없음

---

## 다음 단계

**Phase 2 완료 후**

다음: [Phase 3 - 제조사 기능](../phase-3/)

**작업 내용**:
- 제품 CRUD
- Lot 생산 등록
- 출고 (FIFO + 장바구니)
- 재고 조회
- 이력 추적
