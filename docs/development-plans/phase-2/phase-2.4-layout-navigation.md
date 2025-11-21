# Phase 2.4: 레이아웃 및 네비게이션

## 📋 개요

**목표**: 역할별 사이드바 및 헤더 컴포넌트 구현
**선행 조건**: Phase 2.3 (회원가입 UI) 완료
**예상 소요 시간**: 4-5시간

이 Phase에서는 애플리케이션의 기본 레이아웃 구조를 구현합니다. 역할별로 다른 메뉴를 표시하는 사이드바, 사용자 정보를 표시하는 헤더, 그리고 반응형 네비게이션을 구현합니다.

---

## 🎯 개발 원칙 준수 체크리스트

- [x] **SSOT**: USER_ROLES, ROUTES 상수 사용
- [x] **No Magic Numbers**: 브레이크포인트, 사이드바 너비 상수화
- [x] **No 'any' Type**: TypeScript strict 타입 사용
- [x] **Clean Code**: 컴포넌트 분리, 명확한 함수명
- [ ] **테스트 작성**: Layout 컴포넌트 테스트
- [ ] **Git commit**: Conventional Commits 형식
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 📦 작업 내용

### 1. BaseLayout 컴포넌트

**src/components/layout/BaseLayout.tsx**:
```typescript
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const SIDEBAR_WIDTH = {
  EXPANDED: 256, // 16rem
  COLLAPSED: 64,  // 4rem
} as const

const BREAKPOINTS = {
  MOBILE: 768, // md breakpoint
} as const

export function BaseLayout() {
  const { user, loading } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return null // ProtectedRoute에서 처리
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - Desktop */}
      <div
        className={cn(
          'hidden border-r border-gray-200 bg-white transition-all duration-300 md:block',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Sidebar - Mobile (Overlay) */}
      {mobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 bg-white md:hidden">
            <Sidebar
              collapsed={false}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

---

### 2. Sidebar 컴포넌트

**src/components/layout/Sidebar.tsx**:
```typescript
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { ORGANIZATION_TYPE } from '@/constants/status'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']
type Organization = Database['public']['Tables']['organizations']['Row']

interface SidebarProps {
  collapsed: boolean
  onToggle?: () => void
  onClose?: () => void
}

// 역할별 메뉴 아이템
const MENU_ITEMS = {
  [ORGANIZATION_TYPE.MANUFACTURER]: [
    { label: '대시보드', path: '/manufacturer/dashboard', icon: '📊' },
    { label: '제품 관리', path: '/manufacturer/products', icon: '📦' },
    { label: '생산 등록', path: '/manufacturer/production', icon: '🏭' },
    { label: '출고', path: '/manufacturer/shipment', icon: '🚚' },
    { label: '재고 조회', path: '/manufacturer/inventory', icon: '📋' },
    { label: '이력 조회', path: '/manufacturer/history', icon: '📜' },
    { label: '설정', path: '/manufacturer/settings', icon: '⚙️' },
  ],
  [ORGANIZATION_TYPE.DISTRIBUTOR]: [
    { label: '대시보드', path: '/distributor/dashboard', icon: '📊' },
    { label: '입고 (Pending)', path: '/distributor/incoming', icon: '📥' },
    { label: '출고', path: '/distributor/shipment', icon: '📤' },
    { label: '재고 조회', path: '/distributor/inventory', icon: '📋' },
    { label: '이력 조회', path: '/distributor/history', icon: '📜' },
  ],
  [ORGANIZATION_TYPE.HOSPITAL]: [
    { label: '대시보드', path: '/hospital/dashboard', icon: '📊' },
    { label: '시술 등록', path: '/hospital/treatment', icon: '💉' },
    { label: '재고 조회', path: '/hospital/inventory', icon: '📋' },
    { label: '이력 조회', path: '/hospital/history', icon: '📜' },
    { label: '반품', path: '/hospital/return', icon: '↩️' },
  ],
  ADMIN: [
    { label: '대시보드', path: '/admin/dashboard', icon: '📊' },
    { label: '조직 관리', path: '/admin/organizations', icon: '🏢' },
    { label: '사용자 관리', path: '/admin/users', icon: '👥' },
    { label: '가입 승인', path: '/admin/approvals', icon: '✅' },
    { label: '전체 이력', path: '/admin/history', icon: '📜' },
    { label: '회수 모니터링', path: '/admin/recall', icon: '⚠️' },
  ],
} as const

export function Sidebar({ collapsed, onToggle, onClose }: SidebarProps) {
  const { user } = useAuth()
  const location = useLocation()

  // 사용자 프로필 및 조직 정보 조회
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      return data as UserProfile & { organization: Organization }
    },
    enabled: !!user,
  })

  // 역할 판단 (관리자는 organization_id가 null)
  const isAdmin = !userProfile?.organization_id
  const organizationType = userProfile?.organization?.type

  // 메뉴 아이템 선택
  const menuItems = isAdmin
    ? MENU_ITEMS.ADMIN
    : organizationType
    ? MENU_ITEMS[organizationType]
    : []

  return (
    <div className="flex h-full flex-col">
      {/* 로고 */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {!collapsed && (
          <Link to="/" className="text-xl font-bold text-gray-900">
            네오인증서
          </Link>
        )}

        {/* Toggle Button (Desktop) */}
        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="hidden md:flex"
          >
            {collapsed ? '→' : '←'}
          </Button>
        )}

        {/* Close Button (Mobile) */}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="md:hidden"
          >
            ✕
          </Button>
        )}
      </div>

      {/* 메뉴 아이템 */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                  onClick={onClose} // 모바일에서 클릭 시 사이드바 닫기
                >
                  <span className="text-lg">{item.icon}</span>
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 조직 정보 (하단) */}
      {!collapsed && userProfile?.organization && (
        <div className="border-t border-gray-200 p-4">
          <div className="text-xs text-gray-500">조직</div>
          <div className="mt-1 text-sm font-medium text-gray-900">
            {userProfile.organization.name}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### 3. Header 컴포넌트

**src/components/layout/Header.tsx**:
```typescript
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { SUCCESS_MESSAGES } from '@/constants/messages'
import type { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  // 사용자 프로필 조회
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      return data as UserProfile
    },
    enabled: !!user,
  })

  const handleSignOut = async () => {
    try {
      await signOut()

      toast({
        title: SUCCESS_MESSAGES.AUTH.SIGNOUT_SUCCESS,
      })

      navigate('/auth/login')
    } catch (error) {
      toast({
        title: '로그아웃 실패',
        description: error instanceof Error ? error.message : '다시 시도해주세요.',
        variant: 'destructive',
      })
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      {/* 모바일 메뉴 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onMenuClick}
        className="md:hidden"
      >
        ☰
      </Button>

      {/* 페이지 제목 (선택 사항) */}
      <div className="flex-1" />

      {/* 사용자 메뉴 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden text-left md:block">
              <div className="text-sm font-medium">{userProfile?.name}</div>
              <div className="text-xs text-gray-500">{userProfile?.email}</div>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{userProfile?.name}</span>
              <span className="text-xs font-normal text-gray-500">
                {userProfile?.email}
              </span>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => navigate('/profile')}>
            ⚙️ 내 정보 수정
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
            🚪 로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
```

---

## 📝 TypeScript 타입 정의

타입은 Database 스키마에서 추론됩니다:

```typescript
// UserProfile with organization
type UserWithOrganization = UserProfile & {
  organization: Organization
}
```

---

## 🔧 Constants 정의

**src/constants/layout.ts** (생성):
```typescript
export const SIDEBAR_WIDTH = {
  EXPANDED: 256, // 16rem
  COLLAPSED: 64,  // 4rem
} as const

export const BREAKPOINTS = {
  MOBILE: 768, // md breakpoint
  TABLET: 1024, // lg breakpoint
  DESKTOP: 1280, // xl breakpoint
} as const

export const HEADER_HEIGHT = 64 // 4rem
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `src/components/layout/BaseLayout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`
- `src/constants/layout.ts`

---

## ✅ 테스트 요구사항

### 1. Sidebar 컴포넌트 테스트

**tests/components/layout/Sidebar.test.tsx**:
```typescript
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from '@/components/layout/Sidebar'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

const renderSidebar = (props = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Sidebar collapsed={false} {...props} />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Sidebar', () => {
  it('renders logo when not collapsed', () => {
    renderSidebar()
    expect(screen.getByText(/네오인증서/i)).toBeInTheDocument()
  })

  it('does not render logo when collapsed', () => {
    renderSidebar({ collapsed: true })
    expect(screen.queryByText(/네오인증서/i)).not.toBeInTheDocument()
  })

  it('renders menu items for manufacturer', async () => {
    // Mock user profile with manufacturer organization
    vi.mock('@tanstack/react-query', () => ({
      useQuery: () => ({
        data: {
          id: 'user-123',
          organization: {
            type: 'MANUFACTURER',
            name: 'Test Manufacturer',
          },
        },
      }),
    }))

    renderSidebar()

    expect(screen.getByText(/대시보드/i)).toBeInTheDocument()
    expect(screen.getByText(/제품 관리/i)).toBeInTheDocument()
    expect(screen.getByText(/생산 등록/i)).toBeInTheDocument()
  })

  it('calls onToggle when toggle button is clicked', async () => {
    const onToggle = vi.fn()
    renderSidebar({ onToggle })

    const toggleButton = screen.getByRole('button')
    await userEvent.click(toggleButton)

    expect(onToggle).toHaveBeenCalledOnce()
  })
})
```

### 2. 수동 검증 체크리스트

```bash
# 1. 레이아웃 확인
http://localhost:5173/manufacturer/dashboard

# 2. 반응형 확인
# - Desktop (>768px): 사이드바 항상 표시
# - Mobile (<768px): 햄버거 메뉴, 오버레이 사이드바

# 3. 사이드바 토글 확인
# - Desktop: 좌측 토글 버튼 → 사이드바 축소/확장
# - Mobile: 햄버거 메뉴 → 오버레이 사이드바 열림/닫힘

# 4. 역할별 메뉴 확인
# - 제조사: 7개 메뉴 (대시보드, 제품, 생산, 출고, 재고, 이력, 설정)
# - 유통사: 5개 메뉴
# - 병원: 5개 메뉴
# - 관리자: 6개 메뉴

# 5. 사용자 드롭다운 확인
# - 우측 상단 사용자 아이콘 클릭
# - 이름, 이메일 표시
# - "내 정보 수정" 클릭 → 프로필 페이지 이동
# - "로그아웃" 클릭 → 로그인 페이지 이동

# 6. 활성 메뉴 하이라이트 확인
# - 현재 페이지에 해당하는 메뉴 아이템 파란색 배경
```

---

## 🔍 문제 해결 (Troubleshooting)

### 문제 1: shadcn/ui DropdownMenu 컴포넌트 없음

**증상**: `@/components/ui/dropdown-menu` import 에러

**원인**: DropdownMenu 컴포넌트 미설치

**해결**:
```bash
npx shadcn-ui@latest add dropdown-menu
```

---

### 문제 2: 사이드바가 모바일에서 보이지 않음

**증상**: 모바일에서 햄버거 메뉴 클릭 시 반응 없음

**원인**: z-index 설정 오류 또는 상태 관리 오류

**확인**:
```typescript
// BaseLayout에서 mobileSidebarOpen 상태 확인
console.log('mobileSidebarOpen:', mobileSidebarOpen)

// z-index 확인
<div className="fixed inset-y-0 left-0 z-50 ...">
```

---

### 문제 3: 사용자 프로필 조회 실패

**증상**: Header에 사용자 이름이 표시되지 않음

**원인**:
- Users 테이블에 데이터 없음
- RLS 정책 오류

**확인**:
```sql
-- Supabase Studio에서 확인
SELECT * FROM users WHERE id = 'user-id';

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'users';
```

---

### 문제 4: 메뉴 클릭 시 페이지 이동 안 됨

**증상**: 메뉴 아이템 클릭해도 반응 없음

**원인**: 라우터에 경로 미등록

**해결**:
```typescript
// src/routes/index.tsx에 경로 추가
<Route path="/manufacturer/dashboard" element={<ManufacturerDashboard />} />
<Route path="/manufacturer/products" element={<ProductList />} />
// ... 나머지 경로들
```

---

## 🔄 Git Commit

```bash
# 파일 추가
git add src/components/layout/*.tsx src/constants/layout.ts tests/components/layout/Sidebar.test.tsx

# Conventional Commit
git commit -m "feat(ui): Implement base layout with role-based navigation

- Add BaseLayout component with sidebar and header
- Add Sidebar component with role-based menu items
  - Manufacturer: 7 menu items (dashboard, products, production, shipment, inventory, history, settings)
  - Distributor: 5 menu items (dashboard, incoming, shipment, inventory, history)
  - Hospital: 5 menu items (dashboard, treatment, inventory, history, return)
  - Admin: 6 menu items (dashboard, organizations, users, approvals, history, recall)
- Add Header component with user dropdown menu
- Add responsive navigation (desktop sidebar, mobile overlay)
- Add sidebar collapse/expand functionality
- Add active menu item highlighting
- Add layout constants (sidebar width, breakpoints, header height)
- Add Sidebar component tests

Features:
- Desktop: Always visible sidebar with toggle
- Mobile: Hamburger menu with overlay sidebar
- User dropdown: Profile edit, Logout
- Organization info display in sidebar
- Active route highlighting

Tests:
- Sidebar logo rendering test
- Sidebar collapse test
- Role-based menu rendering test
- Toggle button test

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push origin main
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] `src/components/layout/BaseLayout.tsx` 구현 완료
- [ ] `src/components/layout/Sidebar.tsx` 구현 완료 (역할별 메뉴)
- [ ] `src/components/layout/Header.tsx` 구현 완료 (사용자 드롭다운)
- [ ] `src/constants/layout.ts` 상수 정의 완료
- [ ] 반응형 레이아웃 동작 확인 (Desktop/Mobile)
- [ ] 사이드바 토글 기능 동작 확인
- [ ] 모바일 오버레이 사이드바 동작 확인
- [ ] 역할별 메뉴 정상 표시 확인 (4가지 역할)
- [ ] 활성 메뉴 하이라이트 동작 확인
- [ ] 사용자 드롭다운 메뉴 동작 확인
- [ ] 로그아웃 기능 동작 확인
- [ ] Sidebar 컴포넌트 테스트 작성 및 통과 (4개 시나리오)
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 에러 없음
- [ ] 모든 브레이크포인트에서 레이아웃 확인
- [ ] Git commit 완료 (Conventional Commits)
- [ ] Git push 완료
- [ ] 다음 Phase 진행 가능 (Phase 2.5)

---

## 🔗 참고 자료

- [shadcn/ui DropdownMenu](https://ui.shadcn.com/docs/components/dropdown-menu)
- [React Router Outlet](https://reactrouter.com/en/main/components/outlet)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Tailwind CSS Flexbox](https://tailwindcss.com/docs/flex)

---

## ⏭️ 다음 단계

[Phase 2.5 - 역할 기반 라우팅](phase-2.5-role-routing.md)

**작업 내용**:
- ProtectedRoute 컴포넌트 구현
- 역할별 권한 검증
- React Router 설정
- 역할별 리다이렉트 로직
- Unauthorized 페이지
