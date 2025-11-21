# Phase 8.5: 배포 가이드

## 1. 개요

### 1.1 목적
- Vercel을 통한 프론트엔드 프로덕션 배포
- Supabase 프로덕션 환경 설정
- CI/CD 파이프라인 구축
- 배포 후 모니터링 및 롤백 전략
- 도메인 및 SSL 인증서 설정

### 1.2 범위
- Supabase 프로덕션 프로젝트 설정
- Vercel 프로젝트 생성 및 배포 설정
- GitHub Actions CI/CD 구성
- 도메인 연결 및 SSL 설정
- 배포 체크리스트 및 롤백 절차

### 1.3 주요 이해관계자
- **DevOps**: 배포 인프라 구축 및 관리
- **개발자**: 코드 배포 및 버전 관리
- **운영팀**: 서비스 모니터링 및 장애 대응
- **프로젝트 매니저**: 배포 일정 관리

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

#### FR-8.5.1: 자동화된 배포
- GitHub main 브랜치에 push 시 자동 배포
- PR(Pull Request) 생성 시 Preview 환경 자동 생성
- 배포 전 자동 테스트 실행

#### FR-8.5.2: 환경 분리
- 개발(Development): 로컬 환경
- 스테이징(Staging): Vercel Preview
- 프로덕션(Production): Vercel Production

#### FR-8.5.3: 롤백 지원
- 이전 버전으로 즉시 롤백 가능
- 배포 이력 관리
- Blue-Green 배포 전략

#### FR-8.5.4: 모니터링
- 배포 성공/실패 알림 (Slack)
- 성능 모니터링 (Lighthouse CI)
- 에러 추적 (Sentry)

### 2.2 비기능 요구사항

#### NFR-8.5.1: 가용성
- 배포 중 다운타임 없음 (Zero-downtime deployment)
- 배포 실패 시 자동 롤백

#### NFR-8.5.2: 보안
- HTTPS 강제 (SSL/TLS)
- 환경 변수 암호화 저장
- 접근 권한 관리

#### NFR-8.5.3: 성능
- 배포 시간 < 5분
- CDN을 통한 빠른 콘텐츠 전송

---

## 3. Supabase 프로덕션 설정

### 3.1 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com/) 접속
2. **New Project** 클릭
3. 프로젝트 정보 입력:
   ```
   Organization: Your Organization
   Name: neo-certify-prod
   Database Password: [강력한 비밀번호 생성]
   Region: Northeast Asia (Seoul)
   Pricing Plan: Pro (프로덕션용)
   ```
4. **Create new project** 클릭
5. 프로젝트 생성 완료 (약 2분 소요)

### 3.2 데이터베이스 마이그레이션

**Step 1: 로컬 환경에서 마이그레이션 파일 확인**

```bash
# 모든 마이그레이션 파일 확인
ls -la supabase/migrations/

# 예상 출력:
# 20250115000000_initial_schema.sql
# 20250116000000_add_rls_policies.sql
# 20250121000000_add_performance_indexes.sql
# 20250121000001_enhance_rls_policies.sql
# 20250121000002_create_audit_logs.sql
```

**Step 2: Supabase CLI 설치 및 연결**

```bash
# Supabase CLI 설치 (macOS)
brew install supabase/tap/supabase

# Supabase CLI 설치 (Linux/WSL)
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
sudo mv supabase /usr/local/bin/

# Supabase CLI 설치 (Windows)
scoop install supabase

# 버전 확인
supabase --version
```

**Step 3: 프로젝트 연결 및 마이그레이션**

```bash
# Supabase 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref <PROJECT_REF>
# PROJECT_REF는 Supabase Dashboard → Settings → General → Reference ID

# 데이터베이스 상태 확인
supabase db diff

# 마이그레이션 실행 (프로덕션)
supabase db push

# 확인 메시지:
# Do you want to push these migrations to the remote database? [y/N] y
```

**Step 4: 마이그레이션 검증**

```bash
# SQL Editor에서 테이블 확인
supabase db remote exec "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"

# 예상 출력:
# organizations
# users
# products
# lots
# inventory
# shipments
# usages
# disposals
# inventory_alerts
# expiry_warnings
# audit_logs
```

### 3.3 RLS 정책 검증

**Supabase Dashboard → Authentication → Policies**에서 각 테이블의 RLS 정책 확인:

- ✅ All tables have RLS enabled
- ✅ Organization-based isolation policies
- ✅ Role-based access control policies

### 3.4 Supabase 환경 변수 저장

```bash
# .env.production 파일 생성 (로컬용, Git에 커밋하지 않음)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Supabase 설정 확인**:
- Dashboard → Settings → API
- **Project URL**: `https://xxxxx.supabase.co`
- **Anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Service role key**: (절대 프론트엔드에 노출 금지!)

---

## 4. Vercel 배포 설정

### 4.1 Vercel 프로젝트 생성

**Step 1: Vercel 계정 생성**

1. [Vercel](https://vercel.com/) 접속
2. **Sign Up** (GitHub 계정으로 연동 권장)
3. 무료 Hobby 플랜 선택

**Step 2: GitHub 저장소 연동**

1. Vercel Dashboard → **Add New... → Project**
2. **Import Git Repository** 선택
3. GitHub 저장소 선택: `neo-certify-20251120ver`
4. **Import** 클릭

**Step 3: 프로젝트 설정**

```
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**Step 4: 환경 변수 설정**

Vercel Dashboard → Project → Settings → Environment Variables

**Production 환경**:
```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_NAME = Neo Certificate System
VITE_APP_VERSION = 1.0.0
VITE_ENVIRONMENT = production
VITE_ENABLE_ANALYTICS = true
VITE_ENABLE_ERROR_TRACKING = true
VITE_SENTRY_DSN = https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
VITE_SENTRY_ENVIRONMENT = production
VITE_SENTRY_TRACES_SAMPLE_RATE = 0.1
```

**Preview 환경 (Staging)**:
```
VITE_SUPABASE_URL = https://yyyyy.supabase.co (스테이징 Supabase)
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ENVIRONMENT = staging
VITE_ENABLE_ANALYTICS = false
VITE_ENABLE_ERROR_TRACKING = true
```

**Step 5: 첫 배포**

1. **Deploy** 클릭
2. 빌드 로그 확인 (약 2-3분 소요)
3. 배포 성공 시 URL 확인: `https://neo-certify-xxxxx.vercel.app`

### 4.2 도메인 연결

**Step 1: 도메인 구매** (선택 사항)

- 도메인 등록 업체: GoDaddy, Namecheap, Cloudflare 등
- 예시 도메인: `neo-certify.com`

**Step 2: Vercel에 도메인 추가**

1. Vercel Dashboard → Project → Settings → Domains
2. **Add Domain** 클릭
3. 도메인 입력: `neo-certify.com`, `www.neo-certify.com`
4. DNS 설정 안내 확인

**Step 3: DNS 설정**

도메인 등록 업체의 DNS 설정에서:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Step 4: SSL 인증서 자동 발급**

- Vercel이 자동으로 Let's Encrypt SSL 인증서 발급
- HTTPS 자동 활성화 (약 10분 소요)

### 4.3 배포 설정 최적화

**파일**: `vercel.json` (최종 버전)

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
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],

  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    }
  ],

  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 5. CI/CD 파이프라인 (GitHub Actions)

### 5.1 GitHub Actions 워크플로우

**파일**: `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # Job 1: Lint and Type Check
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript type check
        run: npx tsc --noEmit

  # Job 2: Test
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:ci

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

  # Job 3: Build
  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  # Job 4: Security Audit
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  # Job 5: Lighthouse CI (Performance)
  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'pull_request'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

  # Job 6: Deploy (Vercel은 자동 배포하므로 알림만 전송)
  notify:
    name: Notify Deployment
    runs-on: ubuntu-latest
    needs: [build, security]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Send Slack notification
        uses: slackapi/slack-github-action@v1.24.0
        with:
          payload: |
            {
              "text": "🚀 Deployment to production initiated",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Status*\n✅ Build successful\n✅ Tests passed\n✅ Security audit completed\n\n🔗 <https://neo-certify.com|View Production>"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

**파일**: `package.json` (스크립트 추가)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### 5.2 GitHub Secrets 설정

**GitHub Repository → Settings → Secrets and variables → Actions**

```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SLACK_WEBHOOK_URL = https://hooks.slack.com/services/xxx/yyy/zzz
SNYK_TOKEN = your-snyk-token (선택)
LHCI_GITHUB_APP_TOKEN = your-lighthouse-token (선택)
```

---

## 6. 배포 체크리스트

### 6.1 배포 전 체크리스트

**코드 품질**:
- [ ] 모든 테스트 통과 (`npm run test`)
- [ ] ESLint 경고 없음 (`npm run lint`)
- [ ] TypeScript 타입 에러 없음 (`tsc --noEmit`)
- [ ] 코드 리뷰 완료 (최소 1명)

**보안**:
- [ ] `npm audit` 취약점 없음 (또는 해결됨)
- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] Supabase Anon Key만 사용 (Service Role Key 미사용)
- [ ] RLS 정책 활성화 확인

**성능**:
- [ ] Lighthouse 점수: Performance 90+
- [ ] 번들 크기 < 500KB (gzipped)
- [ ] 이미지 최적화 완료 (WebP, lazy loading)

**기능**:
- [ ] 모든 주요 기능 테스트 완료 (수동 테스트)
- [ ] 에러 시나리오 테스트 완료
- [ ] 다양한 브라우저 테스트 (Chrome, Safari, Firefox)
- [ ] 모바일 반응형 테스트

**환경 설정**:
- [ ] Vercel 환경 변수 설정 완료
- [ ] Supabase 프로덕션 마이그레이션 완료
- [ ] Sentry DSN 설정 완료

**문서화**:
- [ ] README 업데이트 완료
- [ ] CHANGELOG 작성 완료
- [ ] 배포 가이드 최신화

### 6.2 배포 후 체크리스트

**기능 검증** (프로덕션 환경):
- [ ] 로그인/로그아웃 정상 동작
- [ ] 제품 등록/조회/수정 정상 동작
- [ ] Lot 생성 및 Virtual Code 생성 정상 동작
- [ ] Shipment 생성 및 상태 업데이트 정상 동작
- [ ] Usage 기록 정상 동작
- [ ] 보고서 생성 및 Export 정상 동작

**모니터링**:
- [ ] Sentry에 에러 전송 확인
- [ ] Vercel Analytics 데이터 수집 확인
- [ ] Core Web Vitals 정상 범위 확인

**보안**:
- [ ] HTTPS 강제 리다이렉트 확인
- [ ] 보안 헤더 적용 확인 (개발자 도구 → Network)
- [ ] CSP 위반 없음 확인

**성능**:
- [ ] 페이지 로드 시간 < 3초
- [ ] API 응답 시간 < 500ms
- [ ] 이미지 로딩 정상 (lazy loading)

**알림**:
- [ ] Slack 배포 알림 수신 확인
- [ ] Sentry 알림 설정 확인

---

## 7. 롤백 절차

### 7.1 Vercel 즉시 롤백

**Vercel Dashboard에서 롤백**:

1. Vercel Dashboard → Project → Deployments
2. 이전 성공 배포 선택
3. **⋯ (More)** → **Promote to Production** 클릭
4. 확인 후 즉시 롤백 완료 (30초 이내)

**Vercel CLI로 롤백**:

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 배포 이력 확인
vercel list

# 특정 배포로 롤백
vercel promote <DEPLOYMENT_URL> --prod
```

### 7.2 Supabase 마이그레이션 롤백

**수동 롤백** (SQL 실행):

```sql
-- 1. 특정 마이그레이션 이후 변경 사항 확인
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

-- 2. 문제가 있는 마이그레이션 되돌리기
-- (각 마이그레이션 파일에 대한 역방향 SQL 작성 필요)

-- 예: 인덱스 제거
DROP INDEX IF EXISTS idx_products_organization_id;

-- 예: 테이블 삭제
DROP TABLE IF EXISTS audit_logs;

-- 3. 마이그레이션 레코드 삭제
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20250121000002';
```

**주의사항**:
- ⚠️ 프로덕션 데이터베이스 롤백은 매우 위험
- 반드시 백업 후 진행
- 가능하면 hotfix로 문제 해결 권장

### 7.3 긴급 상황 대응

**심각한 버그 발견 시**:

1. **즉시 Vercel 롤백** (이전 안정 버전으로)
2. **Slack 알림** (팀원들에게 상황 공유)
3. **Sentry에서 에러 확인** (근본 원인 파악)
4. **Hotfix 브랜치 생성**
   ```bash
   git checkout -b hotfix/critical-bug main
   # 버그 수정
   git commit -m "hotfix: Fix critical bug in production"
   git push origin hotfix/critical-bug
   ```
5. **긴급 배포**
   ```bash
   git checkout main
   git merge hotfix/critical-bug
   git push origin main
   # Vercel 자동 배포 트리거
   ```

---

## 8. 모니터링 및 알림

### 8.1 Vercel Analytics

**Vercel Dashboard → Project → Analytics**

모니터링 지표:
- **Visitors**: 방문자 수
- **Page Views**: 페이지 조회수
- **Top Pages**: 가장 많이 방문한 페이지
- **Referrers**: 유입 경로
- **Devices**: 디바이스 분포 (Desktop/Mobile)

### 8.2 Sentry 모니터링

**Sentry Dashboard**

모니터링 항목:
- **Errors**: 에러 발생 빈도 및 유형
- **Performance**: Transaction 및 API 응답 시간
- **Releases**: 배포 버전별 에러 추적
- **Alerts**: 에러 임계값 초과 시 알림

**Sentry Release 추적**:

```bash
# Sentry CLI 설치
npm install -g @sentry/cli

# Release 생성 (배포 시 자동)
sentry-cli releases new "neo-certify@1.0.0"
sentry-cli releases set-commits "neo-certify@1.0.0" --auto
sentry-cli releases finalize "neo-certify@1.0.0"
```

**파일**: `vite.config.ts` (Sentry Release 자동화)

```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'your-org',
      project: 'neo-certify',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: {
        name: `neo-certify@${process.env.VITE_APP_VERSION}`,
        deploy: {
          env: process.env.VITE_ENVIRONMENT,
        },
      },
      sourcemaps: {
        assets: './dist/**',
      },
    }),
  ],
})
```

### 8.3 Slack 알림 설정

**Slack Incoming Webhook 생성**:

1. Slack 워크스페이스 → Apps → **Incoming Webhooks**
2. **Add to Slack** 클릭
3. 채널 선택: `#deployments` 또는 `#alerts`
4. Webhook URL 복사

**GitHub Actions에서 Slack 알림** (위 CI/CD 섹션 참조)

**Sentry에서 Slack 알림**:

1. Sentry Dashboard → Settings → Integrations
2. **Slack** 검색 후 설치
3. Alert Rule 생성:
   - Condition: Error count > 10 in 1 minute
   - Action: Send Slack notification to `#alerts`

---

## 9. 성능 최적화 (CDN)

### 9.1 Vercel Edge Network

Vercel은 자동으로 글로벌 CDN을 통해 정적 에셋 제공:

- **정적 파일 캐싱**: `dist/assets/` 하위 모든 파일
- **Cache-Control 헤더**: `vercel.json`에서 설정 (위 참조)
- **Edge Locations**: 전 세계 100+ 지역

### 9.2 이미지 최적화

**Vercel Image Optimization** (Next.js 전용이므로 Vite는 수동 최적화):

1. **WebP 포맷 사용**
2. **Lazy loading** (`loading="lazy"`)
3. **Responsive images** (`srcset`)

**Supabase Storage 이미지 변환**:

```typescript
const { data } = supabase.storage.from('products').getPublicUrl('image.jpg', {
  transform: {
    width: 800,
    height: 600,
    quality: 80,
    format: 'webp',
  },
})
```

---

## 10. 백업 및 재해 복구

### 10.1 Supabase 데이터베이스 백업

**자동 백업** (Supabase Pro 플랜):
- Daily backups (7일 보관)
- Point-in-time recovery (PITR) 가능

**수동 백업**:

```bash
# pg_dump로 백업
supabase db dump -f backup.sql

# 특정 테이블만 백업
supabase db dump -f backup.sql --data-only --table products --table lots

# 백업 파일 암호화 (선택)
gpg -c backup.sql
```

### 10.2 복구 절차

**전체 복구**:

```bash
# SQL 파일로 복구
supabase db reset
supabase db push --file backup.sql
```

**특정 테이블 복구**:

```sql
-- 테이블 데이터 삭제
TRUNCATE TABLE products CASCADE;

-- 백업에서 데이터 복원
\i backup.sql
```

### 10.3 재해 복구 계획 (DRP)

**RTO (Recovery Time Objective)**: 4시간
**RPO (Recovery Point Objective)**: 24시간

**재해 시나리오 및 대응**:

1. **Vercel 장애**:
   - 대응: Vercel Status 확인 후 대기
   - 복구: Vercel 자동 복구 (일반적으로 5분 이내)

2. **Supabase 장애**:
   - 대응: Supabase Status 확인
   - 복구: Supabase 자동 failover (Pro 플랜)

3. **전체 서비스 중단**:
   - 대응: 긴급 점검 페이지 표시
   - 복구: 백업에서 복원 (최대 4시간)

---

## 11. 유지보수 가이드

### 11.1 정기 점검 항목

**주간 점검**:
- [ ] Vercel 배포 로그 확인
- [ ] Sentry 에러 리포트 확인 및 대응
- [ ] Lighthouse 점수 확인
- [ ] npm audit 취약점 확인

**월간 점검**:
- [ ] 의존성 패키지 업데이트 (`npm outdated`)
- [ ] Supabase 데이터베이스 백업 검증
- [ ] 사용자 피드백 수집 및 분석
- [ ] 성능 지표 리뷰 (Core Web Vitals)

**분기 점검**:
- [ ] 보안 감사 (침투 테스트)
- [ ] 데이터베이스 성능 최적화 (쿼리 튜닝, 인덱스 재구성)
- [ ] 비용 분석 (Vercel, Supabase, Sentry)
- [ ] 기술 부채 해소

### 11.2 의존성 업데이트

**패키지 업데이트 절차**:

```bash
# 1. 업데이트 가능한 패키지 확인
npm outdated

# 2. 마이너/패치 버전만 업데이트 (안전)
npm update

# 3. 메이저 버전 업데이트 (신중히)
npm install react@latest react-dom@latest

# 4. 테스트 실행
npm run test

# 5. 로컬 확인
npm run dev

# 6. 배포
git add package.json package-lock.json
git commit -m "chore: Update dependencies"
git push origin main
```

### 11.3 보안 패치

**취약점 발견 시**:

```bash
# 1. 취약점 확인
npm audit

# 2. 자동 수정 (가능한 경우)
npm audit fix

# 3. 강제 수정 (breaking change 주의)
npm audit fix --force

# 4. 수동 수정 (특정 패키지)
npm install package-name@latest

# 5. 검증
npm audit
npm run test
```

---

## 12. 테스트 시나리오

### 12.1 배포 파이프라인 테스트

```typescript
// 배포 파이프라인은 수동 테스트
describe('Deployment Pipeline (Manual)', () => {
  it('PR 생성 시 Preview 환경이 자동 생성되어야 한다', async () => {
    // 1. 새 브랜치 생성
    // git checkout -b feature/test-deploy

    // 2. 코드 변경 및 커밋
    // git commit -m "test: Test deployment"

    // 3. PR 생성
    // gh pr create --title "Test Deployment"

    // 4. Vercel에서 Preview URL 생성 확인
    // Expected: Vercel bot이 PR에 comment 추가

    // 5. Preview URL 접속하여 변경사항 확인
  })

  it('main 브랜치에 merge 시 Production 배포되어야 한다', async () => {
    // 1. PR을 main에 merge
    // gh pr merge <PR_NUMBER> --squash

    // 2. GitHub Actions workflow 실행 확인
    // Expected: CI/CD 파이프라인 성공

    // 3. Vercel Production 배포 확인
    // Expected: https://neo-certify.com 업데이트됨
  })
})
```

### 12.2 롤백 테스트

```bash
# 롤백 테스트 (Manual)

# 1. 현재 프로덕션 버전 확인
curl -I https://neo-certify.com | grep "x-vercel-id"

# 2. 이전 배포로 롤백
vercel promote <PREVIOUS_DEPLOYMENT_URL> --prod

# 3. 롤백 확인 (30초 대기)
sleep 30
curl -I https://neo-certify.com | grep "x-vercel-id"

# Expected: Deployment ID가 이전 버전으로 변경됨
```

### 12.3 모니터링 테스트

```typescript
import { captureException } from '@/config/sentry'
import { describe, it, expect } from 'vitest'

describe('Monitoring Integration', () => {
  it('에러 발생 시 Sentry에 전송되어야 한다', async () => {
    // Given: 테스트 에러
    const testError = new Error('Test error for Sentry')

    // When: captureException 호출
    captureException(testError, { test: true })

    // Then: Sentry Dashboard에서 에러 확인 (수동)
    // Expected: Sentry Dashboard에 "Test error for Sentry" 표시
  })
})
```

### 12.4 성능 테스트

```bash
# Lighthouse CI 실행
npm run build
npm run preview &
lhci autorun

# Expected:
# Performance: 90+
# Accessibility: 90+
# Best Practices: 90+
# SEO: 90+
```

---

## 13. 트러블슈팅

### 13.1 Vercel 빌드 실패

**증상**:
```
Error: Build failed with exit code 1
Module not found: Error: Can't resolve '@/components/...'
```

**원인**:
- 의존성 패키지 미설치
- TypeScript 경로 alias 설정 오류

**해결**:
```bash
# package.json 확인
cat package.json

# package-lock.json 재생성
rm -rf node_modules package-lock.json
npm install

# tsconfig.json 경로 확인
cat tsconfig.json | grep paths

# 로컬 빌드 테스트
npm run build
```

### 13.2 환경 변수가 프로덕션에서 undefined

**증상**:
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL) // undefined
```

**원인**:
- Vercel 환경 변수 미설정
- 환경 변수 이름 오타

**해결**:
1. Vercel Dashboard → Settings → Environment Variables 확인
2. 변수 이름이 `VITE_` 접두사로 시작하는지 확인
3. Production 환경에 체크되어 있는지 확인
4. 재배포 (Vercel Dashboard → Deployments → Redeploy)

### 13.3 Supabase 연결 에러

**증상**:
```
Error: Invalid API key
```

**원인**:
- Anon Key가 잘못됨
- Supabase URL이 잘못됨

**해결**:
```bash
# Supabase Dashboard에서 올바른 값 확인
# Settings → API

# .env.production 업데이트
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Vercel 환경 변수 업데이트 후 재배포
```

### 13.4 CORS 에러

**증상**:
```
Access to fetch at 'https://xxxxx.supabase.co' from origin 'https://neo-certify.com'
has been blocked by CORS policy
```

**원인**:
- Supabase에서 도메인이 허용되지 않음

**해결**:
1. Supabase Dashboard → Settings → API
2. **Site URL** 설정: `https://neo-certify.com`
3. **Redirect URLs** 추가: `https://neo-certify.com/**`

### 13.5 이미지 로딩 실패 (404)

**증상**:
- 로컬에서는 이미지 로딩되지만 프로덕션에서 404

**원인**:
- 이미지 파일이 `public/` 폴더에 없음
- 이미지 경로가 잘못됨

**해결**:
```typescript
// ❌ 잘못된 경로
<img src="/src/assets/logo.png" />

// ✅ 올바른 경로 (Vite import)
import logo from '@/assets/logo.png'
<img src={logo} />

// ✅ 또는 public 폴더 사용
// public/logo.png
<img src="/logo.png" />
```

---

## 14. Definition of Done

### 14.1 Supabase 설정
- [ ] 프로덕션 Supabase 프로젝트 생성 완료
- [ ] 데이터베이스 마이그레이션 완료 (모든 테이블 생성)
- [ ] RLS 정책 활성화 확인
- [ ] 백업 설정 완료 (Pro 플랜)

### 14.2 Vercel 배포
- [ ] Vercel 프로젝트 생성 및 GitHub 연동 완료
- [ ] 환경 변수 설정 완료 (Production, Preview)
- [ ] 첫 배포 성공 확인
- [ ] 도메인 연결 완료 (선택)
- [ ] SSL 인증서 발급 완료 (HTTPS)

### 14.3 CI/CD
- [ ] GitHub Actions 워크플로우 생성 완료
- [ ] 자동 테스트 실행 확인 (lint, test, build)
- [ ] PR 생성 시 Preview 환경 자동 생성 확인
- [ ] main 브랜치 push 시 자동 배포 확인

### 14.4 모니터링
- [ ] Sentry 설정 완료 (에러 추적)
- [ ] Vercel Analytics 활성화
- [ ] Slack 알림 설정 완료
- [ ] Lighthouse CI 설정 완료

### 14.5 보안
- [ ] 보안 헤더 설정 확인 (CSP, HSTS, X-Frame-Options)
- [ ] HTTPS 강제 리다이렉트 확인
- [ ] npm audit 취약점 0개 확인

### 14.6 성능
- [ ] Lighthouse 점수: Performance 90+ 달성
- [ ] 페이지 로드 시간 < 3초
- [ ] 번들 크기 < 500KB (gzipped)

### 14.7 테스트
- [ ] 배포 파이프라인 수동 테스트 완료
- [ ] 롤백 절차 테스트 완료
- [ ] 프로덕션 환경에서 주요 기능 테스트 완료

### 14.8 문서화
- [ ] README에 배포 가이드 추가 완료
- [ ] CHANGELOG 작성 완료
- [ ] 운영 매뉴얼 작성 완료
- [ ] 롤백 절차 문서화 완료

### 14.9 백업 및 복구
- [ ] 데이터베이스 백업 설정 완료
- [ ] 백업 복구 절차 테스트 완료
- [ ] 재해 복구 계획 (DRP) 수립 완료

### 14.10 운영
- [ ] 정기 점검 체크리스트 작성 완료
- [ ] 의존성 업데이트 가이드 작성 완료
- [ ] 온콜(On-call) 담당자 지정 완료

---

## 15. Git Commit 메시지

### 15.1 Vercel 설정
```bash
git add vercel.json
git commit -m "feat(deploy): Add Vercel deployment configuration

- Configure build settings and environment variables
- Add security headers (CSP, HSTS, X-Frame-Options)
- Set up caching for static assets
- Add redirects and rewrites for SPA routing

Refs: #DEPLOY-001"
```

### 15.2 GitHub Actions CI/CD
```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): Add GitHub Actions CI/CD pipeline

- Add lint, test, build, security audit jobs
- Add Lighthouse CI for performance testing
- Add Slack notification on deployment
- Auto-run on push to main and PR creation

Refs: #DEPLOY-002"
```

### 15.3 배포 스크립트
```bash
git add package.json
git commit -m "chore(deploy): Add deployment scripts

- Add test:ci script for coverage reporting
- Add preview script for local production testing
- Update build script for production optimization

Refs: #DEPLOY-003"
```

### 15.4 문서화
```bash
git add docs/deployment-guide.md README.md
git commit -m "docs(deploy): Add comprehensive deployment guide

- Add Supabase production setup guide
- Add Vercel deployment steps
- Add CI/CD pipeline documentation
- Add rollback procedures and troubleshooting

Refs: #DEPLOY-004"
```

---

## 16. 참고 자료

### 16.1 공식 문서
- [Vercel 문서](https://vercel.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

### 16.2 배포 가이드
- [Vite Production Build](https://vitejs.dev/guide/build.html)
- [Vercel Edge Network](https://vercel.com/docs/concepts/edge-network/overview)
- [Supabase Backups](https://supabase.com/docs/guides/platform/backups)

### 16.3 모범 사례
- [12 Factor App](https://12factor.net/)
- [DevOps Best Practices](https://cloud.google.com/architecture/devops)
- [Site Reliability Engineering](https://sre.google/)

### 16.4 관련 Phase
- **Phase 8.1**: 환경 변수 관리 (배포 환경별 설정)
- **Phase 8.2**: 에러 로깅 및 모니터링 (Sentry 통합)
- **Phase 8.3**: 성능 최적화 (Lighthouse CI)
- **Phase 8.4**: 보안 강화 (보안 헤더, HTTPS)

---

**문서 버전**: 1.0
**최종 수정일**: 2025-01-21
**작성자**: Development Team
**승인자**: DevOps Lead

---

## 17. 부록: 빠른 배포 체크리스트

### 첫 배포 (Initial Deployment)

```bash
# 1. Supabase 프로젝트 생성
# → https://app.supabase.com/

# 2. 마이그레이션 실행
supabase link --project-ref <PROJECT_REF>
supabase db push

# 3. Vercel 프로젝트 생성
# → https://vercel.com/new

# 4. 환경 변수 설정
# → Vercel Dashboard → Settings → Environment Variables

# 5. 배포
git push origin main

# 6. 검증
curl -I https://neo-certify.vercel.app
```

### 일상적인 배포 (Regular Deployment)

```bash
# 1. 코드 변경
git checkout -b feature/new-feature

# 2. 테스트
npm run test
npm run lint

# 3. 커밋 및 푸시
git add .
git commit -m "feat: Add new feature"
git push origin feature/new-feature

# 4. PR 생성 및 리뷰
gh pr create --title "Add new feature"

# 5. Merge to main (자동 배포 트리거)
gh pr merge <PR_NUMBER> --squash

# 6. 배포 확인
# → Vercel Dashboard에서 배포 상태 확인
```

### 긴급 롤백 (Emergency Rollback)

```bash
# Vercel CLI로 즉시 롤백
vercel list
vercel promote <PREVIOUS_DEPLOYMENT_URL> --prod

# 확인
curl -I https://neo-certify.com
```

---

**🎉 축하합니다! Neo Certificate System의 모든 개발 단계 문서가 완성되었습니다. 이제 실제 개발을 시작할 준비가 완료되었습니다!**
