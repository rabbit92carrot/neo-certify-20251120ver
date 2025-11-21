# Phase 2.1: Supabase Auth 통합

## 📋 개요

**목표**: Supabase Auth 클라이언트 설정 및 AuthContext 구현
**선행 조건**: Phase 1 전체 완료 (데이터베이스, RLS, Storage)
**예상 소요 시간**: 2-3시간

이 Phase에서는 Supabase Auth를 React 애플리케이션에 통합하고, 전역 인증 상태를 관리하는 AuthContext를 구현합니다.

---

## 🎯 개발 원칙 준수 체크리스트

- [x] **SSOT**: 환경 변수는 `src/config/env.ts`에서 단일 관리
- [ ] **No Magic Numbers**: 타임아웃, 재시도 횟수 등 상수화
- [x] **No 'any' Type**: Supabase 제네릭 타입 활용
- [x] **Clean Code**: 명확한 함수명, 에러 처리
- [ ] **테스트 작성**: AuthContext hooks 테스트
- [ ] **Git commit**: Conventional Commits 형식
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 📦 작업 내용

### 1. 환경 변수 설정

**.env.local**:
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**src/config/env.ts**:
```typescript
// 환경 변수 검증 및 export (SSOT)
const getEnvVar = (key: string): string => {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

export const ENV = {
  SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
} as const
```

---

### 2. Supabase 클라이언트 생성

**src/lib/supabase.ts**:
```typescript
import { createClient } from '@supabase/supabase-js'
import { ENV } from '@/config/env'
import type { Database } from '@/types/database'

/**
 * Supabase 클라이언트 (Singleton)
 * - TypeScript Database 타입 자동 추론
 * - RLS 정책 자동 적용
 */
export const supabase = createClient<Database>(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)
```

---

### 3. AuthContext 구현

**src/contexts/AuthContext.tsx**:
```typescript
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ERROR_MESSAGES } from '@/constants/messages'

/**
 * AuthContext 타입 정의
 * - user: 현재 로그인한 사용자 (Supabase Auth User)
 * - session: 현재 세션 정보
 * - loading: 초기 로딩 상태
 * - signIn: 이메일/비밀번호 로그인
 * - signUp: 회원가입
 * - signOut: 로그아웃
 * - resetPassword: 비밀번호 재설정 이메일 발송
 */
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<User>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // 초기 세션 로드 및 Auth 상태 변경 구독
  useEffect(() => {
    // 현재 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Auth 상태 변경 구독 (로그인/로그아웃 감지)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 로그인
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS)
    }
  }, [])

  // 회원가입
  const signUp = useCallback(
    async (email: string, password: string, metadata?: Record<string, unknown>) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.user) {
        throw new Error(ERROR_MESSAGES.AUTH.SIGNUP_FAILED)
      }

      return data.user
    },
    []
  )

  // 로그아웃
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(ERROR_MESSAGES.AUTH.SIGNOUT_FAILED)
    }
  }, [])

  // 비밀번호 재설정 이메일 발송
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      throw new Error(ERROR_MESSAGES.AUTH.PASSWORD_RESET_FAILED)
    }
  }, [])

  // 비밀번호 업데이트
  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      throw new Error(ERROR_MESSAGES.AUTH.PASSWORD_UPDATE_FAILED)
    }
  }, [])

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth Hook
 * - AuthContext를 사용하는 커스텀 훅
 * - AuthProvider 외부에서 사용 시 에러 발생
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
```

---

### 4. App에 AuthProvider 적용

**src/App.tsx**:
```typescript
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppRoutes } from '@/routes'

// TanStack Query 클라이언트 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
```

---

## 📝 TypeScript 타입 정의

**src/types/auth.ts**:
```typescript
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from './database'

// Database에서 users 테이블 타입 추출
export type UserProfile = Database['public']['Tables']['users']['Row']

// 로그인 폼 데이터
export interface LoginFormData {
  email: string
  password: string
}

// 회원가입 폼 데이터
export interface SignupFormData {
  email: string
  password: string
  passwordConfirm: string
  name: string
  contact: string
  department?: string
}

// Auth 상태
export interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
}
```

---

## 🔧 Constants 정의

**src/constants/messages.ts** (추가):
```typescript
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
    SIGNUP_FAILED: '회원가입에 실패했습니다.',
    SIGNOUT_FAILED: '로그아웃에 실패했습니다.',
    PASSWORD_RESET_FAILED: '비밀번호 재설정 이메일 발송에 실패했습니다.',
    PASSWORD_UPDATE_FAILED: '비밀번호 변경에 실패했습니다.',
    SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
    UNAUTHORIZED: '접근 권한이 없습니다.',
  },
  // ... 기존 메시지들
} as const

export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: '로그인 되었습니다.',
    SIGNUP_SUCCESS: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
    SIGNOUT_SUCCESS: '로그아웃 되었습니다.',
    PASSWORD_RESET_EMAIL_SENT: '비밀번호 재설정 이메일이 발송되었습니다.',
    PASSWORD_UPDATE_SUCCESS: '비밀번호가 변경되었습니다.',
  },
  // ... 기존 메시지들
} as const
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `src/config/env.ts`
- `src/lib/supabase.ts`
- `src/contexts/AuthContext.tsx`
- `src/types/auth.ts`

**수정**:
- `src/constants/messages.ts` (AUTH 메시지 추가)
- `src/App.tsx` (AuthProvider 추가)
- `.env.local` (환경 변수 추가)

---

## ✅ 테스트 요구사항

### 1. AuthContext Hook 테스트

**tests/contexts/AuthContext.test.tsx**:
```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Supabase 모킹
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should throw error when used outside AuthProvider', () => {
    // AuthProvider 외부에서 useAuth 호출 시 에러 발생
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within AuthProvider')
  })

  it('should initialize with loading state', async () => {
    // Given: 세션 없음
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    // When: Hook 렌더링
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    // Then: 초기 로딩 상태
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)

    // 세션 로드 후
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('should sign in successfully', async () => {
    // Given: 로그인 성공
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: {} },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // When: 로그인 시도
    await act(async () => {
      await result.current.signIn('test@example.com', 'password123')
    })

    // Then: 로그인 함수 호출 확인
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('should handle sign in error', async () => {
    // Given: 로그인 실패
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // When/Then: 로그인 시도 시 에러 발생
    await expect(
      act(async () => {
        await result.current.signIn('test@example.com', 'wrong-password')
      })
    ).rejects.toThrow()
  })

  it('should sign out successfully', async () => {
    // Given: 로그인 상태
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: 'user-123' } } },
      error: null,
    })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // When: 로그아웃
    await act(async () => {
      await result.current.signOut()
    })

    // Then: 로그아웃 함수 호출 확인
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
```

### 2. 수동 검증 체크리스트

```bash
# 1. 개발 서버 시작
npm run dev

# 2. 브라우저 콘솔에서 Supabase 클라이언트 확인
# 개발자 도구 > Console
window.supabase = await import('/src/lib/supabase')
window.supabase.supabase.auth.getSession()

# 3. 환경 변수 확인
console.log(import.meta.env.VITE_SUPABASE_URL)
# 예상: http://localhost:54321

# 4. AuthContext 확인
# React DevTools > Components > AuthProvider
# 상태: user, session, loading 확인
```

---

## 🔍 문제 해결 (Troubleshooting)

### 문제 1: "Missing environment variable" 에러

**증상**: 앱 시작 시 환경 변수 관련 에러 발생

**원인**:
- `.env.local` 파일 없음
- 환경 변수 이름 오타 (VITE_ 접두사 누락)

**해결**:
```bash
# 1. .env.local 파일 생성
cp .env.example .env.local

# 2. Supabase 로컬 환경 정보 확인
supabase status

# 3. .env.local에 올바른 값 입력
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=[supabase status에서 확인한 anon key]

# 4. 개발 서버 재시작
npm run dev
```

---

### 문제 2: Auth 상태 변경 감지 안 됨

**증상**: 로그인 후에도 user 상태가 null

**원인**:
- `onAuthStateChange` 구독 누락
- AuthProvider가 App 최상위에 없음

**확인**:
```tsx
// App.tsx에서 AuthProvider 위치 확인
function App() {
  return (
    <AuthProvider>  {/* 최상위에 위치해야 함 */}
      <BrowserRouter>
        {/* ... */}
      </BrowserRouter>
    </AuthProvider>
  )
}
```

---

### 문제 3: TypeScript 타입 에러

**증상**: `Database` 타입을 찾을 수 없음

**원인**: TypeScript 타입 파일이 생성되지 않음

**해결**:
```bash
# Phase 1 완료 후 타입 생성
supabase gen types typescript --local > src/types/database.ts

# TypeScript 서버 재시작
# VSCode: Cmd+Shift+P > "TypeScript: Restart TS Server"
```

---

### 문제 4: Session 자동 갱신 안 됨

**증상**: 일정 시간 후 세션 만료

**원인**: `autoRefreshToken` 옵션 미설정

**확인**:
```typescript
// src/lib/supabase.ts
export const supabase = createClient<Database>(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,  // ✅ 자동 갱신 활성화
      persistSession: true,     // ✅ 세션 로컬 스토리지 저장
    },
  }
)
```

---

## 🔄 Git Commit

```bash
# 파일 추가
git add src/config/env.ts src/lib/supabase.ts src/contexts/AuthContext.tsx src/types/auth.ts src/constants/messages.ts src/App.tsx tests/contexts/AuthContext.test.tsx .env.local

# Conventional Commit
git commit -m "feat(auth): Integrate Supabase Auth with AuthContext

- Add environment variable configuration (src/config/env.ts)
- Create Supabase client singleton with Database types
- Implement AuthContext with signIn/signUp/signOut/resetPassword
- Add useAuth custom hook with error handling
- Add AUTH error/success messages to constants
- Integrate AuthProvider in App.tsx
- Add comprehensive AuthContext hook tests
- Add TypeScript auth types

Tests:
- AuthContext hook initialization test
- signIn success/error scenarios
- signOut functionality test
- Provider error boundary test

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push origin main
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] `src/config/env.ts` 생성 및 환경 변수 검증 로직 구현
- [ ] `src/lib/supabase.ts` 생성 및 Database 타입 적용
- [ ] `src/contexts/AuthContext.tsx` 구현 (signIn/signUp/signOut/resetPassword/updatePassword)
- [ ] `src/types/auth.ts` 타입 정의 완료
- [ ] `src/constants/messages.ts`에 AUTH 메시지 추가
- [ ] `src/App.tsx`에 AuthProvider 통합
- [ ] `.env.local` 파일 생성 및 환경 변수 설정
- [ ] AuthContext hook 테스트 작성 및 통과 (5개 시나리오)
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 에러 없음 (`no-explicit-any` 위반 없음)
- [ ] 개발 서버에서 AuthProvider 정상 동작 확인
- [ ] React DevTools에서 AuthContext 상태 확인
- [ ] 브라우저 콘솔에서 Supabase 클라이언트 접근 확인
- [ ] Session 자동 갱신 동작 확인 (1시간 후)
- [ ] Git commit 완료 (Conventional Commits)
- [ ] Git push 완료
- [ ] 다음 Phase 진행 가능 (Phase 2.2)

---

## 🔗 참고 자료

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [React Context API](https://react.dev/reference/react/createContext)
- [Supabase Auth Helpers for React](https://supabase.com/docs/guides/auth/auth-helpers/react)
- [Vitest Testing Library](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

## ⏭️ 다음 단계

[Phase 2.2 - 로그인 UI](phase-2.2-login-ui.md)

**작업 내용**:
- LoginPage 컴포넌트 구현 (React Hook Form + Zod)
- ForgotPasswordPage 구현
- ResetPasswordPage 구현
- shadcn/ui Form 컴포넌트 활용
- 에러 토스트 표시
