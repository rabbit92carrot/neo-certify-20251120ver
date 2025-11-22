# Neo-Certify

PDO 실 의료기기 인증 및 공급망 추적 SaaS 플랫폼

## 📋 프로젝트 개요

Neo-Certify는 PDO threads 의료기기의 생산부터 환자 시술까지 전 과정을 추적하여 정품을 인증하는 SaaS 플랫폼입니다.

### 핵심 가치

- **투명성**: 유통 전 과정의 이력 추적
- **신뢰성**: 가상 식별코드 기반 정품 인증
- **효율성**: 최소 입력으로 모든 거래 처리
- **확장성**: 다른 제조사로 확장 가능한 구조

## 🛠 기술 스택

### Frontend
- **Framework**: Vite 7 + React 19 + TypeScript 5.9
- **UI**: shadcn/ui + Tailwind CSS
- **State**: React Context + TanStack Query v5
- **Forms**: React Hook Form + Zod
- **Table**: TanStack Table v8
- **Date**: date-fns (Asia/Seoul)
- **Routing**: React Router v7

### Backend & Database
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Functions**: Supabase Edge Functions (Deno)

### Development Tools
- **Testing**: Vitest + React Testing Library + Playwright
- **Linting**: ESLint (strict TypeScript, no 'any' types)
- **Formatting**: Prettier
- **Git**: Conventional Commits

## 🚀 시작하기

### 필수 요구사항

- Node.js 18+
- npm 9+
- Git

### 설치

```bash
# 저장소 클론
git clone https://github.com/rabbit92carrot/neo-certify-20251120ver.git
cd neo-certify-20251120ver

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 Supabase 설정을 입력하세요
```

### 개발 서버 실행

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

## 📝 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 테스트 실행
npm run test

# 테스트 UI
npm run test:ui

# 테스트 커버리지
npm run test:coverage

# ESLint 검사
npm run lint

# ESLint 자동 수정
npm run lint:fix

# Prettier 포맷팅
npm run format

# Prettier 검사
npm run format:check
```

## 📁 프로젝트 구조

```
neo-certify-20251120ver/
├── docs/                          # 개발 계획 문서
│   └── development-plans/         # Phase별 상세 계획
├── src/
│   ├── components/                # React 컴포넌트
│   │   ├── ui/                    # shadcn/ui 컴포넌트
│   │   ├── common/                # 공통 컴포넌트
│   │   ├── manufacturer/          # 제조사 전용
│   │   ├── distributor/           # 유통사 전용
│   │   ├── hospital/              # 병원 전용
│   │   └── admin/                 # 관리자 전용
│   ├── pages/                     # 페이지 컴포넌트
│   │   ├── auth/                  # 인증 페이지
│   │   ├── manufacturer/
│   │   ├── distributor/
│   │   ├── hospital/
│   │   ├── admin/
│   │   └── mock/                  # Mock KakaoTalk
│   ├── constants/                 # SSOT 상수 (12 files)
│   ├── types/                     # TypeScript 타입
│   ├── lib/                       # 유틸리티 & 외부 라이브러리
│   ├── hooks/                     # Custom React Hooks
│   ├── services/                  # API 서비스
│   ├── contexts/                  # React Context
│   └── utils/                     # 일반 유틸리티
├── tests/
│   ├── unit/                      # 단위 테스트
│   ├── integration/               # 통합 테스트
│   └── e2e/                       # E2E 테스트
└── public/                        # 정적 파일
```

## 🎯 Phase 0 완료 내역

### ✅ 완료된 작업

1. **Git 초기화** - Branching strategy 수립
2. **프로젝트 설정** - Vite + React + TypeScript
3. **개발 도구** - ESLint, Prettier, Vitest
4. **폴더 구조** - src/ 및 tests/ 디렉토리 생성
5. **Constants 시스템** - SSOT 원칙 기반 12개 파일 (A+ 등급)
6. **Feature Flags** - MVP/프로덕션 모드 전환

### 📊 주요 지표

- **TypeScript Strict Mode**: ✅ 활성화
- **'any' 타입 사용**: 0개 (ESLint로 강제)
- **Constants 파일**: 12개
- **테스트 통과**: 13/13 (100%)
- **코드 커버리지 목표**: 80%+ (비즈니스 로직 90%)

## 📚 문서

- [브랜치 전략](./BRANCHING_STRATEGY.md) - Git 워크플로우 및 Phase별 브랜치 구조
- [개발 원칙](./DEVELOPMENT_PRINCIPLES.md) - SSOT, Clean Code, TDD 원칙
- [PRD](./neo-cert-prd-1.2.md) - 제품 요구사항 정의서
- [개발 계획](./docs/development-plans/00-overview.md) - Phase별 개발 계획

## 🔐 환경 변수

`.env.local` 파일에 다음 변수들을 설정하세요:

```env
# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Feature Flags (MVP Mode)
VITE_AUTO_APPROVE_ORGANIZATIONS=true
VITE_SKIP_EMAIL_VERIFICATION=true
VITE_ENABLE_MOCK_KAKAOTALK=true
```

## 🤝 기여하기

1. Feature 브랜치 생성 (`git checkout -b feature/phase-X-feature-name`)
2. 변경사항 커밋 (`git commit -m 'feat(phase-X): add feature'`)
3. 브랜치 푸시 (`git push origin feature/phase-X-feature-name`)
4. Pull Request 생성

### Commit 규칙

Conventional Commits 형식을 따릅니다:

```
<type>(<scope>): <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `perf`

## 📞 문의

- **개발자**: rabbit92carrot
- **이메일**: rabbit92carrot@gmail.com
- **Repository**: https://github.com/rabbit92carrot/neo-certify-20251120ver

## 📄 라이선스

This project is private and proprietary.

---

**현재 Phase**: Phase 0 완료 ✅
**다음 Phase**: Phase 1 - 데이터베이스 설계
