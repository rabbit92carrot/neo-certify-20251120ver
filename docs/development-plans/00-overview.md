# 네오인증서 시스템 - 전체 개발 계획 개요

## 📋 문서 정보

- **작성일**: 2024-01-20
- **버전**: 1.0.0
- **PRD 버전**: 1.2
- **작성자**: rabbit92carrot

---

## 🎯 프로젝트 목표

PDO threads 의료기기의 생산부터 환자 시술까지 전 과정을 추적하여 정품을 인증하는 SaaS 플랫폼 구축

### 핵심 가치
1. **투명성**: 유통 전 과정의 이력 추적
2. **신뢰성**: 가상 식별코드 기반 정품 인증
3. **효율성**: 최소 입력으로 모든 거래 처리
4. **확장성**: 다른 제조사로 확장 가능한 구조

---

## 🛠 기술 스택 (확정)

### Frontend
```yaml
Framework: Vite + React 18 + TypeScript 5
UI: shadcn/ui + Tailwind CSS
State: React Context + TanStack Query
Forms: React Hook Form + Zod
Table: TanStack Table
Date: date-fns (Asia/Seoul)
Routing: React Router v6
```

### Backend & Database
```yaml
Database: Supabase PostgreSQL
Auth: Supabase Auth
Storage: Supabase Storage
Migration: Supabase CLI
Functions: Deno (Edge Functions)
```

### Development
```yaml
Local DB: Docker Compose
Testing: Vitest + RTL + Playwright
Linting: ESLint + Deno Lint
Quality: Prettier + TypeScript Strict
```

### Supabase 환경
```yaml
Cloud URL: https://qveathzlquzvslobuewy.supabase.co
Timezone: Asia/Seoul (대한민국)
```

---

## 📊 Phase별 개발 계획 요약

### Phase 0: 프로젝트 기반 구축
**목표**: 개발 환경 완벽 설정
**기간**: 1-2일
**주요 작업**:
- Git repository 설정 ✅
- React + TypeScript 프로젝트 생성
- 개발 도구 설정 (ESLint, Prettier, Vitest)
- 폴더 구조 생성
- Constants 시스템 구축

**세부 계획**:
- [Phase 0.1: Git 초기화](phase-0/phase-0.1-git-init.md)
- [Phase 0.2: 프로젝트 생성](phase-0/phase-0.2-project-setup.md)
- [Phase 0.3: 개발 도구](phase-0/phase-0.3-dev-tools.md)
- [Phase 0.4: 폴더 구조](phase-0/phase-0.4-folder-structure.md)
- [Phase 0.5: Constants](phase-0/phase-0.5-constants-system.md)

---

### Phase 1: 데이터베이스 설계 및 구축
**목표**: Supabase 전체 스키마 완성 및 RLS 설정
**기간**: 3-5일
**주요 작업**:
- Docker로 Supabase 로컬 환경 구축
- 13개 테이블 마이그레이션 작성
- RLS 정책 구현 (조직별 격리)
- Supabase Storage 설정

**세부 계획**:
- [Phase 1.1: DB 설계](phase-1/phase-1.1-db-design.md)
- [Phase 1.2: 핵심 테이블](phase-1/phase-1.2-core-tables.md)
- [Phase 1.3: 관계 테이블](phase-1/phase-1.3-relations-tables.md)
- [Phase 1.4: RLS 정책](phase-1/phase-1.4-rls-policies.md)
- [Phase 1.5: Storage](phase-1/phase-1.5-storage-setup.md)

---

### Phase 2: 인증 및 UI 프레임워크
**목표**: 로그인/회원가입 + 역할별 레이아웃 완성
**기간**: 4-6일
**주요 작업**:
- Supabase Auth 통합
- 로그인/회원가입 UI
- 조직 등록 로직
- 역할 기반 레이아웃 및 라우팅

**세부 계획**:
- [Phase 2.1: Auth 설정](phase-2/phase-2.1-auth-setup.md)
- [Phase 2.2: 로그인 UI](phase-2/phase-2.2-login-ui.md)
- [Phase 2.3: 회원가입 UI](phase-2/phase-2.3-registration-ui.md)
- [Phase 2.4: 레이아웃](phase-2/phase-2.4-layout-navigation.md)
- [Phase 2.5: 라우팅](phase-2/phase-2.5-role-routing.md)

---

### Phase 3: 제조사 기능
**목표**: 제품 관리, 생산, 출고, 재고 기능 완성
**기간**: 7-10일
**주요 작업**:
- 제품 CRUD
- Lot 생산 등록 (자동 번호 생성)
- 출고 (장바구니 + FIFO/Lot 선택)
- 재고 조회 (제품별/일자별)
- 거래 이력

**세부 계획**:
- [Phase 3.1: 제품 목록](phase-3/phase-3.1-product-list.md)
- [Phase 3.2: 제품 CRUD](phase-3/phase-3.2-product-crud.md)
- [Phase 3.3: 제조사 설정](phase-3/phase-3.3-manufacturer-settings.md)
- [Phase 3.4: Lot 생산](phase-3/phase-3.4-lot-production.md)
- [Phase 3.5: 출고](phase-3/phase-3.5-shipment.md)
- [Phase 3.6: 재고](phase-3/phase-3.6-inventory.md)
- [Phase 3.7: 이력](phase-3/phase-3.7-history.md)
- [Phase 3.8: 통합 테스트](phase-3/phase-3.8-integration-test.md)

---

### Phase 4: 유통사 기능
**목표**: Pending 승인, 출고, 재고 기능 완성
**기간**: 5-7일
**주요 작업**:
- Pending 목록 조회
- 입고 수락/반품
- 출고 (장바구니 + FIFO)
- 재고 및 이력 조회

**세부 계획**:
- [Phase 4.1: Pending 목록](phase-4/phase-4.1-pending-list.md)
- [Phase 4.2: 입고 처리](phase-4/phase-4.2-receive-process.md)
- [Phase 4.3: 출고](phase-4/phase-4.3-shipment.md)
- [Phase 4.4: 재고](phase-4/phase-4.4-inventory.md)
- [Phase 4.5: 이력](phase-4/phase-4.5-history.md)
- [Phase 4.6: 통합 테스트](phase-4/phase-4.6-integration-test.md)

---

### Phase 5: 병원 기능
**목표**: 시술 등록, 회수, 반품 기능 완성
**기간**: 5-7일
**주요 작업**:
- 시술 등록 (장바구니 + 환자 전화번호)
- 회수 (24시간 제한)
- 반품
- 재고 및 이력 조회

**세부 계획**:
- [Phase 5.1: 시술 등록](phase-5/phase-5.1-treatment-registration.md)
- [Phase 5.2: 회수](phase-5/phase-5.2-recall.md)
- [Phase 5.3: 반품](phase-5/phase-5.3-return.md)
- [Phase 5.4: 재고](phase-5/phase-5.4-inventory.md)
- [Phase 5.5: 이력](phase-5/phase-5.5-history.md)
- [Phase 5.6: 통합 테스트](phase-5/phase-5.6-integration-test.md)

---

### Phase 6: 관리자 및 Mock KakaoTalk
**목표**: 관리 기능 + 알림 Mock 페이지 완성
**기간**: 4-6일
**주요 작업**:
- 조직/사용자 관리
- 전체 이력 조회 (TanStack Table)
- 회수 모니터링
- Mock KakaoTalk 페이지

**세부 계획**:
- [Phase 6.1: 조직/사용자 관리](phase-6/phase-6.1-org-user-management.md)
- [Phase 6.2: 이력 조회](phase-6/phase-6.2-history-query.md)
- [Phase 6.3: 회수 모니터링](phase-6/phase-6.3-recall-monitoring.md)
- [Phase 6.4: Mock KakaoTalk](phase-6/phase-6.4-mock-kakaotalk.md)
- [Phase 6.5: 통합 테스트](phase-6/phase-6.5-integration-test.md)

---

### Phase 7: 비즈니스 로직 및 통합
**목표**: 핵심 알고리즘 구현 및 전체 통합
**기간**: 5-7일
**주요 작업**:
- FIFO 알고리즘
- Virtual Code 생성/할당
- Pending 워크플로우
- 동시성 처리 (락)
- E2E 테스트

**세부 계획**:
- [Phase 7.1: FIFO](phase-7/phase-7.1-fifo-algorithm.md)
- [Phase 7.2: Virtual Code](phase-7/phase-7.2-virtual-code.md)
- [Phase 7.3: Pending](phase-7/phase-7.3-pending-workflow.md)
- [Phase 7.4: 동시성](phase-7/phase-7.4-concurrency.md)
- [Phase 7.5: E2E 테스트](phase-7/phase-7.5-e2e-test.md)
- [Phase 7.6: 최적화](phase-7/phase-7.6-optimization.md)

---

### Phase 8: 프로덕션 준비
**목표**: 보안, 배포, 문서화 완료
**기간**: 3-5일
**주요 작업**:
- 보안 감사 (OWASP Top 10)
- 에러 처리 및 UX 개선
- Cloud Supabase 마이그레이션
- 프로덕션 빌드
- 최종 문서화

**세부 계획**:
- [Phase 8.1: 보안 감사](phase-8/phase-8.1-security-audit.md)
- [Phase 8.2: 에러 처리](phase-8/phase-8.2-error-handling.md)
- [Phase 8.3: Cloud 마이그레이션](phase-8/phase-8.3-cloud-migration.md)
- [Phase 8.4: 프로덕션 빌드](phase-8/phase-8.4-production-build.md)
- [Phase 8.5: 문서화](phase-8/phase-8.5-documentation.md)

---

## 📅 전체 타임라인 (예상)

```
Week 1-2:  Phase 0-1 (기반 구축 + 데이터베이스)
Week 3-4:  Phase 2-3 (인증 + 제조사)
Week 5-6:  Phase 4-5 (유통사 + 병원)
Week 7-8:  Phase 6-7 (관리자 + 통합)
Week 9:    Phase 8 (프로덕션)
```

**총 예상 기간**: 9-12주 (2-3개월)

---

## 🎯 개발 원칙 (필수 준수)

모든 Phase에서 다음 원칙을 반드시 따라야 합니다:

### 1. SSOT (Single Source of Truth)
- 모든 상수는 `src/constants/`에 정의
- 중복 정의 금지

### 2. No Magic Numbers
- 모든 리터럴 값은 의미있는 상수로 정의

### 3. No 'any' Type
- TypeScript strict mode
- `unknown` + type guard 사용

### 4. Clean Code
- 의미있는 변수/함수명
- 함수는 단일 책임
- 주석 최소화

### 5. Test-Driven
- 모든 비즈니스 로직은 테스트와 함께
- 커버리지: 비즈니스 로직 90%, UI 70%, 전체 80%

### 6. Git Conventional Commits
- `<type>(<scope>): <subject>` 형식
- 최소 작업 단위마다 commit + push

### 7. Frontend-First
- UI 먼저 개발 (Mock 데이터)
- 가시적 확인 후 백엔드 연동

**자세한 내용**: [DEVELOPMENT_PRINCIPLES.md](../../DEVELOPMENT_PRINCIPLES.md)

---

## 📁 프로젝트 구조 (최종)

```
neo-certify-20251120ver/
├── docs/
│   └── development-plans/      # Phase별 상세 계획
├── supabase/
│   ├── migrations/             # DB 마이그레이션
│   ├── functions/              # Edge Functions
│   └── config.toml
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   ├── common/
│   │   ├── manufacturer/
│   │   ├── distributor/
│   │   ├── hospital/
│   │   └── admin/
│   ├── pages/
│   │   ├── auth/
│   │   ├── manufacturer/
│   │   ├── distributor/
│   │   ├── hospital/
│   │   └── admin/
│   ├── constants/              # SSOT
│   │   ├── index.ts
│   │   ├── status.ts
│   │   ├── messages.ts
│   │   ├── validation.ts
│   │   └── routes.ts
│   ├── types/
│   │   ├── database.ts
│   │   ├── entities.ts
│   │   └── api.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── utils.ts
│   │   └── validation.ts
│   ├── hooks/
│   ├── services/
│   ├── contexts/
│   └── App.tsx
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json
```

---

## ✅ Phase 완료 기준

각 Phase는 다음 조건을 모두 충족해야 완료로 간주합니다:

1. **기능 구현**: 계획된 모든 기능 완성
2. **테스트 통과**: 단위/통합 테스트 모두 통과
3. **타입 안전**: TypeScript 에러 0개
4. **코드 품질**: ESLint 에러 0개
5. **Git 커밋**: 모든 작업 커밋 및 push 완료
6. **문서 업데이트**: README 및 관련 문서 최신화
7. **다음 Phase 준비**: 선행 조건 모두 충족

---

## 🔄 Phase 간 의존성

```
Phase 0 (기반)
    ↓
Phase 1 (DB) ← 모든 Phase의 선행 조건
    ↓
Phase 2 (Auth + Layout) ← Phase 3-6의 선행 조건
    ↓
Phase 3 (제조사) ←─┐
Phase 4 (유통사) ←─┼─ Phase 7 (통합)의 선행 조건
Phase 5 (병원) ←───┤
Phase 6 (관리자) ←─┘
    ↓
Phase 7 (통합 + 비즈니스 로직)
    ↓
Phase 8 (프로덕션)
```

---

## 📞 문의 및 지원

- **개발자**: rabbit92carrot
- **이메일**: rabbit92carrot@gmail.com
- **Repository**: https://github.com/rabbit92carrot/neo-certify-20251120ver

---

## 📚 참고 문서

1. [PRD v1.2](../../neo-cert-prd-1.2.md) - 제품 요구사항 정의서
2. [UI Design Reference](../../UI-design-direction.png) - UI 디자인 가이드
3. [DEVELOPMENT_PRINCIPLES.md](../../DEVELOPMENT_PRINCIPLES.md) - 개발 원칙
4. [README.md](../../README.md) - 프로젝트 개요

---

## 🔄 문서 버전 관리

- **v1.0.0** (2024-01-20): 초안 작성
- 모든 수정사항은 Git commit history에 기록됨

---

**다음 단계**: [Phase 0.1 - Git 초기화](phase-0/phase-0.1-git-init.md)
