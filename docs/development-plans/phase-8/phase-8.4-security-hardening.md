# Phase 8.4: 보안 강화

## 1. 개요

### 1.1 목적
- 프로덕션 환경에서 보안 취약점 최소화
- OWASP Top 10 보안 위협 방어
- 데이터 무결성 및 기밀성 보장
- 인증/인가 메커니즘 강화
- 보안 모범 사례 준수

### 1.2 범위
- RLS (Row Level Security) 정책 강화
- XSS (Cross-Site Scripting) 방어
- CSRF (Cross-Site Request Forgery) 방어
- SQL Injection 방어
- 입력 검증 및 Sanitization
- 보안 헤더 설정
- Rate Limiting
- 민감 정보 암호화

### 1.3 주요 이해관계자
- **보안 관리자**: 보안 정책 수립 및 감사
- **개발자**: 보안 코드 구현
- **운영팀**: 보안 모니터링 및 대응
- **사용자**: 안전한 서비스 이용

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

#### FR-8.4.1: 인증/인가 강화
- JWT 토큰 만료 시간 관리 (Access: 1시간, Refresh: 7일)
- 비밀번호 정책 강화 (최소 8자, 대소문자/숫자/특수문자 포함)
- 비밀번호 해싱 (bcrypt, 최소 10 rounds)
- 세션 관리 (동시 로그인 제한)

#### FR-8.4.2: 입력 검증
- 모든 사용자 입력에 대한 검증 (Zod)
- XSS 방어를 위한 HTML sanitization
- SQL Injection 방어 (Parameterized queries)
- Path Traversal 방어

#### FR-8.4.3: RLS 정책 강화
- 모든 테이블에 RLS 활성화
- 조직별 데이터 격리 (organization_id 기반)
- Role 기반 접근 제어 (manufacturer, distributor, hospital, admin)
- 삭제 방지 (소프트 삭제)

#### FR-8.4.4: 보안 헤더
- Content-Security-Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security (HSTS)

#### FR-8.4.5: Rate Limiting
- API 요청 제한 (분당 100회)
- 로그인 실패 제한 (5분에 5회)
- 파일 업로드 크기 제한 (10MB)

### 2.2 비기능 요구사항

#### NFR-8.4.1: 보안 표준 준수
- OWASP Top 10 준수
- GDPR 개인정보 보호 준수
- ISO 27001 보안 관리 기준 준수

#### NFR-8.4.2: 감사 로깅
- 모든 인증 이벤트 로깅
- 민감 데이터 접근 로깅
- 로그 변조 방지 (Append-only)

#### NFR-8.4.3: 암호화
- 전송 중 암호화 (HTTPS/TLS 1.3)
- 저장 데이터 암호화 (AES-256)
- 민감 정보 마스킹

---

## 3. 기술 스택

### 3.1 보안 라이브러리
- **Zod**: 입력 검증
- **DOMPurify**: HTML sanitization
- **helmet** (서버): 보안 헤더 설정

### 3.2 Supabase 보안
- **RLS**: Row Level Security
- **JWT**: JSON Web Token 인증
- **Vault**: 민감 정보 암호화 저장

---

## 4. RLS 정책 강화

### 4.1 조직별 데이터 격리 정책

**파일**: `supabase/migrations/20250121000001_enhance_rls_policies.sql`

```sql
-- ============================================
-- PRODUCTS 테이블 RLS 강화
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view products in their organization" ON products;
DROP POLICY IF EXISTS "Manufacturers can insert products" ON products;
DROP POLICY IF EXISTS "Manufacturers can update their products" ON products;

-- 새로운 정책 (더 엄격한 조건)
CREATE POLICY "Users can view products in their organization"
ON products FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Only manufacturers can insert products"
ON products FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND organization_id = products.organization_id
    AND role = 'manufacturer'
  )
);

CREATE POLICY "Only manufacturers can update their own products"
ON products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND organization_id = products.organization_id
    AND role = 'manufacturer'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND organization_id = products.organization_id
    AND role = 'manufacturer'
  )
);

-- 삭제 방지 (소프트 삭제만 허용)
CREATE POLICY "Soft delete only for manufacturers"
ON products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND organization_id = products.organization_id
    AND role = 'manufacturer'
  )
  AND deleted_at IS NULL
)
WITH CHECK (
  deleted_at IS NOT NULL  -- UPDATE 시 deleted_at만 변경 가능
);

-- ============================================
-- SHIPMENTS 테이블 RLS 강화
-- ============================================

-- 발송자 또는 수신자 조직만 조회 가능
CREATE POLICY "Users can view shipments involving their organization"
ON shipments FOR SELECT
USING (
  from_organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  OR to_organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- 발송자만 shipment 생성 가능
CREATE POLICY "Only sender can create shipment"
ON shipments FOR INSERT
WITH CHECK (
  from_organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- 수신자만 status 업데이트 가능 (in_transit → delivered)
CREATE POLICY "Only receiver can update shipment status"
ON shipments FOR UPDATE
USING (
  to_organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  AND status = 'in_transit'
)
WITH CHECK (
  status = 'delivered'
  AND to_organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- ============================================
-- USAGES 테이블 RLS 강화
-- ============================================

-- 병원만 usage 조회 가능
CREATE POLICY "Only hospitals can view usages"
ON usages FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
    AND role = 'hospital'
  )
);

-- 병원만 usage 생성 가능
CREATE POLICY "Only hospitals can create usages"
ON usages FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM users
    WHERE id = auth.uid()
    AND role = 'hospital'
  )
);

-- Usage 수정/삭제 불가 (감사 추적)
-- (UPDATE/DELETE 정책 없음 → 기본적으로 거부)

-- ============================================
-- ADMIN 전용 정책
-- ============================================

-- Admin은 모든 organization 데이터 조회 가능
CREATE POLICY "Admins can view all organizations"
ON organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
  OR
  id IN (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- Admin만 organization 생성/수정 가능
CREATE POLICY "Only admins can manage organizations"
ON organizations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
```

### 4.2 RLS 정책 테스트

**파일**: `supabase/tests/test_rls_policies.sql`

```sql
-- ============================================
-- RLS 정책 테스트
-- ============================================

-- 테스트 사용자 설정
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub TO 'manufacturer-user-id';

-- Test 1: 제조사는 자신의 제품만 조회 가능
SELECT COUNT(*) FROM products WHERE organization_id = 'other-org-id';
-- 예상 결과: 0

-- Test 2: 제조사는 다른 조직의 제품 생성 불가
INSERT INTO products (organization_id, name, udi_di)
VALUES ('other-org-id', 'Test Product', 'TEST-UDI');
-- 예상 결과: RLS 정책 위반 에러

-- Test 3: 병원은 제품 생성 불가
SET LOCAL request.jwt.claims.sub TO 'hospital-user-id';
INSERT INTO products (organization_id, name, udi_di)
VALUES ('hospital-org-id', 'Test Product', 'TEST-UDI');
-- 예상 결과: RLS 정책 위반 에러

-- Test 4: Admin은 모든 organization 조회 가능
SET LOCAL request.jwt.claims.sub TO 'admin-user-id';
SELECT COUNT(*) FROM organizations;
-- 예상 결과: 전체 organization 수

-- 테스트 설정 초기화
RESET role;
```

---

## 5. XSS 방어

### 5.1 DOMPurify 설정

**패키지 설치**:

```bash
npm install dompurify
npm install -D @types/dompurify
```

**파일**: `src/utils/sanitize.ts`

```typescript
import DOMPurify from 'dompurify'

// HTML sanitization 설정
const sanitizeConfig: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
}

/**
 * HTML 문자열을 sanitize하여 XSS 공격 방어
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, sanitizeConfig)
}

/**
 * 일반 텍스트를 HTML 엔티티로 escape
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * URL이 안전한지 검증 (javascript:, data: 프로토콜 차단)
 */
export function isSafeUrl(url: string): boolean {
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:']
  const lowerUrl = url.toLowerCase().trim()

  return !dangerousProtocols.some((protocol) => lowerUrl.startsWith(protocol))
}

/**
 * 파일 이름에서 위험한 문자 제거 (Path Traversal 방어)
 */
export function sanitizeFilename(filename: string): string {
  // ../, ..\, null byte 등 제거
  return filename
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/\x00/g, '')
    .replace(/[<>:"|?*]/g, '')
    .trim()
}
```

### 5.2 사용자 입력 렌더링 시 Sanitization

**파일**: `src/components/common/SafeHtml.tsx`

```typescript
import { sanitizeHtml } from '@/utils/sanitize'

interface SafeHtmlProps {
  html: string
  className?: string
}

/**
 * Sanitized HTML을 안전하게 렌더링
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const cleanHtml = sanitizeHtml(html)

  return <div className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
}
```

**사용 예시**:

```typescript
// ❌ 위험 - XSS 취약점
function ProductDescription({ description }: { description: string }) {
  return <div dangerouslySetInnerHTML={{ __html: description }} />
}

// ✅ 안전 - Sanitized HTML
function ProductDescription({ description }: { description: string }) {
  return <SafeHtml html={description} />
}

// ✅ 가장 안전 - 일반 텍스트로 렌더링
function ProductDescription({ description }: { description: string }) {
  return <div>{description}</div>
}
```

---

## 6. CSRF 방어

### 6.1 Supabase CSRF 보호

Supabase는 기본적으로 CSRF 보호를 제공하지만, 추가적인 검증을 위해 PKCE (Proof Key for Code Exchange) 사용:

**파일**: `src/config/supabase.ts` (업데이트)

```typescript
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // PKCE flow 사용 (CSRF 방어)
  },
  // ... 기존 설정
})
```

### 6.2 Same-Site Cookie 설정

**파일**: `vercel.json` (업데이트)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Set-Cookie",
          "value": "SameSite=Strict; Secure; HttpOnly"
        }
      ]
    }
  ]
}
```

---

## 7. 입력 검증 강화

### 7.1 Zod 스키마 강화

**파일**: `src/features/auth/schemas/auth.schema.ts` (업데이트)

```typescript
import { z } from 'zod'

// 비밀번호 정책 강화
const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
  .max(128, '비밀번호는 최대 128자 이하여야 합니다.')
  .regex(/[a-z]/, '비밀번호에 소문자가 포함되어야 합니다.')
  .regex(/[A-Z]/, '비밀번호에 대문자가 포함되어야 합니다.')
  .regex(/[0-9]/, '비밀번호에 숫자가 포함되어야 합니다.')
  .regex(/[^a-zA-Z0-9]/, '비밀번호에 특수문자가 포함되어야 합니다.')

// 이메일 검증 강화
const emailSchema = z
  .string()
  .email('올바른 이메일 형식이 아닙니다.')
  .min(5, '이메일은 최소 5자 이상이어야 합니다.')
  .max(255, '이메일은 최대 255자 이하여야 합니다.')
  .refine(
    (email) => {
      // 위험한 문자 차단
      const dangerousChars = ['<', '>', '"', "'", '\\', '/', ';']
      return !dangerousChars.some((char) => email.includes(char))
    },
    { message: '이메일에 허용되지 않는 문자가 포함되어 있습니다.' }
  )

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    name: z
      .string()
      .min(2, '이름은 최소 2자 이상이어야 합니다.')
      .max(100, '이름은 최대 100자 이하여야 합니다.')
      .regex(/^[a-zA-Z가-힣\s]+$/, '이름에는 문자만 입력할 수 있습니다.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })
```

### 7.2 제품 데이터 검증 강화

**파일**: `src/features/products/schemas/product.schema.ts` (업데이트)

```typescript
import { z } from 'zod'
import { sanitizeHtml } from '@/utils/sanitize'

export const productSchema = z.object({
  name: z
    .string()
    .min(1, '제품명을 입력해주세요.')
    .max(200, '제품명은 최대 200자 이하여야 합니다.')
    .transform((val) => sanitizeHtml(val)), // XSS 방어

  udi_di: z
    .string()
    .min(1, 'UDI-DI를 입력해주세요.')
    .max(100)
    .regex(/^[A-Z0-9\-]+$/, 'UDI-DI는 대문자, 숫자, 하이픈만 포함할 수 있습니다.'),

  model_name: z
    .string()
    .min(1, '모델명을 입력해주세요.')
    .max(200)
    .transform((val) => sanitizeHtml(val)),

  description: z
    .string()
    .max(1000, '설명은 최대 1000자 이하여야 합니다.')
    .optional()
    .transform((val) => (val ? sanitizeHtml(val) : undefined)),

  manufacturer_name: z
    .string()
    .min(1, '제조사명을 입력해주세요.')
    .max(200)
    .transform((val) => sanitizeHtml(val)),

  // 숫자 필드 검증
  unit_price: z
    .number()
    .min(0, '단가는 0 이상이어야 합니다.')
    .max(1_000_000_000, '단가가 너무 큽니다.')
    .finite('올바른 숫자를 입력해주세요.'),
})

export type ProductFormData = z.infer<typeof productSchema>
```

### 7.3 Lot 데이터 검증 강화

**파일**: `src/features/lots/schemas/lot.schema.ts` (업데이트)

```typescript
import { z } from 'zod'
import { sanitizeHtml } from '@/utils/sanitize'

export const lotSchema = z.object({
  lot_number: z
    .string()
    .min(1, 'Lot 번호를 입력해주세요.')
    .max(50)
    .regex(/^[A-Z0-9\-]+$/, 'Lot 번호는 대문자, 숫자, 하이픈만 포함할 수 있습니다.'),

  virtual_code: z
    .string()
    .length(12, 'Virtual Code는 12자리여야 합니다.')
    .regex(/^[0-9]+$/, 'Virtual Code는 숫자만 포함할 수 있습니다.'),

  manufacturing_date: z.string().refine(
    (date) => {
      const parsed = new Date(date)
      return !isNaN(parsed.getTime()) && parsed <= new Date()
    },
    { message: '제조일은 현재 날짜 이전이어야 합니다.' }
  ),

  expiry_date: z.string().refine(
    (date) => {
      const parsed = new Date(date)
      return !isNaN(parsed.getTime()) && parsed > new Date()
    },
    { message: '사용기한은 현재 날짜 이후여야 합니다.' }
  ),

  quantity: z
    .number()
    .int('수량은 정수여야 합니다.')
    .min(1, '수량은 최소 1 이상이어야 합니다.')
    .max(1_000_000, '수량이 너무 큽니다.'),

  notes: z
    .string()
    .max(500)
    .optional()
    .transform((val) => (val ? sanitizeHtml(val) : undefined)),
})

export type LotFormData = z.infer<typeof lotSchema>
```

---

## 8. 보안 헤더 설정

### 8.1 Vercel 보안 헤더

**파일**: `vercel.json` (업데이트)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://o*.ingest.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        },
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
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

### 8.2 CSP Meta Tag (Fallback)

**파일**: `index.html` (업데이트)

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- CSP (Vercel 헤더가 우선, fallback으로 meta tag 사용) -->
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    />

    <!-- XSS Protection -->
    <meta http-equiv="X-XSS-Protection" content="1; mode=block" />

    <!-- Content Type -->
    <meta http-equiv="X-Content-Type-Options" content="nosniff" />

    <title>Neo Certificate System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 9. Rate Limiting

### 9.1 클라이언트 측 Rate Limiting

**파일**: `src/utils/rate-limit.ts`

```typescript
interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  /**
   * Rate limit 체크
   * @param key - 고유 식별자 (예: 'login', 'api-call')
   * @param config - Rate limit 설정
   * @returns true if allowed, false if rate limited
   */
  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []

    // 시간 윈도우 밖의 요청 제거
    const validRequests = requests.filter((timestamp) => now - timestamp < config.windowMs)

    // Rate limit 초과 확인
    if (validRequests.length >= config.maxRequests) {
      return false
    }

    // 새 요청 추가
    validRequests.push(now)
    this.requests.set(key, validRequests)

    return true
  }

  /**
   * 남은 요청 수 반환
   */
  remaining(key: string, config: RateLimitConfig): number {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    const validRequests = requests.filter((timestamp) => now - timestamp < config.windowMs)

    return Math.max(0, config.maxRequests - validRequests.length)
  }

  /**
   * 다음 요청 가능 시간 (ms)
   */
  retryAfter(key: string, config: RateLimitConfig): number {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    const validRequests = requests.filter((timestamp) => now - timestamp < config.windowMs)

    if (validRequests.length < config.maxRequests) {
      return 0
    }

    const oldestRequest = validRequests[0]
    return config.windowMs - (now - oldestRequest)
  }

  /**
   * 특정 키 초기화
   */
  reset(key: string) {
    this.requests.delete(key)
  }

  /**
   * 모든 키 초기화
   */
  resetAll() {
    this.requests.clear()
  }
}

export const rateLimiter = new RateLimiter()

// 미리 정의된 Rate Limit 설정
export const RATE_LIMITS = {
  LOGIN: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5분
  },
  API_CALL: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1분
  },
  FILE_UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1분
  },
} as const
```

### 9.2 로그인 Rate Limiting

**파일**: `src/features/auth/api/useLogin.ts` (업데이트)

```typescript
import { rateLimiter, RATE_LIMITS } from '@/utils/rate-limit'
import { toast } from 'sonner'

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      // Rate limit 체크
      if (!rateLimiter.check('login', RATE_LIMITS.LOGIN)) {
        const retryAfter = Math.ceil(rateLimiter.retryAfter('login', RATE_LIMITS.LOGIN) / 1000)
        throw new Error(`로그인 시도 횟수를 초과했습니다. ${retryAfter}초 후 다시 시도해주세요.`)
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) throw error

      // 로그인 성공 시 rate limit 초기화
      rateLimiter.reset('login')

      return data
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
```

### 9.3 API 호출 Rate Limiting (Interceptor)

**파일**: `src/lib/query-client.ts` (업데이트)

```typescript
import { rateLimiter, RATE_LIMITS } from '@/utils/rate-limit'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Rate limit 체크 (모든 API 호출에 적용)
      const queryKey = String(query.queryKey[0])

      if (!rateLimiter.check(`api-${queryKey}`, RATE_LIMITS.API_CALL)) {
        const retryAfter = Math.ceil(rateLimiter.retryAfter(`api-${queryKey}`, RATE_LIMITS.API_CALL) / 1000)
        toast.error(`요청 횟수를 초과했습니다. ${retryAfter}초 후 다시 시도해주세요.`)
        return
      }

      // 기존 에러 처리
      console.error('[Query Error]', query.queryKey, error)
      captureException(error as Error, { queryKey: query.queryKey })
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.')
    },
  }),
  // ...
})
```

---

## 10. 파일 업로드 보안

### 10.1 파일 업로드 검증

**파일**: `src/utils/file-validation.ts`

```typescript
import { sanitizeFilename } from './sanitize'

// src/constants/validation.ts에서 import
import { FILE_LIMITS } from '@/constants'

const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
  PDF: ['application/pdf'],
  EXCEL: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
} as const

// FILE_LIMITS.MAX_SIZE 사용 (10MB)
const MAX_FILE_SIZE = FILE_LIMITS.MAX_SIZE

interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * 파일 확장자 검증
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? allowedExtensions.includes(ext) : false
}

/**
 * 파일 타입 검증 (MIME type)
 */
export function validateFileType(file: File, allowedTypes: readonly string[]): FileValidationResult {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `허용되지 않는 파일 형식입니다. (${file.type})`,
    }
  }

  return { valid: true }
}

/**
 * 파일 크기 검증
 */
export function validateFileSize(file: File, maxSize: number = MAX_FILE_SIZE): FileValidationResult {
  if (file.size > maxSize) {
    const maxSizeMB = Math.floor(maxSize / 1024 / 1024)
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. (최대 ${maxSizeMB}MB)`,
    }
  }

  return { valid: true }
}

/**
 * 이미지 파일 검증
 */
export function validateImageFile(file: File): FileValidationResult {
  // MIME type 검증
  const typeValidation = validateFileType(file, ALLOWED_FILE_TYPES.IMAGE)
  if (!typeValidation.valid) return typeValidation

  // 파일 크기 검증
  const sizeValidation = validateFileSize(file, 5 * 1024 * 1024) // 5MB
  if (!sizeValidation.valid) return sizeValidation

  // 확장자 검증 (MIME type 스푸핑 방어)
  if (!validateFileExtension(file.name, ['jpg', 'jpeg', 'png', 'webp'])) {
    return {
      valid: false,
      error: '허용되지 않는 파일 확장자입니다.',
    }
  }

  return { valid: true }
}

/**
 * 안전한 파일명 생성
 */
export function generateSafeFilename(originalFilename: string): string {
  const sanitized = sanitizeFilename(originalFilename)
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)

  const ext = sanitized.split('.').pop()
  const nameWithoutExt = sanitized.replace(/\.[^/.]+$/, '')

  return `${nameWithoutExt}-${timestamp}-${randomStr}.${ext}`
}
```

### 10.2 파일 업로드 컴포넌트

**파일**: `src/components/common/FileUpload.tsx`

```typescript
import { useState } from 'react'
import { validateImageFile, generateSafeFilename } from '@/utils/file-validation'
import { supabase } from '@/config/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'

interface FileUploadProps {
  onUploadSuccess: (url: string) => void
  bucket: string
  path: string
}

export function FileUpload({ onUploadSuccess, bucket, path }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 검증
    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    // 미리보기 생성
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // 파일 업로드
    setUploading(true)
    try {
      const safeFilename = generateSafeFilename(file.name)
      const filePath = `${path}/${safeFilename}`

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

      if (uploadError) throw uploadError

      // Public URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath)

      onUploadSuccess(publicUrl)
      toast.success('파일이 업로드되었습니다.')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('파일 업로드 중 오류가 발생했습니다.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded" />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => setPreview(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">이미지를 업로드하려면 클릭하세요</span>
          <span className="text-xs text-gray-400 mt-1">(JPG, PNG, WebP, 최대 5MB)</span>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        </label>
      )}
    </div>
  )
}
```

---

## 11. 감사 로깅 (Audit Trail)

### 11.1 감사 로그 테이블

**파일**: `supabase/migrations/20250121000002_create_audit_logs.sql`

```sql
-- ============================================
-- 감사 로그 테이블
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  organization_id UUID REFERENCES organizations(id),

  -- What
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'
  table_name TEXT NOT NULL,
  record_id UUID,

  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Details
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  metadata JSONB,

  CONSTRAINT audit_logs_action_check CHECK (action IN (
    'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'VIEW'
  ))
);

-- 인덱스 생성
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- RLS 정책 (Admin만 조회 가능)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
ON audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- 감사 로그는 INSERT만 가능, UPDATE/DELETE 불가 (변조 방지)
CREATE POLICY "All authenticated users can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 트리거 함수: 자동 감사 로깅
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE
      WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD)
      ELSE NULL
    END,
    CASE
      WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW)
      ELSE NULL
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 트리거 적용 (중요 테이블만)
-- ============================================

-- Products
CREATE TRIGGER products_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Lots
CREATE TRIGGER lots_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON lots
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Shipments
CREATE TRIGGER shipments_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON shipments
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Usages
CREATE TRIGGER usages_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON usages
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Organizations (Admin 작업 추적)
CREATE TRIGGER organizations_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON organizations
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
```

### 11.2 클라이언트 감사 로깅

**파일**: `src/utils/audit-log.ts`

```typescript
import { supabase } from '@/config/supabase'

interface AuditLogData {
  action: 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'VIEW'
  tableName: string
  recordId?: string
  metadata?: Record<string, any>
}

/**
 * 감사 로그 생성 (클라이언트 이벤트)
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      action: data.action,
      table_name: data.tableName,
      record_id: data.recordId,
      metadata: data.metadata,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
    })

    if (error) {
      console.error('Failed to create audit log:', error)
    }
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

/**
 * 클라이언트 IP 주소 가져오기
 */
async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip
  } catch {
    return null
  }
}
```

**사용 예시**:

```typescript
// 로그인 시
export function useLogin() {
  return useMutation({
    mutationFn: async (credentials) => {
      // ... 로그인 로직
    },
    onSuccess: () => {
      createAuditLog({
        action: 'LOGIN',
        tableName: 'auth',
      })
    },
  })
}

// 데이터 내보내기 시
export function handleExport() {
  // ... 내보내기 로직

  createAuditLog({
    action: 'EXPORT',
    tableName: 'products',
    metadata: {
      format: 'CSV',
      recordCount: products.length,
    },
  })
}
```

---

## 12. 테스트 시나리오

### 12.1 RLS 정책 테스트

```typescript
import { describe, it, expect } from 'vitest'
import { supabase } from '@/config/supabase'

describe('RLS Policies', () => {
  it('제조사는 자신의 제품만 조회할 수 있어야 한다', async () => {
    // Given: 제조사 로그인
    await supabase.auth.signInWithPassword({
      email: 'manufacturer@test.com',
      password: 'password',
    })

    // When: 제품 조회
    const { data, error } = await supabase.from('products').select('*')

    // Then: 자신의 조직 제품만 반환
    expect(error).toBeNull()
    expect(data).toBeDefined()
    data?.forEach((product) => {
      expect(product.organization_id).toBe('manufacturer-org-id')
    })
  })

  it('병원은 제품을 생성할 수 없어야 한다', async () => {
    // Given: 병원 로그인
    await supabase.auth.signInWithPassword({
      email: 'hospital@test.com',
      password: 'password',
    })

    // When: 제품 생성 시도
    const { error } = await supabase.from('products').insert({
      name: 'Test Product',
      udi_di: 'TEST-UDI',
      organization_id: 'hospital-org-id',
    })

    // Then: RLS 정책 위반 에러
    expect(error).toBeDefined()
    expect(error?.message).toContain('policy')
  })
})
```

### 12.2 XSS 방어 테스트

```typescript
import { sanitizeHtml, escapeHtml } from '@/utils/sanitize'
import { describe, it, expect } from 'vitest'

describe('XSS Prevention', () => {
  it('script 태그가 제거되어야 한다', () => {
    // Given: 악의적인 HTML
    const maliciousHtml = '<p>Hello</p><script>alert("XSS")</script>'

    // When: sanitize
    const clean = sanitizeHtml(maliciousHtml)

    // Then: script 태그 제거됨
    expect(clean).toBe('<p>Hello</p>')
    expect(clean).not.toContain('script')
  })

  it('onclick 속성이 제거되어야 한다', () => {
    // Given: onclick 이벤트
    const maliciousHtml = '<a href="#" onclick="alert(\'XSS\')">Click me</a>'

    // When: sanitize
    const clean = sanitizeHtml(maliciousHtml)

    // Then: onclick 제거됨
    expect(clean).not.toContain('onclick')
  })

  it('특수 문자가 HTML 엔티티로 변환되어야 한다', () => {
    // Given: 특수 문자
    const text = '<script>alert("XSS")</script>'

    // When: escape
    const escaped = escapeHtml(text)

    // Then: HTML 엔티티로 변환
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;')
  })
})
```

### 12.3 입력 검증 테스트

```typescript
import { passwordSchema, emailSchema } from '@/features/auth/schemas/auth.schema'
import { describe, it, expect } from 'vitest'

describe('Input Validation', () => {
  it('약한 비밀번호는 거부되어야 한다', () => {
    // Given: 약한 비밀번호 (소문자만)
    const weakPassword = 'password'

    // When: 검증
    const result = passwordSchema.safeParse(weakPassword)

    // Then: 에러 발생
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('대문자')
    }
  })

  it('강한 비밀번호는 허용되어야 한다', () => {
    // Given: 강한 비밀번호
    const strongPassword = 'Password123!'

    // When: 검증
    const result = passwordSchema.safeParse(strongPassword)

    // Then: 성공
    expect(result.success).toBe(true)
  })

  it('잘못된 이메일 형식은 거부되어야 한다', () => {
    // Given: 잘못된 이메일
    const invalidEmail = 'not-an-email'

    // When: 검증
    const result = emailSchema.safeParse(invalidEmail)

    // Then: 에러 발생
    expect(result.success).toBe(false)
  })
})
```

### 12.4 Rate Limiting 테스트

```typescript
import { rateLimiter, RATE_LIMITS } from '@/utils/rate-limit'
import { describe, it, expect, beforeEach } from 'vitest'

describe('Rate Limiter', () => {
  beforeEach(() => {
    rateLimiter.resetAll()
  })

  it('허용된 요청 수 이하면 통과해야 한다', () => {
    // Given: Rate limit 설정 (5회/5분)
    const config = RATE_LIMITS.LOGIN

    // When: 5회 요청
    for (let i = 0; i < 5; i++) {
      const allowed = rateLimiter.check('test', config)
      expect(allowed).toBe(true)
    }
  })

  it('허용된 요청 수를 초과하면 차단되어야 한다', () => {
    // Given: Rate limit 설정 (5회/5분)
    const config = RATE_LIMITS.LOGIN

    // When: 6회 요청
    for (let i = 0; i < 5; i++) {
      rateLimiter.check('test', config)
    }
    const blocked = rateLimiter.check('test', config)

    // Then: 6번째 요청은 차단됨
    expect(blocked).toBe(false)
  })

  it('시간 윈도우가 지나면 다시 요청 가능해야 한다', async () => {
    // Given: Rate limit 설정 (2회/100ms)
    const config = { maxRequests: 2, windowMs: 100 }

    // When: 2회 요청 후 100ms 대기
    rateLimiter.check('test', config)
    rateLimiter.check('test', config)
    const blocked = rateLimiter.check('test', config)
    expect(blocked).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 150))

    // Then: 다시 요청 가능
    const allowed = rateLimiter.check('test', config)
    expect(allowed).toBe(true)
  })
})
```

---

## 13. 트러블슈팅

### 13.1 RLS 정책으로 인한 데이터 조회 불가

**증상**:
- 데이터가 존재하지만 조회되지 않음

**원인**:
- RLS 정책이 너무 엄격하게 설정됨
- `organization_id`가 잘못 설정됨

**해결**:
```sql
-- RLS 정책 디버깅
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub TO 'user-id';

-- RLS 정책 없이 쿼리 (디버깅용)
SET LOCAL role postgres;
SELECT * FROM products WHERE organization_id = 'org-id';
RESET role;

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'products';
```

### 13.2 CSP 위반으로 스크립트 로드 실패

**증상**:
- 브라우저 콘솔에 CSP 에러: `Refused to load the script`

**원인**:
- CSP 정책에서 해당 도메인이 허용되지 않음

**해결**:
```json
// vercel.json - CSP 헤더 업데이트
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "script-src 'self' 'unsafe-inline' https://trusted-cdn.com;"
        }
      ]
    }
  ]
}
```

### 13.3 Rate Limiting이 정상 사용자도 차단

**증상**:
- 정상적인 사용 중에도 "요청 횟수 초과" 에러

**원인**:
- Rate limit 임계값이 너무 낮음
- 여러 탭에서 동시 사용 시 누적

**해결**:
```typescript
// src/utils/rate-limit.ts - 임계값 조정
export const RATE_LIMITS = {
  API_CALL: {
    maxRequests: 200, // 100 → 200으로 증가
    windowMs: 60 * 1000,
  },
}
```

### 13.4 감사 로그가 생성되지 않음

**증상**:
- 데이터 변경 후 `audit_logs` 테이블에 로그 없음

**원인**:
- 트리거가 제대로 생성되지 않음
- RLS 정책으로 INSERT 차단됨

**해결**:
```sql
-- 트리거 확인
SELECT * FROM pg_trigger WHERE tgname LIKE '%audit%';

-- 트리거 재생성
DROP TRIGGER IF EXISTS products_audit_trail ON products;
CREATE TRIGGER products_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'audit_logs';
```

### 13.5 파일 업로드 시 MIME type 스푸핑

**증상**:
- `.exe` 파일을 `.jpg`로 변경하여 업로드 가능

**원인**:
- 파일 확장자만 검증하고 실제 MIME type 미검증

**해결**:
```typescript
// src/utils/file-validation.ts - Magic number 검증 추가
export async function validateImageMagicNumber(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 4).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  // JPEG magic number: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true
  }

  // PNG magic number: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return true
  }

  return false
}
```

---

## 14. Definition of Done

### 14.1 코드 완성도
- [ ] RLS 정책 강화 마이그레이션 파일 생성 완료
- [ ] XSS 방어 유틸리티 (`sanitize.ts`) 구현 완료
- [ ] 입력 검증 스키마 강화 (비밀번호, 이메일, 제품, Lot) 완료
- [ ] 보안 헤더 설정 (`vercel.json`) 완료
- [ ] Rate Limiter 구현 완료
- [ ] 파일 업로드 검증 구현 완료
- [ ] 감사 로깅 시스템 구현 완료

### 14.2 보안 검증
- [ ] OWASP Top 10 체크리스트 완료
  - [ ] Injection 방어 (SQL Injection, XSS)
  - [ ] Broken Authentication 방어 (강한 비밀번호 정책)
  - [ ] Sensitive Data Exposure 방어 (HTTPS, 암호화)
  - [ ] XML External Entities (XXE) - N/A
  - [ ] Broken Access Control 방어 (RLS)
  - [ ] Security Misconfiguration 방어 (보안 헤더)
  - [ ] Cross-Site Scripting (XSS) 방어 (Sanitization)
  - [ ] Insecure Deserialization - N/A
  - [ ] Using Components with Known Vulnerabilities (npm audit)
  - [ ] Insufficient Logging & Monitoring 방어 (Audit logs)

### 14.3 RLS 정책
- [ ] 모든 테이블에 RLS 활성화 확인
- [ ] 조직별 데이터 격리 확인 (다른 조직 데이터 접근 불가)
- [ ] Role 기반 접근 제어 확인
- [ ] RLS 정책 테스트 (SQL 및 Integration tests) 완료

### 14.4 입력 검증
- [ ] 모든 사용자 입력에 Zod 검증 적용 완료
- [ ] 비밀번호 정책 강화 확인 (8자 이상, 대소문자/숫자/특수문자)
- [ ] XSS 방어 확인 (DOMPurify sanitization)
- [ ] 파일 업로드 검증 확인 (MIME type, 크기, 확장자)

### 14.5 보안 헤더
- [ ] CSP 헤더 설정 완료
- [ ] X-Frame-Options: DENY 설정 완료
- [ ] X-Content-Type-Options: nosniff 설정 완료
- [ ] HSTS 헤더 설정 완료 (max-age=31536000)

### 14.6 테스트
- [ ] RLS 정책 테스트 2개 이상 작성 및 통과
- [ ] XSS 방어 테스트 3개 이상 작성 및 통과
- [ ] 입력 검증 테스트 3개 이상 작성 및 통과
- [ ] Rate limiting 테스트 3개 이상 작성 및 통과

### 14.7 감사
- [ ] 감사 로그 테이블 생성 완료
- [ ] 중요 테이블에 감사 트리거 적용 완료
- [ ] 로그인/로그아웃 이벤트 로깅 확인
- [ ] 데이터 내보내기 이벤트 로깅 확인

### 14.8 문서화
- [ ] 보안 가이드 문서 작성 완료
- [ ] RLS 정책 문서 작성 완료
- [ ] 감사 로깅 가이드 작성 완료

### 14.9 배포
- [ ] 프로덕션 배포 후 보안 헤더 확인 완료
- [ ] npm audit으로 취약점 검사 완료 (0 vulnerabilities)
- [ ] Lighthouse Security 점수 100 달성

---

## 15. Git Commit 메시지

### 15.1 RLS 정책 강화
```bash
git add supabase/migrations/20250121000001_enhance_rls_policies.sql
git commit -m "feat(security): Enhance RLS policies for organization isolation

- Add stricter organization_id checks for all tables
- Implement role-based access control (manufacturer, distributor, hospital, admin)
- Add soft delete policy (prevent hard deletes)
- Add admin-only organization management policy

Refs: #SEC-001"
```

### 15.2 XSS 방어
```bash
git add src/utils/sanitize.ts src/components/common/SafeHtml.tsx package.json
git commit -m "feat(security): Add XSS prevention with DOMPurify

- Install DOMPurify for HTML sanitization
- Implement sanitizeHtml, escapeHtml, isSafeUrl utilities
- Add SafeHtml component for safe HTML rendering
- Add sanitizeFilename for path traversal prevention

Refs: #SEC-002"
```

### 15.3 입력 검증 강화
```bash
git add src/features/auth/schemas/auth.schema.ts src/features/products/schemas/product.schema.ts
git commit -m "feat(security): Strengthen input validation with Zod

- Enforce strong password policy (8+ chars, uppercase, lowercase, digit, special)
- Add email validation with dangerous character blocking
- Add XSS sanitization in product/lot schemas
- Add numeric bounds validation

Refs: #SEC-003"
```

### 15.4 보안 헤더 설정
```bash
git add vercel.json index.html
git commit -m "feat(security): Add security headers (CSP, HSTS, X-Frame-Options)

- Configure Content-Security-Policy
- Add Strict-Transport-Security (HSTS)
- Add X-Frame-Options: DENY
- Add X-Content-Type-Options: nosniff
- Add X-XSS-Protection
- Add Referrer-Policy and Permissions-Policy

Refs: #SEC-004"
```

### 15.5 Rate Limiting
```bash
git add src/utils/rate-limit.ts src/features/auth/api/useLogin.ts
git commit -m "feat(security): Implement client-side rate limiting

- Add RateLimiter class with configurable limits
- Apply rate limit to login (5 attempts/5 min)
- Apply rate limit to API calls (100 requests/1 min)
- Display retry-after message to users

Refs: #SEC-005"
```

### 15.6 파일 업로드 보안
```bash
git add src/utils/file-validation.ts src/components/common/FileUpload.tsx
git commit -m "feat(security): Add secure file upload with validation

- Validate file MIME type, size, and extension
- Generate safe filenames with timestamp and random string
- Prevent path traversal attacks
- Limit file size to 10MB (images: 5MB)

Refs: #SEC-006"
```

### 15.7 감사 로깅
```bash
git add supabase/migrations/20250121000002_create_audit_logs.sql src/utils/audit-log.ts
git commit -m "feat(security): Add audit logging for critical operations

- Create audit_logs table with RLS (admin-only view)
- Add automatic audit triggers for products, lots, shipments, usages
- Log user ID, action, old/new data, IP, user agent
- Add client-side audit logging for LOGIN, LOGOUT, EXPORT

Refs: #SEC-007"
```

---

## 16. 참고 자료

### 16.1 공식 문서
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify](https://github.com/cure53/DOMPurify)

### 16.2 보안 체크리스트
- [Web Security Checklist](https://securitycheckli.st/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

### 16.3 관련 Phase
- **Phase 1.4**: RLS 정책 설계 (기본 RLS)
- **Phase 2.1**: 인증 시스템 (JWT, 세션 관리)
- **Phase 8.1**: 환경 변수 관리 (민감 정보 보호)
- **Phase 8.2**: 에러 로깅 및 모니터링 (보안 이벤트 추적)

---

**문서 버전**: 1.0
**최종 수정일**: 2025-01-21
**작성자**: Development Team
**승인자**: Security Lead
