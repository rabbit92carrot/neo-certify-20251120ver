# Phase 2.2: 로그인 UI

## 📋 개요

**목표**: 로그인, 비밀번호 찾기/재설정 페이지 구현
**선행 조건**: Phase 2.1 (Auth 설정) 완료
**예상 소요 시간**: 3-4시간

이 Phase에서는 React Hook Form + Zod를 활용한 로그인 페이지와 비밀번호 관련 페이지를 구현합니다. shadcn/ui 컴포넌트를 사용하여 Supabase 스타일의 깔끔한 UI를 제공합니다.

---

## 🎯 개발 원칙 준수 체크리스트

- [x] **SSOT**: ERROR_MESSAGES, SUCCESS_MESSAGES 상수 사용
- [x] **No Magic Numbers**: PASSWORD_MIN_LENGTH 상수 활용
- [x] **No 'any' Type**: Zod 스키마로 타입 추론
- [x] **Clean Code**: 명확한 함수명, 단일 책임
- [ ] **테스트 작성**: LoginPage 컴포넌트 테스트
- [ ] **Git commit**: Conventional Commits 형식
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 📦 작업 내용

### 1. 로그인 페이지

**src/pages/auth/LoginPage.tsx**:
```typescript
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants/messages'
import { VALIDATION_RULES } from '@/constants/validation'
import { TERMINOLOGY } from '@/constants/terminology' // ⭐ TERMINOLOGY import 추가

// Zod 스키마 (타입 안전성) - 하드코딩 제거 예시
const loginSchema = z.object({
  email: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_FIELD.replace('{field}', '이메일'))
    .email(ERROR_MESSAGES.INVALID_FORMAT.replace('{field}', '이메일')),
  password: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_FIELD.replace('{field}', '비밀번호'))
    .min(
      VALIDATION_RULES.PASSWORD.MIN_LENGTH,
      `비밀번호는 최소 ${VALIDATION_RULES.PASSWORD.MIN_LENGTH}자 이상이어야 합니다.`
    ),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)

    try {
      await signIn(data.email, data.password)

      toast({
        title: SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS,
        variant: 'default',
      })

      // 역할별 리다이렉트는 Phase 2.5에서 구현
      navigate('/dashboard')
    } catch (error) {
      toast({
        title: ERROR_MESSAGES.AUTH.LOGIN_FAILED || '로그인 실패', // 상수 사용
        description: error instanceof Error ? error.message : ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">네오인증서</h1>
          <p className="mt-2 text-sm text-gray-600">
            PDO threads 의료기기 정품 인증 시스템
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="rounded-lg bg-white px-8 py-10 shadow">
          <h2 className="mb-6 text-2xl font-semibold text-gray-900">로그인</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 이메일 */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        autoComplete="email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 비밀번호 */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••"
                        autoComplete="current-password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 비밀번호 찾기 링크 */}
              <div className="flex justify-end">
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>

              {/* 로그인 버튼 */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </Form>

          {/* 회원가입 링크 */}
          <div className="mt-6 text-center text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <Link
              to="/auth/register"
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 2. 비밀번호 찾기 페이지

**src/pages/auth/ForgotPasswordPage.tsx**:
```typescript
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants/messages'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email('올바른 이메일 형식이 아닙니다.'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)

    try {
      await resetPassword(data.email)

      setEmailSent(true)
      toast({
        title: SUCCESS_MESSAGES.AUTH.PASSWORD_RESET_EMAIL_SENT,
        description: '이메일을 확인하여 비밀번호를 재설정해주세요.',
        variant: 'default',
      })
    } catch (error) {
      toast({
        title: '비밀번호 재설정 실패',
        description: error instanceof Error ? error.message : ERROR_MESSAGES.AUTH.PASSWORD_RESET_FAILED,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">네오인증서</h1>
          <p className="mt-2 text-sm text-gray-600">비밀번호 재설정</p>
        </div>

        {/* 폼 */}
        <div className="rounded-lg bg-white px-8 py-10 shadow">
          {emailSent ? (
            // 이메일 발송 성공 메시지
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                이메일이 발송되었습니다
              </h2>
              <p className="mb-6 text-sm text-gray-600">
                {form.getValues('email')}로 비밀번호 재설정 링크를 보냈습니다.
                <br />
                이메일을 확인하여 비밀번호를 변경해주세요.
              </p>
              <Link to="/auth/login">
                <Button className="w-full">로그인으로 돌아가기</Button>
              </Link>
            </div>
          ) : (
            // 비밀번호 재설정 폼
            <>
              <h2 className="mb-6 text-2xl font-semibold text-gray-900">
                비밀번호 찾기
              </h2>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이메일</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            autoComplete="email"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          가입 시 사용한 이메일 주소를 입력해주세요.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? '발송 중...' : '재설정 이메일 보내기'}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center">
                <Link
                  to="/auth/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← 로그인으로 돌아가기
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### 3. 비밀번호 재설정 페이지

**src/pages/auth/ResetPasswordPage.tsx**:
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants/messages'
import { VALIDATION_RULES } from '@/constants/validation'

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        VALIDATION_RULES.PASSWORD.MIN_LENGTH,
        `비밀번호는 최소 ${VALIDATION_RULES.PASSWORD.MIN_LENGTH}자 이상이어야 합니다.`
      ),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { updatePassword } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      passwordConfirm: '',
    },
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)

    try {
      await updatePassword(data.password)

      toast({
        title: SUCCESS_MESSAGES.AUTH.PASSWORD_UPDATE_SUCCESS,
        description: '새로운 비밀번호로 로그인해주세요.',
        variant: 'default',
      })

      // 로그인 페이지로 이동
      navigate('/auth/login')
    } catch (error) {
      toast({
        title: '비밀번호 변경 실패',
        description: error instanceof Error ? error.message : ERROR_MESSAGES.AUTH.PASSWORD_UPDATE_FAILED,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">네오인증서</h1>
          <p className="mt-2 text-sm text-gray-600">새 비밀번호 설정</p>
        </div>

        {/* 폼 */}
        <div className="rounded-lg bg-white px-8 py-10 shadow">
          <h2 className="mb-6 text-2xl font-semibold text-gray-900">
            비밀번호 재설정
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 새 비밀번호 */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>새 비밀번호</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••"
                        autoComplete="new-password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 비밀번호 확인 */}
              <FormField
                control={form.control}
                name="passwordConfirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호 확인</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••"
                        autoComplete="new-password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
```

---

## 📝 TypeScript 타입 정의

타입은 Zod 스키마에서 자동 추론됩니다:

```typescript
// LoginFormData = { email: string; password: string }
type LoginFormData = z.infer<typeof loginSchema>

// ForgotPasswordFormData = { email: string }
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

// ResetPasswordFormData = { password: string; passwordConfirm: string }
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
```

---

## 🔧 Constants 정의

**src/constants/validation.ts** (추가):
```typescript
export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 6,
  },
  // ... 기존 검증 규칙들
} as const
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `src/pages/auth/LoginPage.tsx`
- `src/pages/auth/ForgotPasswordPage.tsx`
- `src/pages/auth/ResetPasswordPage.tsx`

**수정**:
- `src/constants/validation.ts` (PASSWORD 규칙 추가)

---

## ✅ 테스트 요구사항

### 1. LoginPage 컴포넌트 테스트

**tests/pages/auth/LoginPage.test.tsx**:
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AuthProvider } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase')

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with all fields', () => {
    renderLoginPage()

    expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument()
    expect(screen.getByText(/비밀번호를 잊으셨나요?/i)).toBeInTheDocument()
    expect(screen.getByText(/회원가입/i)).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    const submitButton = screen.getByRole('button', { name: /로그인/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/이메일을 입력해주세요/i)).toBeInTheDocument()
      expect(screen.getByText(/비밀번호를 입력해주세요/i)).toBeInTheDocument()
    })
  })

  it('shows email format error for invalid email', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    const emailInput = screen.getByLabelText(/이메일/i)
    await user.type(emailInput, 'invalid-email')

    const submitButton = screen.getByRole('button', { name: /로그인/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/올바른 이메일 형식이 아닙니다/i)).toBeInTheDocument()
    })
  })

  it('calls signIn with correct credentials', async () => {
    const user = userEvent.setup()
    const mockSignIn = vi.fn()

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'user-123' }, session: {} },
      error: null,
    })

    renderLoginPage()

    const emailInput = screen.getByLabelText(/이메일/i)
    const passwordInput = screen.getByLabelText(/비밀번호/i)
    const submitButton = screen.getByRole('button', { name: /로그인/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('shows error toast on login failure', async () => {
    const user = userEvent.setup()

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    })

    renderLoginPage()

    const emailInput = screen.getByLabelText(/이메일/i)
    const passwordInput = screen.getByLabelText(/비밀번호/i)
    const submitButton = screen.getByRole('button', { name: /로그인/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrong-password')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/로그인 실패/i)).toBeInTheDocument()
    })
  })
})
```

### 2. 수동 검증 체크리스트

```bash
# 1. 로그인 페이지 접속
http://localhost:5173/auth/login

# 2. 검증 확인
# - 빈 폼 제출 → 에러 메시지 표시
# - 잘못된 이메일 형식 → "올바른 이메일 형식이 아닙니다" 표시
# - 비밀번호 5자 입력 → "최소 6자 이상" 표시

# 3. 로그인 시도
# - 올바른 자격 증명 → 대시보드로 이동
# - 잘못된 자격 증명 → 토스트 에러 표시

# 4. 비밀번호 찾기
# - "비밀번호를 잊으셨나요?" 클릭
# - 이메일 입력 후 제출
# - 이메일 발송 성공 메시지 확인

# 5. 비밀번호 재설정
# - 이메일 링크 클릭 (수동으로 /auth/reset-password 접속)
# - 새 비밀번호 입력
# - 비밀번호 불일치 → 에러 메시지
# - 성공 → 로그인 페이지로 이동
```

---

## 🔍 문제 해결 (Troubleshooting)

### 문제 1: shadcn/ui Form 컴포넌트 없음

**증상**: `@/components/ui/form` import 에러

**원인**: shadcn/ui Form 컴포넌트 미설치

**해결**:
```bash
# shadcn/ui Form 컴포넌트 설치
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add button
npx shadcn-ui@latest add toast
```

---

### 문제 2: useToast hook 없음

**증상**: `useToast is not defined`

**원인**: Toast 컴포넌트 미설정

**해결**:
```bash
# Toast 컴포넌트 설치
npx shadcn-ui@latest add toast

# App.tsx에 Toaster 추가
import { Toaster } from '@/components/ui/toaster'

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        {/* ... */}
      </QueryClientProvider>
      <Toaster />
    </>
  )
}
```

---

### 문제 3: 비밀번호 재설정 페이지 접근 불가

**증상**: 이메일 링크 클릭 시 404 에러

**원인**: 라우터에 경로 미등록

**해결**:
```typescript
// src/routes/index.tsx
<Route path="/auth/reset-password" element={<ResetPasswordPage />} />
```

---

### 문제 4: Zod 검증 메시지가 한글로 표시 안 됨

**증상**: 영문 메시지 표시

**원인**: Zod 스키마에 커스텀 메시지 미설정

**확인**:
```typescript
// ✅ 커스텀 메시지 사용
z.string().min(1, '이메일을 입력해주세요.')  // 한글 메시지

// ❌ 기본 메시지
z.string().min(1)  // "String must contain at least 1 character(s)"
```

---

## 🔄 Git Commit

```bash
# 파일 추가
git add src/pages/auth/LoginPage.tsx src/pages/auth/ForgotPasswordPage.tsx src/pages/auth/ResetPasswordPage.tsx src/constants/validation.ts tests/pages/auth/LoginPage.test.tsx

# Conventional Commit
git commit -m "feat(auth): Implement login and password reset UI

- Add LoginPage with React Hook Form + Zod validation
- Add ForgotPasswordPage with email sending flow
- Add ResetPasswordPage with password confirmation
- Use shadcn/ui Form, Input, Button components
- Add password validation rules to constants
- Display success/error toasts using useToast hook
- Add comprehensive LoginPage component tests

Tests:
- LoginPage form rendering test
- Empty form validation test
- Invalid email format test
- Login success scenario test
- Login failure toast test

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push origin main
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] `src/pages/auth/LoginPage.tsx` 구현 완료
- [ ] `src/pages/auth/ForgotPasswordPage.tsx` 구현 완료
- [ ] `src/pages/auth/ResetPasswordPage.tsx` 구현 완료
- [ ] `src/constants/validation.ts`에 PASSWORD 규칙 추가
- [ ] Zod 스키마 작성 및 타입 추론 확인
- [ ] React Hook Form 연동 확인
- [ ] shadcn/ui 컴포넌트 설치 및 활용
- [ ] Toast 알림 정상 동작 확인
- [ ] 로그인 성공 시 리다이렉트 동작
- [ ] 비밀번호 찾기 이메일 발송 확인
- [ ] 비밀번호 재설정 성공 확인
- [ ] LoginPage 컴포넌트 테스트 작성 및 통과 (5개 시나리오)
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 에러 없음
- [ ] 반응형 디자인 확인 (모바일/태블릿/데스크톱)
- [ ] Git commit 완료 (Conventional Commits)
- [ ] Git push 완료
- [ ] 다음 Phase 진행 가능 (Phase 2.3)

---

## 🔗 참고 자료

- [React Hook Form 공식 문서](https://react-hook-form.com/)
- [Zod 공식 문서](https://zod.dev/)
- [shadcn/ui Form 컴포넌트](https://ui.shadcn.com/docs/components/form)
- [shadcn/ui Toast 컴포넌트](https://ui.shadcn.com/docs/components/toast)
- [Supabase Auth UI 예제](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)

---

## ⏭️ 다음 단계

[Phase 2.3 - 회원가입 UI](phase-2.3-registration-ui.md)

**작업 내용**:
- RegisterPage 컴포넌트 구현 (다단계 폼)
- 역할 선택 (제조사/유통사/병원)
- 사업자등록번호 조회 로직
- 조직 정보 입력 폼
- 사업자등록증 파일 업로드
- 회원가입 프로세스 완성
