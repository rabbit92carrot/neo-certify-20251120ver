# Phase 8.2: 에러 로깅 및 모니터링

## 1. 개요

### 1.1 목적
- 프로덕션 환경에서 발생하는 에러 추적 및 모니터링
- 사용자 행동 및 성능 데이터 수집
- 에러 발생 시 신속한 대응을 위한 알림 시스템
- 서비스 품질 개선을 위한 데이터 기반 의사결정

### 1.2 범위
- Error Boundary 구현 (React 에러 캡처)
- Sentry 통합 (에러 추적)
- 성능 모니터링 (Core Web Vitals)
- 사용자 행동 추적 (선택적)
- 에러 알림 설정

### 1.3 주요 이해관계자
- **개발자**: 에러 디버깅 및 수정
- **운영팀**: 서비스 모니터링 및 알림 대응
- **프로덕트 매니저**: 사용자 경험 개선

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

## 2. 요구사항 분석

### 2.1 기능 요구사항

#### FR-8.2.1: 에러 추적
- JavaScript 런타임 에러 자동 캡처
- React 컴포넌트 에러 캡처 (Error Boundary)
- API 요청 에러 추적
- Unhandled Promise Rejection 추적
- 에러 발생 시 사용자 컨텍스트 정보 수집 (user ID, role, route)

#### FR-8.2.2: 성능 모니터링
- Core Web Vitals 측정 (LCP, FID, CLS)
- 페이지 로드 시간 추적
- API 응답 시간 측정
- 번들 사이즈 모니터링

#### FR-8.2.3: 사용자 컨텍스트
- 에러 발생 시점의 사용자 정보
- 브라우저 및 OS 정보
- 에러 발생 직전 사용자 행동 (Breadcrumbs)

#### FR-8.2.4: 알림 시스템
- Critical 에러 발생 시 Slack/Email 알림
- 에러 빈도 임계값 설정 (1분에 10건 이상)
- 특정 사용자 그룹 에러 알림

### 2.2 비기능 요구사항

#### NFR-8.2.1: 성능
- 에러 로깅이 앱 성능에 미치는 영향 최소화
- 비동기 에러 전송 (사용자 경험 방해 없음)

#### NFR-8.2.2: 개인정보 보호
- 민감 정보 자동 마스킹 (비밀번호, 토큰)
- GDPR 준수 (사용자 동의 기반 추적)

#### NFR-8.2.3: 확장성
- 대량 에러 발생 시에도 안정적 처리
- 에러 샘플링 (프로덕션에서 모든 에러를 전송하지 않음)

---

## 3. 기술 스택

### 3.1 에러 추적
- **Sentry**: 에러 모니터링 플랫폼
- **@sentry/react**: React 통합
- **@sentry/tracing**: 성능 모니터링

### 3.2 성능 모니터링
- **web-vitals**: Core Web Vitals 측정
- **Sentry Performance**: Transaction 추적

### 3.3 알림
- **Sentry Alerts**: 에러 알림 설정
- **Slack Webhook**: 실시간 알림

---

## 4. Sentry 설정

### 4.1 Sentry 프로젝트 생성

1. [Sentry.io](https://sentry.io/) 계정 생성
2. 새 프로젝트 생성:
   - Platform: React
   - Alert frequency: Alert me on every new issue
3. DSN 복사 (예: `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx`)

### 4.2 환경 변수 추가

**파일**: `.env.example` (업데이트)

```bash
# Error Tracking (Sentry)
VITE_SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1
VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0
```

**파일**: `src/config/env.ts` (업데이트)

```typescript
const envSchema = z.object({
  // ... 기존

  // Sentry
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_SENTRY_ENVIRONMENT: z.enum(['development', 'staging', 'production']).optional(),
  VITE_SENTRY_TRACES_SAMPLE_RATE: z.string().transform(Number).optional(),
  VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: z.string().transform(Number).optional(),
  VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: z.string().transform(Number).optional(),
})
```

### 4.3 패키지 설치

```bash
npm install @sentry/react @sentry/tracing web-vitals
```

---

## 5. Sentry 초기화

### 5.1 Sentry 설정 파일

**파일**: `src/config/sentry.ts`

```typescript
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'
import { env, isProduction, isDevelopment } from './env'
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom'

export function initSentry() {
  // Sentry DSN이 없거나 개발 환경이면 초기화하지 않음
  if (!env.VITE_SENTRY_DSN || isDevelopment) {
    console.log('[Sentry] Skipping initialization (dev mode or no DSN)')
    return
  }

  Sentry.init({
    dsn: env.VITE_SENTRY_DSN,
    environment: env.VITE_SENTRY_ENVIRONMENT || env.VITE_ENVIRONMENT,

    // 성능 모니터링
    integrations: [
      new BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
      new Sentry.Replay({
        maskAllText: true, // 모든 텍스트 마스킹 (개인정보 보호)
        blockAllMedia: true, // 모든 미디어 차단
      }),
    ],

    // 성능 트랜잭션 샘플링 (10% = 0.1)
    tracesSampleRate: env.VITE_SENTRY_TRACES_SAMPLE_RATE || (isProduction ? 0.1 : 1.0),

    // 세션 리플레이 샘플링
    replaysSessionSampleRate: env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || 0.1,
    replaysOnErrorSampleRate: env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || 1.0,

    // 에러 필터링
    beforeSend(event, hint) {
      // 개발 환경에서는 전송하지 않음
      if (isDevelopment) {
        console.log('[Sentry] Event captured (not sent in dev):', event)
        return null
      }

      // 민감 정보 마스킹
      if (event.request) {
        // Authorization 헤더 제거
        if (event.request.headers) {
          delete event.request.headers['Authorization']
        }

        // 쿼리 파라미터에서 토큰 제거
        if (event.request.query_string) {
          event.request.query_string = event.request.query_string.replace(/token=[^&]+/g, 'token=[REDACTED]')
        }
      }

      // 에러 메시지에서 비밀번호 패턴 마스킹
      if (event.message) {
        event.message = event.message.replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
      }

      return event
    },

    // 특정 에러 무시
    ignoreErrors: [
      // 브라우저 확장 프로그램 에러
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // 네트워크 에러 (일시적)
      'NetworkError',
      'Failed to fetch',
      // 사용자 취소
      'AbortError',
    ],

    // 특정 URL 패턴 무시
    denyUrls: [
      // 브라우저 확장 프로그램
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  })

  // 사용자 컨텍스트 설정 (로그인 후 호출)
  console.log('[Sentry] Initialized successfully')
}

// 사용자 정보 설정
export function setSentryUser(user: { id: string; email?: string; role?: string } | null) {
  if (!env.VITE_SENTRY_DSN) return

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    })
  } else {
    Sentry.setUser(null)
  }
}

// 커스텀 에러 캡처
export function captureException(error: Error, context?: Record<string, any>) {
  if (!env.VITE_SENTRY_DSN) {
    console.error('[Sentry] Error captured (not sent - no DSN):', error, context)
    return
  }

  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  })
}

// Breadcrumb 추가
export function addBreadcrumb(message: string, category: string, level: Sentry.SeverityLevel = 'info', data?: Record<string, any>) {
  if (!env.VITE_SENTRY_DSN) return

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}
```

### 5.2 Main 파일에서 초기화

**파일**: `src/main.tsx` (업데이트)

```typescript
import { initSentry } from '@/config/sentry'
import { logger } from '@/utils/logger'

// Sentry 초기화 (앱 시작 전)
initSentry()

logger.info(`Starting ${env.VITE_APP_NAME} v${env.VITE_APP_VERSION}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

---

## 6. Error Boundary 구현

### 6.1 Global Error Boundary

**파일**: `src/components/error/GlobalErrorBoundary.tsx`

```typescript
import React from 'react'
import * as Sentry from '@sentry/react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global Error Boundary caught error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // Sentry에 에러 전송
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onReset: () => void
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const navigate = useNavigate()

  const handleGoHome = () => {
    onReset()
    navigate('/')
  }

  const handleReload = () => {
    onReset()
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 rounded-full p-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">문제가 발생했습니다</h1>
        <p className="text-gray-600 mb-6">
          예상치 못한 오류가 발생했습니다. 문제가 지속되면 관리자에게 문의해주세요.
        </p>

        {error && (
          <div className="bg-gray-100 rounded p-4 mb-6 text-left">
            <p className="text-sm font-mono text-gray-700 break-all">{error.message}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={handleReload} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
          <Button onClick={handleGoHome} className="gap-2">
            <Home className="h-4 w-4" />
            홈으로
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          이 오류는 자동으로 기록되었으며, 개발팀에서 확인 중입니다.
        </p>
      </div>
    </div>
  )
}
```

### 6.2 App에 Error Boundary 적용

**파일**: `src/App.tsx` (업데이트)

```typescript
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary'

function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>{/* 기존 라우트 */}</Routes>
          <EnvironmentBadge />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </GlobalErrorBoundary>
  )
}
```

---

## 7. API 에러 추적

### 7.1 Supabase 에러 인터셉터

**파일**: `src/config/supabase.ts` (업데이트)

```typescript
import { captureException, addBreadcrumb } from './sentry'

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    // ... 기존 설정
  }
)

// Supabase 에러 헬퍼
export function handleSupabaseError(error: any, context: string) {
  if (!error) return

  console.error(`[Supabase Error] ${context}:`, error)

  // Breadcrumb 추가
  addBreadcrumb(`Supabase Error: ${context}`, 'supabase', 'error', {
    errorMessage: error.message,
    errorCode: error.code,
    errorDetails: error.details,
  })

  // Sentry에 에러 전송
  captureException(new Error(`Supabase Error: ${context} - ${error.message}`), {
    supabase: {
      context,
      code: error.code,
      details: error.details,
      hint: error.hint,
    },
  })
}
```

**사용 예시**:

```typescript
// src/features/products/api/useProducts.ts
import { handleSupabaseError } from '@/config/supabase'

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*')

      if (error) {
        handleSupabaseError(error, 'Fetch products')
        throw error
      }

      return data
    },
  })
}
```

### 7.2 TanStack Query 에러 핸들러

**파일**: `src/lib/query-client.ts` (업데이트)

```typescript
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { captureException } from '@/config/sentry'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error('[Query Error]', query.queryKey, error)

      // Sentry에 에러 전송
      captureException(error as Error, {
        queryKey: query.queryKey,
        queryHash: query.queryHash,
      })

      // 사용자에게 토스트 표시
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.')
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, variables, context, mutation) => {
      console.error('[Mutation Error]', mutation.options.mutationKey, error)

      // Sentry에 에러 전송
      captureException(error as Error, {
        mutationKey: mutation.options.mutationKey,
        variables,
      })

      // 사용자에게 토스트 표시
      toast.error('작업 중 오류가 발생했습니다.')
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5분
    },
  },
})
```

---

## 8. 성능 모니터링

### 8.1 Core Web Vitals 측정

**파일**: `src/utils/performance.ts`

```typescript
import { onCLS, onFID, onLCP, onFCP, onTTFB, Metric } from 'web-vitals'
import * as Sentry from '@sentry/react'
import { env } from '@/config/env'
import { logger } from './logger'

export function initPerformanceMonitoring() {
  if (!env.VITE_ENABLE_ANALYTICS) {
    logger.info('[Performance] Monitoring disabled')
    return
  }

  // Core Web Vitals 측정
  onCLS(sendToSentry)
  onFID(sendToSentry)
  onLCP(sendToSentry)
  onFCP(sendToSentry)
  onTTFB(sendToSentry)

  logger.info('[Performance] Monitoring initialized')
}

function sendToSentry(metric: Metric) {
  const { name, value, rating, id } = metric

  logger.debug(`[Performance] ${name}:`, { value, rating })

  // Sentry Transaction으로 전송
  if (env.VITE_SENTRY_DSN) {
    Sentry.captureMessage(`Web Vital: ${name}`, {
      level: rating === 'good' ? 'info' : rating === 'needs-improvement' ? 'warning' : 'error',
      tags: {
        metric: name,
        rating,
      },
      contexts: {
        performance: {
          value,
          rating,
          id,
        },
      },
    })
  }
}

// 페이지 로드 시간 측정
export function measurePageLoad(pageName: string) {
  const startMark = `${pageName}-start`
  const endMark = `${pageName}-end`
  const measureName = `${pageName}-load`

  performance.mark(startMark)

  return () => {
    performance.mark(endMark)
    performance.measure(measureName, startMark, endMark)

    const measure = performance.getEntriesByName(measureName)[0]
    logger.debug(`[Performance] Page load: ${pageName}`, { duration: measure.duration })

    // Sentry에 전송
    if (env.VITE_SENTRY_DSN) {
      const transaction = Sentry.startTransaction({
        name: `Page Load: ${pageName}`,
        op: 'pageload',
      })

      transaction.setMeasurement('page_load_time', measure.duration, 'millisecond')
      transaction.finish()
    }

    // 메모리 정리
    performance.clearMarks(startMark)
    performance.clearMarks(endMark)
    performance.clearMeasures(measureName)
  }
}
```

**파일**: `src/main.tsx` (업데이트)

```typescript
import { initPerformanceMonitoring } from '@/utils/performance'

// Sentry 초기화
initSentry()

// 성능 모니터링 초기화
initPerformanceMonitoring()

// ... 기존 코드
```

### 8.2 페이지별 성능 측정

**파일**: `src/features/products/pages/ProductListPage.tsx` (예시)

```typescript
import { useEffect } from 'react'
import { measurePageLoad } from '@/utils/performance'
import { addBreadcrumb } from '@/config/sentry'

export function ProductListPage() {
  useEffect(() => {
    const endMeasure = measurePageLoad('ProductList')

    // Breadcrumb 추가
    addBreadcrumb('Navigated to Product List', 'navigation', 'info')

    return () => {
      endMeasure()
    }
  }, [])

  // ... 기존 코드
}
```

---

## 9. 사용자 컨텍스트 설정

### 9.1 로그인 후 사용자 정보 설정

**파일**: `src/features/auth/api/useLogin.ts` (업데이트)

```typescript
import { setSentryUser } from '@/config/sentry'

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      // ... 로그인 로직

      return { user, session }
    },
    onSuccess: ({ user }) => {
      // Sentry에 사용자 정보 설정
      setSentryUser({
        id: user.id,
        email: user.email,
        role: user.role,
      })

      // ... 기존 로직
    },
  })
}
```

### 9.2 로그아웃 시 사용자 정보 제거

**파일**: `src/features/auth/api/useLogout.ts` (업데이트)

```typescript
import { setSentryUser } from '@/config/sentry'

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // ... 로그아웃 로직
    },
    onSuccess: () => {
      // Sentry에서 사용자 정보 제거
      setSentryUser(null)

      // ... 기존 로직
    },
  })
}
```

---

## 10. Sentry 알림 설정

### 10.1 Slack 알림 설정

1. **Sentry Dashboard → Settings → Integrations**
2. **Slack 검색 후 Install**
3. **Slack 워크스페이스 선택 후 인증**
4. **채널 선택** (예: `#alerts-production`)

### 10.2 Alert Rule 생성

1. **Sentry Dashboard → Alerts → Create Alert Rule**
2. **Set Conditions**:
   ```
   When: An event is seen
   If: ALL of these conditions are met
     - The issue's level is equal to error or fatal
     - The event's environment is equal to production
   Then: Send a notification to Slack (#alerts-production)
   ```

3. **High Frequency Alert** (추가):
   ```
   When: An event is seen
   If: The issue is seen more than 10 times in 1 minute
   Then: Send a notification to Slack (#alerts-production)
   ```

---

## 11. 테스트 시나리오

### 11.1 Error Boundary 테스트

```typescript
import { render, screen } from '@testing-library/react'
import { GlobalErrorBoundary } from '@/components/error/GlobalErrorBoundary'
import { describe, it, expect, vi } from 'vitest'

function ThrowError() {
  throw new Error('Test error')
}

describe('GlobalErrorBoundary', () => {
  it('에러가 발생하면 Fallback UI를 표시해야 한다', () => {
    // Given: 에러를 발생시키는 컴포넌트
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    // When: Error Boundary로 감싸서 렌더링
    render(
      <GlobalErrorBoundary>
        <ThrowError />
      </GlobalErrorBoundary>
    )

    // Then: Fallback UI가 표시됨
    expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('새로고침 버튼을 클릭하면 페이지가 새로고침되어야 한다', () => {
    // Given: 에러 상태
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {})

    render(
      <GlobalErrorBoundary>
        <ThrowError />
      </GlobalErrorBoundary>
    )

    // When: 새로고침 버튼 클릭
    fireEvent.click(screen.getByText('새로고침'))

    // Then: window.location.reload 호출됨
    expect(reloadSpy).toHaveBeenCalled()

    reloadSpy.mockRestore()
  })
})
```

### 11.2 Sentry 통합 테스트

```typescript
import * as Sentry from '@sentry/react'
import { captureException, setSentryUser } from '@/config/sentry'
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Sentry Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('captureException이 Sentry.captureException을 호출해야 한다', () => {
    // Given: Sentry mock
    const captureSpy = vi.spyOn(Sentry, 'captureException')
    const testError = new Error('Test error')
    const context = { userId: '123' }

    // When: captureException 호출
    captureException(testError, context)

    // Then: Sentry.captureException이 호출됨
    expect(captureSpy).toHaveBeenCalledWith(testError, {
      contexts: {
        custom: context,
      },
    })
  })

  it('setSentryUser가 사용자 정보를 설정해야 한다', () => {
    // Given: Sentry mock
    const setUserSpy = vi.spyOn(Sentry, 'setUser')
    const user = { id: '123', email: 'test@example.com', role: 'manufacturer' }

    // When: setSentryUser 호출
    setSentryUser(user)

    // Then: Sentry.setUser가 호출됨
    expect(setUserSpy).toHaveBeenCalledWith({
      id: '123',
      email: 'test@example.com',
      role: 'manufacturer',
    })
  })

  it('setSentryUser(null)이 사용자 정보를 제거해야 한다', () => {
    // Given: Sentry mock
    const setUserSpy = vi.spyOn(Sentry, 'setUser')

    // When: setSentryUser(null) 호출
    setSentryUser(null)

    // Then: Sentry.setUser(null)이 호출됨
    expect(setUserSpy).toHaveBeenCalledWith(null)
  })
})
```

### 11.3 API 에러 추적 테스트

```typescript
import { handleSupabaseError } from '@/config/supabase'
import { captureException, addBreadcrumb } from '@/config/sentry'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/config/sentry')

describe('Supabase Error Handling', () => {
  it('handleSupabaseError가 Sentry에 에러를 전송해야 한다', () => {
    // Given: Supabase 에러
    const error = {
      message: 'Database error',
      code: '23505',
      details: 'duplicate key value',
    }

    // When: handleSupabaseError 호출
    handleSupabaseError(error, 'Create product')

    // Then: addBreadcrumb과 captureException 호출됨
    expect(addBreadcrumb).toHaveBeenCalledWith(
      'Supabase Error: Create product',
      'supabase',
      'error',
      expect.objectContaining({
        errorMessage: 'Database error',
        errorCode: '23505',
      })
    )

    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        supabase: {
          context: 'Create product',
          code: '23505',
          details: 'duplicate key value',
        },
      })
    )
  })
})
```

### 11.4 성능 모니터링 테스트

```typescript
import { measurePageLoad } from '@/utils/performance'
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Performance Monitoring', () => {
  beforeEach(() => {
    vi.spyOn(performance, 'mark')
    vi.spyOn(performance, 'measure')
    vi.spyOn(performance, 'getEntriesByName').mockReturnValue([{ duration: 1234 }] as any)
  })

  it('measurePageLoad가 성능 측정을 수행해야 한다', () => {
    // Given: 페이지 이름
    const pageName = 'ProductList'

    // When: measurePageLoad 호출 및 종료
    const endMeasure = measurePageLoad(pageName)
    endMeasure()

    // Then: performance API 호출됨
    expect(performance.mark).toHaveBeenCalledWith('ProductList-start')
    expect(performance.mark).toHaveBeenCalledWith('ProductList-end')
    expect(performance.measure).toHaveBeenCalledWith('ProductList-load', 'ProductList-start', 'ProductList-end')
  })
})
```

---

## 12. 트러블슈팅

### 12.1 Sentry에 에러가 전송되지 않음

**증상**:
- 에러가 발생했지만 Sentry Dashboard에 표시되지 않음

**원인**:
- 개발 환경에서 `beforeSend`가 `null`을 반환
- DSN이 설정되지 않음
- 네트워크 차단

**해결**:
```typescript
// src/config/sentry.ts - beforeSend 확인
beforeSend(event) {
  if (isDevelopment) {
    console.log('[Sentry] Event:', event)
    return null // 개발 환경에서는 전송 안 함
  }
  return event
}

// 프로덕션 빌드로 테스트
npm run build
npm run preview
```

### 12.2 Source Maps가 업로드되지 않음

**증상**:
- Sentry에서 에러 스택 트레이스가 minified됨

**원인**:
- Source maps가 Sentry에 업로드되지 않음

**해결**:
```bash
# Sentry CLI 설치
npm install @sentry/vite-plugin --save-dev
```

**파일**: `vite.config.ts` (업데이트)

```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'your-org',
      project: 'neo-certify',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './dist/**',
      },
    }),
  ],
  build: {
    sourcemap: true, // Source maps 생성
  },
})
```

### 12.3 성능 데이터가 수집되지 않음

**증상**:
- Sentry Performance 탭에 데이터 없음

**원인**:
- `tracesSampleRate`가 0으로 설정됨
- BrowserTracing이 초기화되지 않음

**해결**:
```typescript
// src/config/sentry.ts
Sentry.init({
  // ...
  tracesSampleRate: 0.1, // 10% 샘플링 (0.0이 아님)
  integrations: [
    new BrowserTracing({
      // React Router 통합 필수
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(/* ... */),
    }),
  ],
})
```

### 12.4 민감 정보가 Sentry에 전송됨

**증상**:
- Sentry에서 비밀번호, 토큰 등이 보임

**원인**:
- `beforeSend`에서 마스킹 로직 누락

**해결**:
```typescript
// src/config/sentry.ts - beforeSend에서 마스킹 강화
beforeSend(event) {
  // Request data 마스킹
  if (event.request?.data) {
    const data = event.request.data as any
    if (data.password) data.password = '[REDACTED]'
    if (data.token) data.token = '[REDACTED]'
  }

  // Extra data 마스킹
  if (event.extra) {
    Object.keys(event.extra).forEach((key) => {
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
        event.extra![key] = '[REDACTED]'
      }
    })
  }

  return event
}
```

### 12.5 Error Boundary가 에러를 캡처하지 않음

**증상**:
- 에러가 발생했지만 Fallback UI가 표시되지 않고 빈 화면

**원인**:
- 비동기 에러는 Error Boundary가 캡처하지 못함
- Event handler 내부 에러는 캡처되지 않음

**해결**:
```typescript
// 비동기 에러는 수동으로 캡처
async function fetchData() {
  try {
    const data = await api.fetchData()
    return data
  } catch (error) {
    captureException(error as Error)
    throw error // TanStack Query가 처리
  }
}

// Event handler 에러도 수동 캡처
function handleClick() {
  try {
    // ... 로직
  } catch (error) {
    captureException(error as Error)
  }
}
```

---

## 13. Definition of Done

### 13.1 코드 완성도
- [ ] Sentry 설정 파일 `src/config/sentry.ts` 구현 완료
- [ ] `GlobalErrorBoundary` 컴포넌트 구현 완료
- [ ] API 에러 인터셉터 (`handleSupabaseError`) 구현 완료
- [ ] TanStack Query 에러 핸들러 구현 완료
- [ ] 성능 모니터링 (`src/utils/performance.ts`) 구현 완료
- [ ] 사용자 컨텍스트 설정 (로그인/로그아웃) 구현 완료

### 13.2 Sentry 설정
- [ ] Sentry 프로젝트 생성 완료 (개발/프로덕션 환경 분리)
- [ ] DSN 환경 변수 설정 완료
- [ ] Source maps 업로드 설정 완료 (Vite plugin)
- [ ] Slack 알림 통합 완료
- [ ] Alert Rule 2개 이상 생성 완료 (Error level, High frequency)

### 13.3 보안
- [ ] `beforeSend`에서 민감 정보 마스킹 확인 (password, token, Authorization)
- [ ] 개발 환경에서 Sentry 전송 비활성화 확인
- [ ] 사용자 이메일 전송 시 GDPR 준수 확인

### 13.4 테스트
- [ ] Error Boundary 테스트 2개 이상 작성 및 통과
- [ ] Sentry 통합 테스트 3개 이상 작성 및 통과
- [ ] API 에러 추적 테스트 1개 이상 작성 및 통과
- [ ] 성능 모니터링 테스트 1개 이상 작성 및 통과

### 13.5 모니터링
- [ ] 프로덕션에서 에러 발생 시 Sentry에 자동 전송 확인
- [ ] Slack 알림 수신 확인
- [ ] Source maps 적용으로 정확한 스택 트레이스 확인
- [ ] Core Web Vitals 데이터 수집 확인

### 13.6 문서화
- [ ] README에 Sentry 설정 가이드 추가 완료
- [ ] 에러 처리 Best Practice 문서 작성 완료
- [ ] Alert Rule 설정 가이드 문서 작성 완료

### 13.7 성능
- [ ] Sentry 초기화가 앱 시작 시간에 미치는 영향 1초 이하 확인
- [ ] 에러 전송이 비동기로 처리되어 사용자 경험 방해하지 않음 확인
- [ ] `tracesSampleRate` 적절히 설정 (프로덕션 10% 이하)

### 13.8 배포
- [ ] Vercel에 Sentry 환경 변수 설정 완료
- [ ] 프로덕션 배포 후 테스트 에러 발생시켜 Sentry 전송 확인
- [ ] Slack 알림 수신 확인

---

## 14. Git Commit 메시지

### 14.1 Sentry 초기 설정
```bash
git add src/config/sentry.ts src/config/env.ts .env.example package.json
git commit -m "feat(monitoring): Add Sentry error tracking integration

- Initialize Sentry with React and BrowserTracing
- Add environment-based configuration
- Implement beforeSend for sensitive data masking
- Add user context setting functions (setSentryUser)
- Configure error filtering and ignore patterns

Refs: #MONITOR-001"
```

### 14.2 Error Boundary 추가
```bash
git add src/components/error/GlobalErrorBoundary.tsx src/App.tsx
git commit -m "feat(error): Add GlobalErrorBoundary with Sentry integration

- Implement React Error Boundary for component errors
- Add ErrorFallback UI with reload/home buttons
- Capture errors and component stack to Sentry
- Display user-friendly error messages

Refs: #MONITOR-002"
```

### 14.3 API 에러 추적
```bash
git add src/config/supabase.ts src/lib/query-client.ts
git commit -m "feat(monitoring): Add API error tracking for Supabase and TanStack Query

- Implement handleSupabaseError helper with Sentry integration
- Add QueryCache and MutationCache error handlers
- Send breadcrumbs for all API errors
- Display toast notifications on errors

Refs: #MONITOR-003"
```

### 14.4 성능 모니터링
```bash
git add src/utils/performance.ts src/main.tsx package.json
git commit -m "feat(monitoring): Add performance monitoring with Core Web Vitals

- Install web-vitals package
- Measure CLS, FID, LCP, FCP, TTFB
- Send metrics to Sentry with severity levels
- Add measurePageLoad utility for custom page measurements

Refs: #MONITOR-004"
```

### 14.5 사용자 컨텍스트
```bash
git add src/features/auth/api/useLogin.ts src/features/auth/api/useLogout.ts
git commit -m "feat(monitoring): Add user context to Sentry on login/logout

- Set Sentry user on successful login
- Clear Sentry user on logout
- Include user ID, email, and role

Refs: #MONITOR-005"
```

### 14.6 Source Maps 업로드
```bash
git add vite.config.ts package.json
git commit -m "feat(deploy): Add Sentry source maps upload with Vite plugin

- Install @sentry/vite-plugin
- Configure source maps generation in production build
- Auto-upload source maps to Sentry on build

Refs: #MONITOR-006"
```

---

## 15. 참고 자료

### 15.1 공식 문서
- [Sentry React 가이드](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Web Vitals](https://web.dev/vitals/)

### 15.2 모범 사례
- [Error Handling Best Practices](https://www.sentry.io/blog/error-handling-best-practices)
- [Reducing Sentry Costs](https://blog.sentry.io/how-we-reduced-our-sentry-bill-by-90-percent/)

### 15.3 관련 Phase
- **Phase 8.1**: 환경 변수 관리 (Sentry DSN 설정)
- **Phase 8.3**: 성능 최적화 (성능 데이터 기반 개선)
- **Phase 8.4**: 보안 강화 (민감 정보 마스킹)
- **Phase 8.5**: 배포 가이드 (Source maps 업로드)

---

**문서 버전**: 1.0
**최종 수정일**: 2025-01-21
**작성자**: Development Team
**승인자**: Technical Lead
