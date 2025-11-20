# 네오인증서 (Neo Certificate System)

PDO threads 의료기기 생산-유통-시술 전 과정 추적 및 정품 인증 SaaS 플랫폼

## 📋 프로젝트 개요

**제조사**: 주식회사 네오닥터
**버전**: 1.0.0 (MVP)
**PRD 버전**: 1.2

### 핵심 기능
- 제조사의 생산 관리 및 Lot 추적
- 유통사의 입출고 관리 (Pending 승인 시스템)
- 병원의 시술 등록 및 환자 인증 발급
- 관리자의 전체 이력 조회 및 모니터링
- 가상 식별코드 기반 FIFO 재고 관리

## 🛠 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript 5
- **Build Tool**: Vite
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: React Context + TanStack Query
- **Form**: React Hook Form + Zod
- **Routing**: React Router v6
- **Table**: TanStack Table
- **Date/Time**: date-fns (Asia/Seoul)

### Backend & Database
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Migration Tool**: Supabase CLI
- **Edge Functions**: Deno

### Development
- **Local DB**: Docker Compose (Supabase Stack)
- **Testing**: Vitest + React Testing Library + Playwright
- **Linting**: ESLint (Frontend) + Deno Lint (Functions)
- **Code Quality**: Prettier, TypeScript Strict Mode

## 🚀 시작하기

### 사전 요구사항
- Node.js 18+
- npm 또는 yarn
- Docker & Docker Compose
- Supabase CLI

### 설치

```bash
# 저장소 클론
git clone https://github.com/rabbit92carrot/neo-certify-20251120ver.git
cd neo-certify-20251120ver

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 실제 값으로 수정

# Supabase 로컬 환경 시작
supabase start

# 개발 서버 시작
npm run dev
```

### Supabase 로컬 개발

```bash
# Supabase 로컬 스택 시작
supabase start

# 마이그레이션 적용
supabase db push

# Studio 접속
# http://localhost:54323
```

## 📁 프로젝트 구조

```
neo-certify-20251120ver/
├── docs/                      # 개발 계획 및 문서
│   └── development-plans/     # Phase별 상세 계획서
├── supabase/                  # Supabase 설정 및 마이그레이션
│   ├── migrations/            # DB 마이그레이션 파일
│   └── functions/             # Edge Functions
├── src/                       # 소스 코드
│   ├── components/            # React 컴포넌트
│   ├── pages/                 # 페이지 컴포넌트
│   ├── constants/             # 전역 상수 (SSOT)
│   ├── types/                 # TypeScript 타입 정의
│   ├── lib/                   # 유틸리티 함수
│   ├── hooks/                 # Custom Hooks
│   ├── services/              # API 서비스
│   └── contexts/              # React Context
└── tests/                     # 테스트 파일
```

## 📖 개발 문서

모든 개발 계획은 `docs/development-plans/` 디렉토리에 Phase별로 정리되어 있습니다.

- [전체 개요](docs/development-plans/00-overview.md)
- [Phase 0: 프로젝트 기반 구축](docs/development-plans/phase-0/)
- [Phase 1: 데이터베이스 설계](docs/development-plans/phase-1/)
- [Phase 2: 인증 및 UI 프레임워크](docs/development-plans/phase-2/)
- [Phase 3-8: 기능 개발](docs/development-plans/)

## 🎯 개발 원칙

1. **SSOT (Single Source of Truth)**: 모든 상수와 설정은 단일 위치에서 관리
2. **No Magic Numbers**: 모든 리터럴 값은 상수로 정의
3. **No 'any' Type**: TypeScript strict mode, unknown + type guard 사용
4. **Clean Code**: 의미있는 변수명, 함수는 단일 책임
5. **Test-Driven**: 모든 모듈은 테스트와 함께 개발
6. **Git Conventional Commits**: 최소 작업 단위마다 의미있는 커밋

자세한 내용은 [DEVELOPMENT_PRINCIPLES.md](DEVELOPMENT_PRINCIPLES.md)를 참조하세요.

## 🧪 테스트

```bash
# 단위 테스트 실행
npm run test

# 커버리지 확인
npm run test:coverage

# E2E 테스트 실행
npm run test:e2e
```

## 📝 Git Commit Convention

```
<type>(<scope>): <subject>

예시:
feat(auth): 로그인 페이지 구현
fix(inventory): FIFO 로직 수정
test(product): 제품 CRUD 테스트 추가
docs(phase-1): 데이터베이스 설계 문서 작성
chore(setup): ESLint 설정 추가
```

**Types**: feat, fix, docs, test, chore, refactor, style

## 🔒 보안

- 민감한 정보는 절대 커밋하지 않습니다 (.env 파일 등)
- RLS(Row Level Security)를 통한 데이터 접근 제어
- 사업자등록증 파일은 Supabase Storage에 안전하게 저장
- XSS, SQL Injection 등 OWASP Top 10 취약점 방어

## 📄 라이선스

Proprietary - 주식회사 네오닥터

## 👥 팀

**개발**: rabbit92carrot
**문의**: rabbit92carrot@gmail.com

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [React 공식 문서](https://react.dev)
- [TypeScript 공식 문서](https://www.typescriptlang.org)
- [shadcn/ui](https://ui.shadcn.com)
