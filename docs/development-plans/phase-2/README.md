# Phase 2: 인증 및 UI 프레임워크

## 📋 개요

**목표**: 로그인/회원가입 + 역할별 레이아웃 완성
**기간**: 4-6일
**완료 상태**: ⏳ 문서화 진행 중

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
- 자동 로그아웃 (토큰 만료)

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
4. 승인 대기 (organization.status = PENDING_APPROVAL)
   ↓
5. 관리자 승인 후 로그인 가능
```

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

## 다음 단계

**Phase 2 완료 후**

다음: [Phase 3 - 제조사 기능](../phase-3/)

**작업 내용**:
- 제품 CRUD
- Lot 생산 등록
- 출고 (FIFO + 장바구니)
- 재고 조회
- 이력 추적
