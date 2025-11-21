# Phase 8.1: 환경 변수 관리

## 1. 개요

### 1.1 목적
- 환경별 설정 분리 (개발/스테이징/프로덕션)
- API 키 및 민감정보 보안 관리
- Supabase 연결 설정 관리
- 배포 환경 최적화

### 1.2 범위
- `.env` 파일 구조 정의
- 환경 변수 타입 정의 및 검증
- Vite 환경 변수 설정
- Supabase 환경별 프로젝트 구성

### 1.3 주요 이해관계자
- **개발자**: 로컬 개발 환경 설정
- **DevOps**: 배포 환경 구성
- **보안 관리자**: 민감정보 관리

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

#### FR-8.1.1: 환경별 설정 분리
- 개발(development), 스테이징(staging), 프로덕션(production) 환경 구분
- 각 환경별 Supabase 프로젝트 URL 및 Anon Key
- 환경별 로깅 레벨 설정

#### FR-8.1.2: 환경 변수 검증
- 필수 환경 변수 누락 시 에러
- 환경 변수 타입 검증 (URL, 문자열, 숫자 등)
- 개발 시점 환경 변수 자동완성 지원 (TypeScript)

#### FR-8.1.3: 보안 관리
- `.env` 파일을 `.gitignore`에 추가
- `.env.example` 템플릿 제공
- 민감정보 암호화 저장 (배포 시)

### 2.2 비기능 요구사항

#### NFR-8.1.1: 보안성
- API 키 노출 방지
- 프론트엔드에서 서버 전용 키 접근 불가

#### NFR-8.1.2: 유지보수성
- 환경 변수 변경 시 재배포 없이 적용 가능
- 명확한 네이밍 컨벤션

#### NFR-8.1.3: 개발 편의성
- TypeScript 타입 안전성
- IDE 자동완성 지원

---

## 3. 기술 스택

### 3.1 프론트엔드
- **Vite**: 환경 변수 처리 (`import.meta.env`)
- **TypeScript**: 환경 변수 타입 정의
- **Zod**: 런타임 환경 변수 검증

### 3.2 백엔드/인프라
- **Supabase**: 환경별 프로젝트 구성
- **Vercel**: 프로덕션 환경 변수 관리

---

## 4. 데이터베이스 설계

### 4.1 환경별 Supabase 프로젝트

#### 개발 환경 (Development)
```
Project Name: neo-certify-dev
URL: https://xxxxx.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 스테이징 환경 (Staging)
```
Project Name: neo-certify-staging
URL: https://yyyyy.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 프로덕션 환경 (Production)
```
Project Name: neo-certify-prod
URL: https://zzzzz.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.2 환경 변수 없음 (설정 전용)

---

## 5. API 설계

### 5.1 환경 변수 접근 인터페이스

**파일**: `src/config/env.ts`

```typescript
import { z } from 'zod'

// 환경 변수 스키마 정의
const envSchema = z.object({
  // Supabase
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase Anon Key is required'),

  // Application
  VITE_APP_NAME: z.string().default('Neo Certificate System'),
  VITE_APP_VERSION: z.string().default('1.0.0'),

  // Environment
  VITE_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),

  // Features
  VITE_ENABLE_ANALYTICS: z.string().transform((val) => val === 'true').default('false'),
  VITE_ENABLE_ERROR_TRACKING: z.string().transform((val) => val === 'true').default('false'),

  // API (optional for future use)
  VITE_API_BASE_URL: z.string().url().optional(),
  VITE_API_TIMEOUT_MS: z.string().transform(Number).default('30000'),
})

export type Env = z.infer<typeof envSchema>

// 환경 변수 검증 및 파싱
function parseEnv(): Env {
  try {
    const parsed = envSchema.parse(import.meta.env)
    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join('\n')
      throw new Error(`Environment validation failed:\n${missingVars}`)
    }
    throw error
  }
}

// 검증된 환경 변수 export
export const env = parseEnv()

// 타입 안전한 환경 변수 접근 헬퍼
export const isProduction = env.VITE_ENVIRONMENT === 'production'
export const isStaging = env.VITE_ENVIRONMENT === 'staging'
export const isDevelopment = env.VITE_ENVIRONMENT === 'development'

// 로깅 레벨
export const LOG_LEVEL = isProduction ? 'error' : isDevelopment ? 'debug' : 'warn'
```

**파일**: `src/config/supabase.ts` (업데이트)

```typescript
import { createClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from '@/types/database'

export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-app-version': env.VITE_APP_VERSION,
        'x-environment': env.VITE_ENVIRONMENT,
      },
    },
  }
)
```

---

## 6. 컴포넌트 설계

### 6.1 환경 정보 표시 컴포넌트

**파일**: `src/components/common/EnvironmentBadge.tsx`

```typescript
import { env, isDevelopment, isStaging } from '@/config/env'

export function EnvironmentBadge() {
  // 프로덕션 환경에서는 표시하지 않음
  if (!isDevelopment && !isStaging) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          isDevelopment
            ? 'bg-blue-500 text-white'
            : isStaging
            ? 'bg-yellow-500 text-black'
            : ''
        }`}
      >
        {env.VITE_ENVIRONMENT.toUpperCase()} | v{env.VITE_APP_VERSION}
      </div>
    </div>
  )
}
```

**파일**: `src/App.tsx` (업데이트)

```typescript
import { EnvironmentBadge } from '@/components/common/EnvironmentBadge'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>{/* 기존 라우트 */}</Routes>
        <EnvironmentBadge />
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}
```

---

## 7. 환경 변수 파일

### 7.1 `.env.example` (템플릿)

**파일**: `.env.example`

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Application Configuration
VITE_APP_NAME=Neo Certificate System
VITE_APP_VERSION=1.0.0

# Environment (development | staging | production)
VITE_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false

# API Configuration (optional)
# VITE_API_BASE_URL=https://api.example.com
# VITE_API_TIMEOUT_MS=30000
```

### 7.2 `.env.development` (로컬 개발)

**파일**: `.env.development`

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Configuration
VITE_APP_NAME=Neo Certificate System (Dev)
VITE_APP_VERSION=1.0.0-dev

# Environment
VITE_ENVIRONMENT=development

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_TRACKING=false
```

### 7.3 `.env.production` (프로덕션)

**파일**: `.env.production`

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://zzzzz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application Configuration
VITE_APP_NAME=Neo Certificate System
VITE_APP_VERSION=1.0.0

# Environment
VITE_ENVIRONMENT=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
```

### 7.4 `.gitignore` (업데이트)

**파일**: `.gitignore`

```bash
# Environment files
.env
.env.local
.env.development.local
.env.staging.local
.env.production.local

# Keep example file
!.env.example
```

---

## 8. Vercel 배포 설정

### 8.1 Vercel 환경 변수 설정

**Vercel Dashboard → Project Settings → Environment Variables**

```
Production Environment:
- VITE_SUPABASE_URL: https://zzzzz.supabase.co
- VITE_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- VITE_ENVIRONMENT: production
- VITE_ENABLE_ANALYTICS: true
- VITE_ENABLE_ERROR_TRACKING: true

Preview Environment (Staging):
- VITE_SUPABASE_URL: https://yyyyy.supabase.co
- VITE_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- VITE_ENVIRONMENT: staging
- VITE_ENABLE_ANALYTICS: false
- VITE_ENABLE_ERROR_TRACKING: true
```

### 8.2 `vercel.json` 설정

**파일**: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "env": {
    "VITE_APP_NAME": "Neo Certificate System",
    "VITE_APP_VERSION": "1.0.0"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

---

## 9. 유틸리티 함수

### 9.1 환경 변수 로깅

**파일**: `src/utils/logger.ts`

```typescript
import { env, LOG_LEVEL, isDevelopment } from '@/config/env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

class Logger {
  private level: LogLevel

  constructor(level: LogLevel = LOG_LEVEL as LogLevel) {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level]
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  }

  // 개발 환경 전용
  devOnly(message: string, ...args: any[]) {
    if (isDevelopment) {
      console.log(`[DEV] ${message}`, ...args)
    }
  }
}

export const logger = new Logger()

// 환경 정보 로깅 (앱 시작 시)
if (isDevelopment) {
  logger.info('Environment Configuration:', {
    name: env.VITE_APP_NAME,
    version: env.VITE_APP_VERSION,
    environment: env.VITE_ENVIRONMENT,
    supabaseUrl: env.VITE_SUPABASE_URL,
    analyticsEnabled: env.VITE_ENABLE_ANALYTICS,
    errorTrackingEnabled: env.VITE_ENABLE_ERROR_TRACKING,
  })
}
```

**파일**: `src/main.tsx` (업데이트)

```typescript
import { logger } from '@/utils/logger'
import { env } from '@/config/env'

// 환경 변수 검증 완료 로그
logger.info(`Starting ${env.VITE_APP_NAME} v${env.VITE_APP_VERSION}`)
logger.info(`Environment: ${env.VITE_ENVIRONMENT}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

---

## 10. 타입 정의

**파일**: `src/types/env.d.ts`

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // Application
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string

  // Environment
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production'

  // Features
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_ERROR_TRACKING: string

  // API
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TIMEOUT_MS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## 11. 테스트 시나리오

### 11.1 환경 변수 검증 테스트

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Environment Configuration', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('필수 환경 변수가 없으면 에러를 발생시켜야 한다', () => {
    // Given: VITE_SUPABASE_URL이 없는 환경
    vi.stubEnv('VITE_SUPABASE_URL', '')

    // When & Then: env.ts를 import하면 에러 발생
    expect(() => {
      require('@/config/env')
    }).toThrow('Environment validation failed')
  })

  it('올바른 환경 변수가 있으면 파싱되어야 한다', () => {
    // Given: 모든 필수 환경 변수 설정
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    vi.stubEnv('VITE_ENVIRONMENT', 'development')

    // When: env를 import
    const { env } = require('@/config/env')

    // Then: 환경 변수가 올바르게 파싱됨
    expect(env.VITE_SUPABASE_URL).toBe('https://test.supabase.co')
    expect(env.VITE_SUPABASE_ANON_KEY).toBe('test-key')
    expect(env.VITE_ENVIRONMENT).toBe('development')
  })

  it('잘못된 URL 형식이면 에러를 발생시켜야 한다', () => {
    // Given: 잘못된 URL
    vi.stubEnv('VITE_SUPABASE_URL', 'not-a-url')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')

    // When & Then: 에러 발생
    expect(() => {
      require('@/config/env')
    }).toThrow('Invalid Supabase URL')
  })

  it('VITE_ENABLE_ANALYTICS가 문자열 "true"이면 boolean true로 변환되어야 한다', () => {
    // Given: "true" 문자열
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')
    vi.stubEnv('VITE_ENABLE_ANALYTICS', 'true')

    // When: env를 import
    const { env } = require('@/config/env')

    // Then: boolean true로 변환됨
    expect(env.VITE_ENABLE_ANALYTICS).toBe(true)
  })
})
```

### 11.2 환경별 동작 테스트

```typescript
describe('Environment-specific Behavior', () => {
  it('개발 환경에서는 EnvironmentBadge가 표시되어야 한다', () => {
    // Given: 개발 환경
    vi.stubEnv('VITE_ENVIRONMENT', 'development')

    // When: EnvironmentBadge 렌더링
    render(<EnvironmentBadge />)

    // Then: 배지가 표시됨
    expect(screen.getByText(/DEVELOPMENT/i)).toBeInTheDocument()
  })

  it('프로덕션 환경에서는 EnvironmentBadge가 표시되지 않아야 한다', () => {
    // Given: 프로덕션 환경
    vi.stubEnv('VITE_ENVIRONMENT', 'production')

    // When: EnvironmentBadge 렌더링
    const { container } = render(<EnvironmentBadge />)

    // Then: 배지가 표시되지 않음
    expect(container.firstChild).toBeNull()
  })

  it('로깅 레벨이 환경에 따라 달라야 한다', () => {
    // Given: 프로덕션 환경
    vi.stubEnv('VITE_ENVIRONMENT', 'production')
    const { LOG_LEVEL } = require('@/config/env')

    // Then: 로깅 레벨이 'error'
    expect(LOG_LEVEL).toBe('error')
  })
})
```

### 11.3 Supabase 연결 테스트

```typescript
describe('Supabase Client Configuration', () => {
  it('환경 변수로부터 Supabase 클라이언트가 생성되어야 한다', () => {
    // Given: 환경 변수 설정
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')

    // When: supabase 클라이언트 import
    const { supabase } = require('@/config/supabase')

    // Then: 클라이언트가 생성됨
    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
  })

  it('Supabase 요청에 커스텀 헤더가 포함되어야 한다', async () => {
    // Given: Supabase 클라이언트
    vi.stubEnv('VITE_APP_VERSION', '1.2.3')
    vi.stubEnv('VITE_ENVIRONMENT', 'staging')
    const { supabase } = require('@/config/supabase')

    // When: API 요청 (목 사용)
    const mockFetch = vi.fn()
    global.fetch = mockFetch

    await supabase.from('organizations').select('*')

    // Then: 커스텀 헤더가 포함됨
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-app-version': '1.2.3',
          'x-environment': 'staging',
        }),
      })
    )
  })
})
```

### 11.4 Logger 테스트

```typescript
describe('Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('로깅 레벨이 "error"이면 debug/info/warn이 출력되지 않아야 한다', () => {
    // Given: 로깅 레벨 'error'
    const logger = new Logger('error')

    // When: 각 레벨로 로깅
    logger.debug('debug message')
    logger.info('info message')
    logger.warn('warn message')
    logger.error('error message')

    // Then: error만 출력됨
    expect(console.debug).not.toHaveBeenCalled()
    expect(console.info).not.toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith('[ERROR] error message')
  })

  it('개발 환경에서만 devOnly 로그가 출력되어야 한다', () => {
    // Given: 개발 환경
    vi.stubEnv('VITE_ENVIRONMENT', 'development')
    const { logger } = require('@/utils/logger')

    // When: devOnly 로그
    logger.devOnly('dev message')

    // Then: 로그 출력됨
    expect(console.log).toHaveBeenCalledWith('[DEV] dev message')
  })
})
```

---

## 12. 트러블슈팅

### 12.1 환경 변수가 undefined

**증상**:
```typescript
console.log(import.meta.env.VITE_SUPABASE_URL) // undefined
```

**원인**:
- `.env` 파일이 프로젝트 루트에 없음
- 환경 변수 이름이 `VITE_` 접두사로 시작하지 않음
- Vite 서버가 환경 변수 변경 전에 시작됨

**해결**:
```bash
# 1. .env 파일이 프로젝트 루트에 있는지 확인
ls -la .env

# 2. 환경 변수 이름이 VITE_ 접두사로 시작하는지 확인
cat .env | grep VITE_

# 3. Vite 서버 재시작
npm run dev
```

### 12.2 Vercel 배포 시 환경 변수 에러

**증상**:
```
Error: Environment validation failed:
VITE_SUPABASE_URL: Required
```

**원인**:
- Vercel Dashboard에서 환경 변수 설정 안 됨
- 환경 변수가 잘못된 환경(Preview/Production)에만 설정됨

**해결**:
1. Vercel Dashboard → Project Settings → Environment Variables
2. 각 환경(Production, Preview, Development)에 환경 변수 추가
3. 재배포

```bash
# 또는 Vercel CLI 사용
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

### 12.3 TypeScript 환경 변수 타입 에러

**증상**:
```typescript
// Property 'VITE_CUSTOM_VAR' does not exist on type 'ImportMetaEnv'
const customVar = import.meta.env.VITE_CUSTOM_VAR
```

**원인**:
- `src/types/env.d.ts`에 새 환경 변수 타입이 추가되지 않음

**해결**:
```typescript
// src/types/env.d.ts
interface ImportMetaEnv {
  // ... 기존
  readonly VITE_CUSTOM_VAR: string // 추가
}
```

### 12.4 Zod 검증 실패

**증상**:
```
Error: Environment validation failed:
VITE_SUPABASE_URL: Invalid url
```

**원인**:
- URL 형식이 잘못됨 (예: `http://localhost` 대신 `https://` 필요)

**해결**:
```typescript
// src/config/env.ts - 개발 환경에서는 http도 허용
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().refine(
    (val) => {
      try {
        new URL(val)
        return true
      } catch {
        return false
      }
    },
    { message: 'Invalid URL format' }
  ),
  // ...
})
```

### 12.5 환경별 설정이 적용되지 않음

**증상**:
- `.env.production` 설정이 프로덕션 빌드에 적용되지 않음

**원인**:
- Vite는 기본적으로 `.env.production`을 `npm run build` 시 자동 로드하지만, Vercel은 자체 환경 변수를 사용

**해결**:
- Vercel 배포 시에는 Vercel Dashboard의 환경 변수를 사용
- 로컬 프로덕션 빌드 테스트 시:

```bash
# .env.production 파일 사용
npm run build

# 또는 명시적으로 지정
VITE_ENVIRONMENT=production npm run build
```

---

## 13. Definition of Done

### 13.1 코드 완성도
- [ ] `.env.example` 템플릿 파일 생성 완료
- [ ] `src/config/env.ts`에 Zod 검증 로직 구현 완료
- [ ] `src/types/env.d.ts`에 TypeScript 타입 정의 완료
- [ ] `src/utils/logger.ts`에 로깅 유틸리티 구현 완료
- [ ] `src/components/common/EnvironmentBadge.tsx` 컴포넌트 구현 완료
- [ ] `.gitignore`에 `.env` 파일 추가 완료
- [ ] `vercel.json` 배포 설정 파일 생성 완료

### 13.2 환경별 설정
- [ ] 개발 환경 `.env.development` 파일 생성 및 Supabase 연결 테스트 완료
- [ ] 스테이징 환경 Supabase 프로젝트 생성 완료 (필요 시)
- [ ] 프로덕션 환경 Supabase 프로젝트 생성 완료
- [ ] Vercel Dashboard에 프로덕션 환경 변수 설정 완료
- [ ] Vercel Preview 환경 변수 설정 완료 (스테이징용)

### 13.3 검증
- [ ] 모든 필수 환경 변수 누락 시 명확한 에러 메시지 출력 확인
- [ ] 잘못된 URL 형식 입력 시 Zod 검증 에러 발생 확인
- [ ] 개발 환경에서 `EnvironmentBadge` 정상 표시 확인
- [ ] 프로덕션 환경에서 `EnvironmentBadge` 미표시 확인
- [ ] 로깅 레벨이 환경별로 올바르게 설정됨 확인 (dev: debug, staging: warn, prod: error)
- [ ] TypeScript에서 환경 변수 자동완성 동작 확인

### 13.4 문서화
- [ ] README에 환경 설정 가이드 추가 완료
- [ ] `.env.example` 파일에 모든 환경 변수 설명 주석 추가 완료
- [ ] Vercel 배포 가이드 문서 작성 완료

### 13.5 테스트
- [ ] 환경 변수 검증 단위 테스트 4개 이상 작성 및 통과
- [ ] 환경별 동작 테스트 3개 이상 작성 및 통과
- [ ] Supabase 연결 테스트 2개 이상 작성 및 통과
- [ ] Logger 테스트 2개 이상 작성 및 통과
- [ ] 모든 테스트 커버리지 80% 이상 달성

### 13.6 보안
- [ ] `.env` 파일이 Git에 커밋되지 않음 확인
- [ ] `.env.example`에 실제 키 값이 포함되지 않음 확인
- [ ] Supabase Anon Key만 프론트엔드에 노출되고, Service Role Key는 노출되지 않음 확인
- [ ] Vercel 환경 변수가 암호화되어 저장됨 확인

### 13.7 성능
- [ ] 환경 변수 파싱이 앱 시작 시 1회만 실행됨 확인
- [ ] 환경 변수 접근 시 추가 오버헤드 없음 확인 (싱글톤 패턴)

### 13.8 배포
- [ ] Vercel 프로덕션 배포 성공 확인
- [ ] 배포된 앱에서 올바른 Supabase 프로젝트 연결 확인
- [ ] 환경 변수 변경 후 재배포 없이 Vercel에서 즉시 적용 확인

---

## 14. Git Commit 메시지

### 14.1 환경 설정 초기 구성
```bash
git add .env.example src/config/env.ts src/types/env.d.ts .gitignore
git commit -m "feat(config): Add environment variable management with Zod validation

- Add .env.example template with all required variables
- Implement env.ts with Zod schema validation
- Add TypeScript types for environment variables
- Update .gitignore to exclude .env files
- Add runtime validation for missing or invalid env vars

Refs: #ENV-001"
```

### 14.2 Logger 유틸리티 추가
```bash
git add src/utils/logger.ts src/main.tsx
git commit -m "feat(utils): Add environment-aware logger utility

- Implement Logger class with level-based filtering
- Add LOG_LEVEL based on environment (dev: debug, prod: error)
- Add devOnly method for development-specific logs
- Log environment config on app start in development mode

Refs: #ENV-002"
```

### 14.3 환경 배지 컴포넌트 추가
```bash
git add src/components/common/EnvironmentBadge.tsx src/App.tsx
git commit -m "feat(ui): Add EnvironmentBadge component for dev/staging environments

- Display environment and version in bottom-left corner
- Show only in development and staging (hidden in production)
- Add visual distinction (blue for dev, yellow for staging)

Refs: #ENV-003"
```

### 14.4 Supabase 설정 업데이트
```bash
git add src/config/supabase.ts
git commit -m "refactor(config): Update Supabase client with environment variables

- Use env.ts for URL and Anon Key
- Add custom headers (x-app-version, x-environment)
- Enable auto token refresh and session persistence

Refs: #ENV-004"
```

### 14.5 Vercel 배포 설정
```bash
git add vercel.json
git commit -m "feat(deploy): Add Vercel deployment configuration

- Configure build and output settings
- Add security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Set production environment variables

Refs: #ENV-005"
```

### 14.6 테스트 추가
```bash
git add src/config/__tests__/env.test.ts src/utils/__tests__/logger.test.ts
git commit -m "test(config): Add comprehensive environment and logger tests

- Add env validation tests (missing vars, invalid URLs, type conversion)
- Add environment-specific behavior tests
- Add Supabase client configuration tests
- Add logger level filtering tests

Refs: #ENV-006"
```

---

## 15. 참고 자료

### 15.1 공식 문서
- [Vite 환경 변수 가이드](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase 환경 설정](https://supabase.com/docs/guides/getting-started/local-development)
- [Vercel 환경 변수](https://vercel.com/docs/concepts/projects/environment-variables)
- [Zod 문서](https://zod.dev/)

### 15.2 보안 가이드
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App: Config](https://12factor.net/config)

### 15.3 관련 Phase
- **Phase 0.2**: 기술 스택 선정 (Vite, Supabase)
- **Phase 8.2**: 에러 로깅 및 모니터링 (Logger 확장)
- **Phase 8.4**: 보안 강화 (환경 변수 암호화)
- **Phase 8.5**: 배포 가이드 (Vercel 설정)

---

**문서 버전**: 1.0
**최종 수정일**: 2025-01-21
**작성자**: Development Team
**승인자**: Technical Lead
