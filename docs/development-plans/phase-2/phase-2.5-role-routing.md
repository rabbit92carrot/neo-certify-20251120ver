# Phase 2.5: 역할 기반 라우팅

## 📋 개요

**목표**: Protected Route 및 역할별 권한 검증 구현
**선행 조건**: Phase 2.4 (레이아웃) 완료
**예상 소요 시간**: 3-4시간

이 Phase에서는 역할 기반 접근 제어를 구현합니다. ProtectedRoute 컴포넌트로 인증 및 권한을 검증하고, 역할별로 적절한 대시보드로 리다이렉트하며, React Router를 설정합니다.

---

## 🎯 개발 원칙 준수 체크리스트

- [x] **SSOT**: ROUTES, ORGANIZATION_TYPE 상수 사용
- [x] **No Magic Numbers**: 리다이렉트 경로 상수화
- [x] **No 'any' Type**: TypeScript strict 타입 사용
- [x] **Clean Code**: 명확한 함수명, Early Return 패턴
- [ ] **테스트 작성**: ProtectedRoute 컴포넌트 테스트
- [ ] **Git commit**: Conventional Commits 형식
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 📦 작업 내용

### 1. ProtectedRoute 컴포넌트

**src/components/auth/ProtectedRoute.tsx**:
```typescript
import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ORGANIZATION_TYPE } from '@/constants/status'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationType = typeof ORGANIZATION_TYPE[keyof typeof ORGANIZATION_TYPE]

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: OrganizationType[] | 'ADMIN'[]
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()

  // 사용자 프로필 및 조직 정보 조회
  const {
    data: userProfile,
    isLoading: profileLoading,
    error,
  } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      return data as UserProfile & { organization: Organization | null }
    },
    enabled: !!user,
  })

  // 로딩 중
  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  // 인증되지 않은 사용자 → 로그인 페이지
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // 프로필 조회 실패 → 에러 페이지
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            사용자 정보를 불러올 수 없습니다
          </h2>
          <p className="mt-2 text-gray-600">
            {error instanceof Error ? error.message : '다시 시도해주세요.'}
          </p>
        </div>
      </div>
    )
  }

  // 역할 권한 검증
  if (allowedRoles && userProfile) {
    const isAdmin = !userProfile.organization_id
    const userRole = userProfile.organization?.type

    // 관리자 권한 확인
    if (allowedRoles.includes('ADMIN' as OrganizationType)) {
      if (!isAdmin) {
        return <Navigate to="/unauthorized" replace />
      }
    }
    // 일반 사용자 권한 확인
    else if (userRole && !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  // 인증 및 권한 통과 → 컴포넌트 렌더링
  return <>{children}</>
}
```

---

### 2. 역할별 리다이렉트 Hook

**src/hooks/useRoleRedirect.ts**:
```typescript
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ORGANIZATION_TYPE } from '@/constants/status'
import { ROUTES } from '@/constants/routes'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']

/**
 * 사용자 역할에 따라 적절한 대시보드로 리다이렉트
 */
export function useRoleRedirect() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      return data as UserProfile & { organization: Organization | null }
    },
    enabled: !!user,
  })

  useEffect(() => {
    if (!userProfile) return

    // 관리자
    if (!userProfile.organization_id) {
      navigate(ROUTES.ADMIN.DASHBOARD, { replace: true })
      return
    }

    // 조직 유형에 따라 리다이렉트
    const organizationType = userProfile.organization?.type

    switch (organizationType) {
      case ORGANIZATION_TYPE.MANUFACTURER:
        navigate(ROUTES.MANUFACTURER.DASHBOARD, { replace: true })
        break
      case ORGANIZATION_TYPE.DISTRIBUTOR:
        navigate(ROUTES.DISTRIBUTOR.DASHBOARD, { replace: true })
        break
      case ORGANIZATION_TYPE.HOSPITAL:
        navigate(ROUTES.HOSPITAL.DASHBOARD, { replace: true })
        break
      default:
        navigate('/unauthorized', { replace: true })
    }
  }, [userProfile, navigate])
}
```

---

### 3. Unauthorized 페이지

**src/pages/UnauthorizedPage.tsx**:
```typescript
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">접근 권한 없음</h1>
        <p className="mb-8 text-gray-600">
          이 페이지에 접근할 권한이 없습니다.
          <br />
          관리자에게 문의하거나 올바른 계정으로 로그인해주세요.
        </p>

        <Link to="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    </div>
  )
}
```

---

### 4. React Router 설정

**src/routes/index.tsx**:
```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { BaseLayout } from '@/components/layout/BaseLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { ORGANIZATION_TYPE } from '@/constants/status'

// Placeholder 컴포넌트들 (실제 구현은 Phase 3-6에서)
const ManufacturerDashboard = () => <div>Manufacturer Dashboard</div>
const DistributorDashboard = () => <div>Distributor Dashboard</div>
const HospitalDashboard = () => <div>Hospital Dashboard</div>
const AdminDashboard = () => <div>Admin Dashboard</div>

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes - Manufacturer */}
      <Route
        path="/manufacturer/*"
        element={
          <ProtectedRoute allowedRoles={[ORGANIZATION_TYPE.MANUFACTURER]}>
            <BaseLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<ManufacturerDashboard />} />
        {/* Phase 3에서 추가될 라우트들 */}
        {/* <Route path="products" element={<ProductList />} /> */}
        {/* <Route path="production" element={<ProductionPage />} /> */}
        {/* ... */}
      </Route>

      {/* Protected Routes - Distributor */}
      <Route
        path="/distributor/*"
        element={
          <ProtectedRoute allowedRoles={[ORGANIZATION_TYPE.DISTRIBUTOR]}>
            <BaseLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DistributorDashboard />} />
        {/* Phase 4에서 추가될 라우트들 */}
      </Route>

      {/* Protected Routes - Hospital */}
      <Route
        path="/hospital/*"
        element={
          <ProtectedRoute allowedRoles={[ORGANIZATION_TYPE.HOSPITAL]}>
            <BaseLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<HospitalDashboard />} />
        {/* Phase 5에서 추가될 라우트들 */}
      </Route>

      {/* Protected Routes - Admin */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['ADMIN' as typeof ORGANIZATION_TYPE.MANUFACTURER]}>
            <BaseLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        {/* Phase 6에서 추가될 라우트들 */}
      </Route>

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/auth/login" replace />} />
      <Route path="*" element={<Navigate to="/unauthorized" replace />} />
    </Routes>
  )
}
```

---

## 📝 TypeScript 타입 정의

타입은 기존 Database 스키마에서 추론됩니다.

---

## 🔧 Constants 정의

**src/constants/routes.ts** (생성):
```typescript
export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  MANUFACTURER: {
    DASHBOARD: '/manufacturer/dashboard',
    PRODUCTS: '/manufacturer/products',
    PRODUCTION: '/manufacturer/production',
    SHIPMENT: '/manufacturer/shipment',
    INVENTORY: '/manufacturer/inventory',
    HISTORY: '/manufacturer/history',
    SETTINGS: '/manufacturer/settings',
  },
  DISTRIBUTOR: {
    DASHBOARD: '/distributor/dashboard',
    INCOMING: '/distributor/incoming',
    SHIPMENT: '/distributor/shipment',
    INVENTORY: '/distributor/inventory',
    HISTORY: '/distributor/history',
  },
  HOSPITAL: {
    DASHBOARD: '/hospital/dashboard',
    TREATMENT: '/hospital/treatment',
    INVENTORY: '/hospital/inventory',
    HISTORY: '/hospital/history',
    RETURN: '/hospital/return',
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    ORGANIZATIONS: '/admin/organizations',
    USERS: '/admin/users',
    APPROVALS: '/admin/approvals',
    HISTORY: '/admin/history',
    RECALL: '/admin/recall',
  },
  UNAUTHORIZED: '/unauthorized',
} as const
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `src/components/auth/ProtectedRoute.tsx`
- `src/hooks/useRoleRedirect.ts`
- `src/pages/UnauthorizedPage.tsx`
- `src/routes/index.tsx`
- `src/constants/routes.ts`

**수정**:
- `src/App.tsx` (AppRoutes 사용)

---

## ✅ 테스트 요구사항

### 1. ProtectedRoute 컴포넌트 테스트

**tests/components/auth/ProtectedRoute.test.tsx**:
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ORGANIZATION_TYPE } from '@/constants/status'

const queryClient = new QueryClient()

const TestComponent = () => <div>Protected Content</div>
const LoginPage = () => <div>Login Page</div>
const UnauthorizedPage = () => <div>Unauthorized</div>

const renderProtectedRoute = (
  allowedRoles?: typeof ORGANIZATION_TYPE[keyof typeof ORGANIZATION_TYPE][]
) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute allowedRoles={allowedRoles}>
                  <TestComponent />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to login when user is not authenticated', async () => {
    // Mock: No authenticated user
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({ user: null, loading: false }),
    }))

    renderProtectedRoute()

    await waitFor(() => {
      expect(screen.getByText(/Login Page/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while checking authentication', () => {
    // Mock: Loading state
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({ user: null, loading: true }),
    }))

    renderProtectedRoute()

    expect(screen.getByText(/로딩 중/i)).toBeInTheDocument()
  })

  it('renders protected content for authenticated user with correct role', async () => {
    // Mock: Authenticated manufacturer user
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: { id: 'user-123' },
        loading: false,
      }),
    }))

    vi.mock('@tanstack/react-query', () => ({
      useQuery: () => ({
        data: {
          id: 'user-123',
          organization_id: 'org-123',
          organization: { type: 'MANUFACTURER' },
        },
        isLoading: false,
      }),
    }))

    renderProtectedRoute([ORGANIZATION_TYPE.MANUFACTURER])

    await waitFor(() => {
      expect(screen.getByText(/Protected Content/i)).toBeInTheDocument()
    })
  })

  it('redirects to unauthorized for user with wrong role', async () => {
    // Mock: Distributor trying to access manufacturer route
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: { id: 'user-123' },
        loading: false,
      }),
    }))

    vi.mock('@tanstack/react-query', () => ({
      useQuery: () => ({
        data: {
          id: 'user-123',
          organization_id: 'org-123',
          organization: { type: 'DISTRIBUTOR' },
        },
        isLoading: false,
      }),
    }))

    renderProtectedRoute([ORGANIZATION_TYPE.MANUFACTURER])

    await waitFor(() => {
      expect(screen.getByText(/Unauthorized/i)).toBeInTheDocument()
    })
  })

  it('allows admin to access admin-only routes', async () => {
    // Mock: Admin user (no organization_id)
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: { id: 'admin-123' },
        loading: false,
      }),
    }))

    vi.mock('@tanstack/react-query', () => ({
      useQuery: () => ({
        data: {
          id: 'admin-123',
          organization_id: null,
          organization: null,
        },
        isLoading: false,
      }),
    }))

    renderProtectedRoute(['ADMIN' as typeof ORGANIZATION_TYPE.MANUFACTURER])

    await waitFor(() => {
      expect(screen.getByText(/Protected Content/i)).toBeInTheDocument()
    })
  })
})
```

### 2. 수동 검증 체크리스트

```bash
# 1. 인증되지 않은 사용자 → 로그인 페이지 리다이렉트
http://localhost:5173/manufacturer/dashboard
# 예상: /auth/login으로 리다이렉트

# 2. 로그인 후 역할별 대시보드 접근
# - 제조사 계정 → /manufacturer/dashboard 접근 가능
# - 유통사 계정 → /distributor/dashboard 접근 가능
# - 병원 계정 → /hospital/dashboard 접근 가능
# - 관리자 계정 → /admin/dashboard 접근 가능

# 3. 잘못된 역할로 접근 시 Unauthorized 페이지
# - 제조사 계정으로 /distributor/dashboard 접근
# 예상: /unauthorized 페이지 표시

# 4. 로그인 성공 시 역할별 리다이렉트
# - 제조사 로그인 → /manufacturer/dashboard
# - 유통사 로그인 → /distributor/dashboard
# - 병원 로그인 → /hospital/dashboard
# - 관리자 로그인 → /admin/dashboard

# 5. 존재하지 않는 경로 접근 시
http://localhost:5173/invalid-path
# 예상: /unauthorized 페이지 표시
```

---

## 🔍 문제 해결 (Troubleshooting)

### 문제 1: 무한 리다이렉트 루프

**증상**: 페이지가 계속 로딩되고 리다이렉트가 반복됨

**원인**:
- ProtectedRoute 내부에서 Navigate가 반복 호출됨
- useRoleRedirect가 무한 루프에 빠짐

**해결**:
```typescript
// Navigate에 replace prop 추가
<Navigate to="/auth/login" replace />

// useEffect dependency 확인
useEffect(() => {
  // ...
}, [userProfile, navigate]) // dependency 명시
```

---

### 문제 2: 역할 검증이 작동하지 않음

**증상**: 잘못된 역할로 접근해도 페이지가 표시됨

**원인**:
- RLS 정책 오류로 사용자 프로필 조회 실패
- allowedRoles 타입 불일치

**확인**:
```sql
-- Supabase Studio에서 RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'users';

-- 사용자 프로필 직접 조회
SELECT u.*, o.type
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.id = 'user-id';
```

---

### 문제 3: 관리자 권한 확인 실패

**증상**: 관리자가 admin 라우트에 접근할 수 없음

**원인**: organization_id NULL 확인 로직 오류

**확인**:
```typescript
// ProtectedRoute에서 관리자 판단 로직 확인
const isAdmin = !userProfile?.organization_id // NULL이면 관리자
console.log('isAdmin:', isAdmin, 'organization_id:', userProfile?.organization_id)
```

---

### 문제 4: 로그인 후 리다이렉트 안 됨

**증상**: 로그인 성공 후 빈 화면

**원인**:
- useRoleRedirect hook 미사용
- LoginPage에서 navigate 누락

**해결**:
```typescript
// LoginPage.tsx
const onSubmit = async (data: LoginFormData) => {
  await signIn(data.email, data.password)

  // 로그인 성공 후 리다이렉트 (useRoleRedirect 사용 또는 수동 navigate)
  navigate('/') // 또는 역할별 경로
}
```

---

## 🔄 Git Commit

```bash
# 파일 추가
git add src/components/auth/ProtectedRoute.tsx src/hooks/useRoleRedirect.ts src/pages/UnauthorizedPage.tsx src/routes/index.tsx src/constants/routes.ts tests/components/auth/ProtectedRoute.test.tsx

# Conventional Commit
git commit -m "feat(routing): Implement role-based routing and protected routes

- Add ProtectedRoute component with role verification
  - Authenticate user before rendering
  - Verify user has required role
  - Redirect to login if unauthenticated
  - Redirect to unauthorized if wrong role
- Add useRoleRedirect hook for automatic role-based navigation
  - Manufacturer → /manufacturer/dashboard
  - Distributor → /distributor/dashboard
  - Hospital → /hospital/dashboard
  - Admin → /admin/dashboard
- Add UnauthorizedPage for access denied scenarios
- Add React Router configuration with nested routes
  - Auth routes (public)
  - Manufacturer routes (protected)
  - Distributor routes (protected)
  - Hospital routes (protected)
  - Admin routes (protected)
- Add ROUTES constants for all application paths
- Add comprehensive ProtectedRoute tests

Features:
- Authentication check before route access
- Role-based authorization
- Automatic redirect based on user role
- Loading state during authentication check
- Error handling for profile fetch failures
- Support for admin-only routes (organization_id IS NULL)

Tests:
- Redirect to login when unauthenticated
- Loading state test
- Correct role access test
- Wrong role unauthorized test
- Admin access test

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push origin main
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] `src/components/auth/ProtectedRoute.tsx` 구현 완료
- [ ] `src/hooks/useRoleRedirect.ts` 구현 완료
- [ ] `src/pages/UnauthorizedPage.tsx` 구현 완료
- [ ] `src/routes/index.tsx` 라우터 설정 완료
- [ ] `src/constants/routes.ts` 경로 상수 정의 완료
- [ ] 인증되지 않은 사용자 로그인 페이지 리다이렉트 확인
- [ ] 역할별 권한 검증 동작 확인 (4가지 역할)
- [ ] 잘못된 역할 접근 시 Unauthorized 페이지 표시 확인
- [ ] 로그인 후 역할별 자동 리다이렉트 확인
- [ ] 관리자 전용 라우트 접근 제어 확인
- [ ] ProtectedRoute 컴포넌트 테스트 작성 및 통과 (5개 시나리오)
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 에러 없음
- [ ] 모든 라우트 경로 정상 동작 확인
- [ ] Git commit 완료 (Conventional Commits)
- [ ] Git push 완료
- [ ] **Phase 2 전체 완료!**

---

## 🔗 참고 자료

- [React Router Protected Routes](https://reactrouter.com/en/main/start/tutorial#authentication)
- [React Router Navigate](https://reactrouter.com/en/main/components/navigate)
- [React Router useLocation](https://reactrouter.com/en/main/hooks/use-location)
- [TanStack Query - Dependent Queries](https://tanstack.com/query/latest/docs/react/guides/dependent-queries)

---

## ✔️ Phase 2 전체 완료!

**완료된 작업**:
- ✅ Phase 2.1: Supabase Auth 통합
- ✅ Phase 2.2: 로그인 UI
- ✅ Phase 2.3: 회원가입 UI (다단계 프로세스)
- ✅ Phase 2.4: 레이아웃 및 네비게이션
- ✅ Phase 2.5: 역할 기반 라우팅

**다음 단계**: [Phase 3 - 제조사 기능](../phase-3/README.md)

**Phase 3 개요**:
- 제품 관리 (CRUD)
- Lot 생산 등록
- 출고 (FIFO 알고리즘)
- 재고 조회
- 이력 조회
