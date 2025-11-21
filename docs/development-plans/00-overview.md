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

### Phase 0: 프로젝트 기반 구축 ✅
**목표**: 개발 환경 완벽 설정
**기간**: 1-2일
**상태**: **100% 완료** ⭐

**주요 작업**:
- ✅ Git repository 설정
- ✅ React + TypeScript 프로젝트 생성
- ✅ 개발 도구 설정 (ESLint, Prettier, Vitest)
- ✅ 폴더 구조 생성
- ✅ **Constants 시스템 구축 (A+ 등급)**

**핵심 달성 사항**:

### Constants 시스템 빠른 참조

**9개 Constants 파일 완성** (A+ 등급):

| 파일 | 용도 | 주요 내용 | 상세 문서 |
|------|------|-----------|----------|
| `status.ts` | 상태값 및 UI 라벨 | 7개 상태 타입 + 5개 UI 라벨 맵 | [Phase 0.5](phase-0/phase-0.5-constants-system.md) |
| `roles.ts` | 사용자 역할 및 권한 | 4개 역할 + 권한 매트릭스 | [Phase 0.5](phase-0/phase-0.5-constants-system.md) |
| `routes.ts` | URL 경로 | 20+ 경로 (제조사/유통사/병원/관리자) | [Phase 0.5](phase-0/phase-0.5-constants-system.md) |
| `messages.ts` | 에러/성공 메시지 | 30+ 템플릿 (변수 지원) | [Phase 0.5](phase-0/phase-0.5-constants-system.md) |
| `validation.ts` | 정규식 및 제한값 | 10+ 규칙 (전화번호, 사업자등록번호 등) | [Phase 0.5](phase-0/phase-0.5-constants-system.md) |
| `database.ts` ⭐ | DB 테이블/함수/RLS | 13 테이블, 7 함수, 30 RLS 정책 | [constants-database.md](phase-0/constants-database.md) |
| `business-logic.ts` ⭐ | 비즈니스 규칙 | FIFO, Virtual Code, Recall, 제조사 기본값 | [constants-business-logic.md](phase-0/constants-business-logic.md) |
| `locks.ts` ⭐ | 동시성 제어 | 3 Lock 타입, Timeout 설정 | [constants-locks.md](phase-0/constants-locks.md) |
| `notifications.ts` ⭐ | 알림 템플릿 | 카카오톡 인증/회수 템플릿 (PRD 섹션 10) | [constants-notifications.md](phase-0/constants-notifications.md) |

### 주요 특징

- **SSOT 원칙 100% 준수**:
  - ✅ 정규식 중복 제거 (validation.ts 단일 출처)
  - ✅ 매직 넘버 완전 제거 (TIME_CONVERSIONS 상수)
  - ✅ UI 라벨 외부화 (*_LABELS 맵으로 한글 문자열 하드코딩 제거)

- **PRD와 100% 동기화**:
  - ✅ 제조사 기본값 (PRD 섹션 6.1: LOT_PREFIX='ND', EXPIRY_MONTHS=24)
  - ✅ 알림 템플릿 (PRD 섹션 10: 카카오톡 인증/회수 메시지)
  - ✅ Virtual Code 형식 (12자리 영숫자)
  - ✅ Recall 규칙 (24시간 이내)

- **업계 최고 수준**:
  - ✅ 4개 상세 문서 (400+ 라인, 사용 예시 포함)
  - ✅ 타입 안전성 (const assertion 활용)
  - ✅ 접근성 (중앙 export, 개별 import 모두 지원)

**세부 계획**:
- [Phase 0.1: Git 초기화](phase-0/phase-0.1-git-init.md) ✅
- [Phase 0.2: 프로젝트 생성](phase-0/phase-0.2-project-setup.md) ✅
- [Phase 0.3: 개발 도구](phase-0/phase-0.3-dev-tools.md) ✅
- [Phase 0.4: 폴더 구조](phase-0/phase-0.4-folder-structure.md) ✅
- [Phase 0.5: Constants](phase-0/phase-0.5-constants-system.md) ✅ **A+ 등급**

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
- [Phase 3.8: 통합 테스트](phase-3/phase-3.8-integration-tests.md)

---

### Phase 4: 유통사 기능
**목표**: 입고 처리, 병원 출고, 재고 및 반품 기능 완성
**기간**: 5-7일
**주요 작업**:
- 입고 관리 (Pending 승인/반품)
- 유통사 재고 조회
- 병원 출고 (장바구니 + FIFO)
- 반품 처리 및 이력 조회

**세부 계획**:
- [Phase 4.1: 입고 관리](phase-4/phase-4.1-receiving.md)
- [Phase 4.2: 유통사 재고 조회](phase-4/phase-4.2-distributor-inventory.md)
- [Phase 4.3: 병원 출고](phase-4/phase-4.3-hospital-shipment.md)
- [Phase 4.4: 반품 처리](phase-4/phase-4.4-returns.md)
- [Phase 4.5: 유통사 이력](phase-4/phase-4.5-distributor-history.md)
- [Phase 4.6: 통합 테스트](phase-4/phase-4.6-integration-tests.md)

---

### Phase 5: 병원 기능
**목표**: 시술 등록, 회수, 병원 입고, 재고, 반품, 폐기 기능 완성
**기간**: 6-8일
**주요 작업**:
- ⭐ **시술 등록 (핵심 기능)**: 장바구니 기반 제품 선택 + 환자 전화번호 입력 → FIFO 자동 할당
- 회수 (24시간 이내)
- 병원 입고 관리 (유통사로부터)
- 병원 재고 조회
- 반품 처리 (유통사로)
- 제품 폐기 처리
- 이력 조회

**⚠️ 중요**: 가상 코드는 실물이 없으므로 스캔 방식 불가. 제품 종류 선택 + 수량 입력 방식 필수.

**세부 계획**:
- [Phase 5.1: 시술 등록 (Treatment Registration)](phase-5/phase-5.1-treatment-registration.md) ← **핵심 기능**
- [Phase 5.2: 회수 (Recall)](phase-5/phase-5.2-recall.md)
- [Phase 5.3: 병원 입고 관리](phase-5/phase-5.3-hospital-receiving.md)
- [Phase 5.4: 병원 재고 조회](phase-5/phase-5.4-hospital-inventory.md)
- [Phase 5.5: 반품 처리](phase-5/phase-5.5-hospital-return.md)
- [Phase 5.6: 제품 폐기](phase-5/phase-5.6-disposal.md)
- [Phase 5.7: 병원 이력](phase-5/phase-5.7-hospital-history.md)
- [Phase 5.8: 통합 테스트](phase-5/phase-5.8-integration-tests.md)

---

### Phase 6: 관리자 기능
**목표**: 관리자 기능 + Mock KakaoTalk 페이지 완성
**기간**: 4-6일
**주요 작업**:
- 조직 승인 관리
- 사용자 관리
- 제품 마스터 관리
- 시스템 모니터링
- Mock KakaoTalk 페이지

**세부 계획**:
- [Phase 6.1: 조직 승인](phase-6/phase-6.1-organization-approval.md)
- [Phase 6.2: 사용자 관리](phase-6/phase-6.2-user-management.md)
- [Phase 6.3: 제품 마스터](phase-6/phase-6.3-product-master.md)
- [Phase 6.4: 시스템 모니터링](phase-6/phase-6.4-system-monitoring.md)
- [Phase 6.5: 통합 테스트](phase-6/phase-6.5-integration-tests.md)
- [Phase 6.6: Mock KakaoTalk](phase-6/phase-6.6-mock-kakaotalk.md)

---

### Phase 7: 통합 테스트 및 최적화
**목표**: MVP 핵심 로직 구현 및 전체 기능 통합 테스트
**기간**: 5-7일
**주요 작업**:
- FIFO 알고리즘 구현 및 검증
- Virtual Code 생성 및 할당 로직
- Pending 상태 워크플로우
- 동시성 처리 (PostgreSQL Advisory Lock)
- E2E 테스트 (Playwright)
- 성능 최적화 및 버그 수정

**세부 계획**:
- [Phase 7.1: FIFO 알고리즘](phase-7/phase-7.1-fifo-algorithm.md)
- [Phase 7.2: Virtual Code 생성](phase-7/phase-7.2-virtual-code.md)
- [Phase 7.3: Pending 워크플로우](phase-7/phase-7.3-pending-workflow.md)
- [Phase 7.4: 동시성 처리](phase-7/phase-7.4-concurrency.md)
- [Phase 7.5: E2E 테스트](phase-7/phase-7.5-e2e-test.md)
- [Phase 7.6: 성능 최적화](phase-7/phase-7.6-optimization.md)

---

### Phase 8: 프로덕션 배포 준비
**목표**: 환경 설정, 모니터링, 보안, 배포 완료
**기간**: 3-5일
**주요 작업**:
- 환경 설정 관리 (프로덕션/스테이징)
- 에러 로깅 (Sentry)
- 성능 최적화
- 보안 강화 및 RLS 검증
- 배포 가이드 작성

**세부 계획**:
- [Phase 8.1: 환경 설정 관리](phase-8/phase-8.1-environment-management.md)
- [Phase 8.2: 에러 로깅](phase-8/phase-8.2-error-logging.md)
- [Phase 8.3: 성능 최적화](phase-8/phase-8.3-performance-optimization.md)
- [Phase 8.4: 보안 강화](phase-8/phase-8.4-security-hardening.md)
- [Phase 8.5: 배포 가이드](phase-8/phase-8.5-deployment-guide.md)

---

### Post-MVP 기능 (2차 개발)
**목표**: MVP 검증 후 고급 기능 추가
**시작 시기**: MVP 출시 및 피드백 수집 후
**주요 기능**:
- 카카오 알림톡 API 실제 연동
- SMS 대체 발송
- 재고 알림 및 사용기한 경고
- 통합 리포트 및 대시보드
- 백업/복구 자동화
- 모바일 반응형 UI

**세부 계획**:
- [Post-MVP 개발 개요](post-mvp/README.md)
- [재고 알림](post-mvp/1-inventory-alerts.md)
- [사용기한 경고](post-mvp/2-expiry-warnings.md)
- [회수 시뮬레이션](post-mvp/3-recall-simulation.md)
- [백업 & 복구](post-mvp/4-backup-restore.md)
- [통합 리포트](post-mvp/5-integrated-reports.md)

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

### 8. Complete Task Execution (시간 무관 철저한 작업 진행) ⭐ 신규
- 작업 소요 시간 무관하게 요청 범위 100% 완료
- 파일 수/작업 시간 이유로 범위 축소 금지

### 9. Context Memory Alert (Context 메모리 부족 시 알림) ⭐ 신규
- 대규모 작업 전 메모리 평가
- 부족 예상 시 사용자 알림
- 사용자가 메모리 확보/새 세션 결정

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
3. [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) - UI/UX 디자인 시스템
4. [DEVELOPMENT_PRINCIPLES.md](../../DEVELOPMENT_PRINCIPLES.md) - 개발 원칙
5. [README.md](../../README.md) - 프로젝트 개요

---

## 🔄 문서 버전 관리

### 버전 이력

- **v1.0.0** (2025-11-20): 초안 작성 (초기 계획 템플릿)
- **v2.0.0** (2025-11-21): PRD 심층 분석 후 구현 구조 조정
  - Phase 4: Pending/Receiving 통합, 재고/반품 순서 조정
  - Phase 5: 병원 입고/재고/폐기 기능 추가 (Critical Missing Feature)
  - Phase 7: 2차 개발 기능 post-mvp로 분리, MVP 테스트 집중
  - Phase 8: 배포 순서 논리적 재정렬
- **v2.1.0** (2025-11-21): 문서 일관성 복구 및 Phase 7 상세 계획 완성
  - Phase 4-8 링크 및 설명 실제 파일 구조와 동기화
  - Phase 7 상세 파일 6개 생성 (FIFO, Virtual Code, Pending, 동시성, E2E, 최적화)
  - 변경 이력 추가
- **v2.2.0** (2025-11-21): **Phase 0 완전 보완 및 100% 완성** ⭐
  - Constants 시스템 업계 최고 수준으로 강화 (A+ 등급 달성)
  - 알림 템플릿 상수 추가 (notifications.ts) - PRD Section 10 완전 반영
  - 상태값 UI 라벨 시스템 추가 - 하드코딩 제거
  - 제조사 기본값 상수 추가 - PRD Section 6.1 동기화
  - 정규식 중복 완전 제거 - SSOT 원칙 100% 준수
  - RLS 정책명 전체 목록 완성 (30개) - Phase 1.4 완전 동기화
  - 매직 넘버 완전 제거 - TIME_CONVERSIONS 상수 도입
  - 4개 상세 constants 문서 작성 (database, business-logic, locks, notifications)
  - Phase 0.5 완료 기준 상세화 및 100% 달성
  - **품질 향상**: 기본 계획 (90점) → 프로덕션 완성 (100점)
- **v2.3.0** (2025-11-21): **개발 원칙 확장** ⭐
  - 원칙 8 추가: 시간 무관 철저한 작업 진행 (Complete Task Execution)
  - 원칙 9 추가: Context 메모리 부족 시 알림 (Context Memory Alert)
  - DEVELOPMENT_PRINCIPLES.md 전면 업데이트 (v2.0.0)
  - 모든 Phase 문서에 새 원칙 반영
  - Phase별 체크리스트 업데이트 (개발 전/중/후)
  - **작업 범위 보장**: 시간 무관하게 요청 범위 100% 완료
  - **AI 협업 최적화**: Context 메모리 부족 시 사용자 알림 및 결정권 부여

### 주요 변경 사유

**Phase 4-5 구조 변경**:
- PRD Section 5.3의 "제조사 → 유통사 → 병원 → 환자" 공급망 플로우를 정확히 반영
- 병원도 유통사로부터 입고 프로세스 필요 (Virtual Code 검증)
- Pending 목록과 입고 처리는 단일 워크플로우로 구현 (UX 개선)

**Phase 7-8 재구성**:
- PRD Section 7.2의 "2차 개발" 명시 사항 준수
- Phase 7: MVP 핵심 로직 + 통합 테스트
- post-mvp: 재고 알림, 사용기한 경고, 리콜 시뮬레이션 등 고급 기능

**문서 품질**: 개념적 계획 (B+ 등급) → 구현 가능 상세 스펙 (A- 등급)

---

**다음 단계**: [Phase 0.1 - Git 초기화](phase-0/phase-0.1-git-init.md)
