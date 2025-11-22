# Neo-Certify 브랜치 전략

## 📋 프로젝트 개요

**Neo-Certify**는 PDO 실 의료기기 인증 및 공급망 추적 SaaS 플랫폼입니다.

### 전체 개발 Phase 구조

- **Phase 0**: 프로젝트 기반 설정 (Git, React, TypeScript, Constants System)
- **Phase 1**: 데이터베이스 설계 (15 tables, 30 RLS policies)
- **Phase 2**: 인증 & UI 프레임워크 (Supabase Auth, Role-based Routing)
- **Phase 3**: 제조사 기능 (제품 관리, Lot 생산, 출하, 재고, 거래 내역)
- **Phase 4**: 유통사 기능 (입고 처리, 병원 출하, 반품, 거래 내역)
- **Phase 5**: 병원 기능 (시술 등록, 회수, 재고, 반품, 폐기, 거래 내역)
- **Phase 6**: 관리자 기능 (조직/사용자 승인, 시스템 모니터링, Mock KakaoTalk)
- **Phase 7**: 통합 테스트 & 최적화 (FIFO, Virtual Code, Concurrency, E2E)
- **Phase 8**: 프로덕션 준비 (보안, 에러 로깅, 배포)
- **Post-MVP**: 향후 고도화 기능 (알림, 시뮬레이션, 백업, 리포트)

---

## 🌿 브랜치 전략

### 브랜치 네이밍 규칙

총 **9개의 Feature 브랜치**를 순차적으로 생성하여 작업합니다.

```
main (프로덕션 브랜치 - 현재 계획 문서 유지)
├── feature/phase-0-foundation      # Phase 0: 프로젝트 기반 설정
├── feature/phase-1-database        # Phase 1: 데이터베이스 설계
├── feature/phase-2-auth-ui         # Phase 2: 인증 & UI 프레임워크
├── feature/phase-3-manufacturer    # Phase 3: 제조사 기능
├── feature/phase-4-distributor     # Phase 4: 유통사 기능
├── feature/phase-5-hospital        # Phase 5: 병원 기능
├── feature/phase-6-admin           # Phase 6: 관리자 기능
├── feature/phase-7-integration     # Phase 7: 통합 테스트 & 최적화
├── feature/phase-8-production      # Phase 8: 프로덕션 준비
└── feature/post-mvp                # Post-MVP: 향후 고도화 기능
```

### 병합 전략

**중요**: 각 Phase를 완료한 후 바로 main에 merge하지 **않습니다**.

1. Phase 0 완료 → Phase 1 브랜치를 **Phase 0 브랜치에서** 생성
2. Phase 1 완료 → Phase 2 브랜치를 **Phase 1 브랜치에서** 생성
3. 반복...
4. **모든 Phase (0~8 + Post-MVP) 완료 후** 최종 브랜치를 main에 한 번에 merge

**장점**:
- ✅ main 브랜치는 계획 문서만 유지 (작업 중 혼선 방지)
- ✅ 각 Phase 완료 판단 후 안전하게 다음 Phase 진행
- ✅ 전체 개발 완료 후 한 번에 프로덕션 배포 가능

---

## 🔄 작업 플로우

### 1. Phase 0 시작 (최초)

```bash
# main 브랜치에서 시작
git checkout main

# Phase 0 브랜치 생성 및 전환
git checkout -b feature/phase-0-foundation

# 작업 진행...
# (Git init, React 프로젝트 생성, Constants 시스템 구축 등)

# 커밋 (Conventional Commits 규칙 준수)
git add .
git commit -m "feat(phase-0): setup project foundation with constants system"

# 완료 확인 후 다음 Phase로 이동 준비
```

### 2. Phase 1 시작 (Phase 0 완료 후)

```bash
# 현재 Phase 0 브랜치에서 Phase 1 브랜치 생성
git checkout -b feature/phase-1-database

# 작업 진행...
# (DB 설계, 마이그레이션, RLS 정책 등)

# 커밋
git add .
git commit -m "feat(phase-1): create database schema with 15 tables and 30 RLS policies"
```

### 3. Phase 2~8 반복

```bash
# Phase N 완료 후 Phase N+1 시작
git checkout -b feature/phase-{N+1}-{name}

# 작업 진행...
# 커밋...
```

### 4. 이전 Phase 수정이 필요한 경우

**예시**: Phase 3 작업 중 Phase 1의 데이터베이스 스키마 수정이 필요한 경우

```bash
# Phase 3 브랜치에서 직접 수정
# (별도로 Phase 1 브랜치로 돌아가지 않음)

# 수정 사항 커밋 시 scope 명시
git commit -m "fix(phase-1): update products table schema for manufacturer feature"
```

**이유**:
- 각 Phase 브랜치가 선형적으로 이어지기 때문에 현재 브랜치에서 수정 가능
- 최종 merge 시 모든 변경사항이 반영됨

### 5. 최종 Merge (모든 Phase 완료 후)

```bash
# 현재 브랜치 확인 (feature/post-mvp 또는 마지막 Phase 브랜치)
git branch

# main 브랜치로 전환
git checkout main

# 최종 브랜치를 main에 merge
git merge feature/phase-8-production
# 또는 Post-MVP까지 완료한 경우
git merge feature/post-mvp

# 충돌 해결 (필요 시)
# ...

# main 브랜치를 원격 저장소에 push
git push origin main
```

---

## 📝 커밋 메시지 규칙

**Conventional Commits** 형식을 준수합니다.

### 기본 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type 종류

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서만 수정
- `refactor`: 코드 리팩토링 (기능 변경 없음)
- `test`: 테스트 추가/수정
- `chore`: 빌드/설정 변경
- `perf`: 성능 개선
- `style`: 코드 포맷팅 (세미콜론 등)

### Scope 예시

Phase 번호를 scope로 사용합니다:

```bash
# Phase 0
git commit -m "feat(phase-0): setup ESLint and Prettier configuration"
git commit -m "chore(phase-0): initialize Git repository"

# Phase 1
git commit -m "feat(phase-1): create organizations and users tables"
git commit -m "fix(phase-1): correct RLS policy for distributor access"

# Phase 3
git commit -m "feat(phase-3): implement FIFO algorithm for product allocation"
git commit -m "test(phase-3): add integration tests for shipment workflow"

# 여러 Phase에 걸친 수정
git commit -m "refactor(phase-1,phase-3): optimize virtual_codes table structure"
```

### 커밋 메시지 예시

```bash
# 좋은 예시
git commit -m "feat(phase-5): add 24-hour recall window validation"
git commit -m "fix(phase-4): correct pending ownership transfer logic"
git commit -m "test(phase-7): add E2E tests for multi-tier distribution"
git commit -m "docs(phase-2): update authentication flow diagram"

# 나쁜 예시
git commit -m "update code"
git commit -m "fix bug"
git commit -m "WIP"
```

---

## ✅ Phase별 완료 체크리스트

각 Phase를 완료하기 전 아래 사항을 확인합니다.

### Phase 0: 프로젝트 기반 설정
- [ ] Git 저장소 초기화 완료
- [ ] Vite + React + TypeScript 프로젝트 생성
- [ ] ESLint + Prettier 설정 완료
- [ ] 폴더 구조 생성 (`src/`, `docs/`, `tests/` 등)
- [ ] Constants 시스템 구축 (10개 파일)
  - [ ] `status.ts`
  - [ ] `roles.ts`
  - [ ] `routes.ts`
  - [ ] `messages.ts`
  - [ ] `validation.ts`
  - [ ] `terminology.ts`
  - [ ] `database.ts`
  - [ ] `business-logic.ts`
  - [ ] `locks.ts`
  - [ ] `notifications.ts`
- [ ] shadcn/ui + Tailwind CSS 설정 완료
- [ ] 개발 서버 정상 구동 확인

### Phase 1: 데이터베이스 설계
- [ ] Supabase 로컬 환경 구축
- [ ] ERD 설계 완료
- [ ] 15개 핵심 테이블 마이그레이션
  - [ ] organizations, users, manufacturer_settings
  - [ ] products, lots
  - [ ] virtual_codes, patients, history
  - [ ] shipments, shipment_details
  - [ ] treatment_records, treatment_details
  - [ ] return_requests, return_details
  - [ ] notification_messages
- [ ] 30개 RLS 정책 적용
- [ ] Supabase Storage 설정 (사업자등록증 업로드용)
- [ ] 데이터베이스 함수 작성 완료

### Phase 2: 인증 & UI 프레임워크
- [ ] Supabase Auth 통합
- [ ] AuthContext 구현
- [ ] 로그인 페이지 UI
- [ ] 회원가입 페이지 UI (조직 검색 포함)
- [ ] 역할 기반 레이아웃 (4가지: 제조사, 유통사, 병원, 관리자)
- [ ] 보호된 라우팅 구현
- [ ] 30분 비활동 시 자동 로그아웃

### Phase 3: 제조사 기능
- [ ] 제품 목록 조회
- [ ] 제품 CRUD (생성/수정/비활성화)
- [ ] 제조사 설정 (Lot 번호 규칙, 유통기한)
- [ ] Lot 생산 등록 (자동 번호 생성)
- [ ] 출하 기능 (장바구니 + FIFO/Lot 선택)
- [ ] 재고 조회 (제품별/날짜별)
- [ ] 거래 내역 조회
- [ ] 통합 테스트 완료

### Phase 4: 유통사 기능
- [ ] 입고 대기 목록 조회
- [ ] 입고 승인/거부 (역물류 지원)
- [ ] 병원 출하 (FIFO + 장바구니)
- [ ] 반품 처리
- [ ] 거래 내역 조회
- [ ] 통합 테스트 완료

### Phase 5: 병원 기능
- [ ] 시술 등록 (제품 선택 + 환자 전화번호 + FIFO)
- [ ] 24시간 회수 기능
- [ ] 입고 내역 조회 (읽기 전용)
- [ ] 재고 조회
- [ ] 유통사 반품
- [ ] 제품 폐기
- [ ] 거래 내역 조회
- [ ] 통합 테스트 완료

### Phase 6: 관리자 기능
- [ ] 조직 승인 관리
- [ ] 사용자 관리
- [ ] 제품 마스터 데이터 관리
- [ ] 시스템 모니터링 대시보드
- [ ] Mock KakaoTalk 알림 페이지
- [ ] 통합 테스트 완료

### Phase 7: 통합 테스트 & 최적화
- [ ] FIFO 알고리즘 구현 및 테스트
- [ ] Virtual Code 생성 로직 검증
- [ ] Pending 상태 관리 워크플로우 테스트
- [ ] 동시성 처리 (PostgreSQL Advisory Locks)
- [ ] E2E 테스트 (Playwright)
- [ ] 성능 최적화 완료
- [ ] 버그 수정 완료

### Phase 8: 프로덕션 준비
- [ ] 환경 설정 관리 (dev/staging/production)
- [ ] 에러 로깅 시스템 구축
- [ ] 성능 최적화
- [ ] 보안 강화 (OWASP Top 10)
- [ ] Cloud Supabase 마이그레이션
- [ ] 프로덕션 빌드 테스트
- [ ] 배포 가이드 작성

### Post-MVP: 향후 고도화 기능
- [ ] 재고 부족 알림
- [ ] 유통기한 경고 알림
- [ ] 대량 회수 시뮬레이션
- [ ] 자동 백업 & 복구
- [ ] 통합 리포트 & 대시보드

---

## 🔍 브랜치 상태 확인

### 현재 브랜치 확인

```bash
git branch
# * feature/phase-0-foundation  (현재 브랜치)
#   main
```

### 모든 브랜치 목록

```bash
git branch -a
```

### 브랜치 간 차이 확인

```bash
# Phase 0과 Phase 1 브랜치 비교
git diff feature/phase-0-foundation feature/phase-1-database

# 현재 브랜치와 main 비교
git diff main
```

### 커밋 히스토리 확인

```bash
# 그래프 형태로 커밋 히스토리 보기
git log --oneline --graph --all

# 특정 Phase의 커밋만 보기
git log --oneline --grep="phase-3"
```

---

## 🚨 주의사항

### 1. main 브랜치 보호
- **절대 main 브랜치에서 직접 작업하지 마세요**
- main 브랜치는 계획 문서만 유지
- 모든 개발은 feature 브랜치에서 진행

### 2. 브랜치 생성 시점
- 반드시 **이전 Phase 브랜치에서** 새 브랜치 생성
- main에서 생성하면 이전 Phase의 작업 내용이 포함되지 않음

```bash
# ❌ 잘못된 방법
git checkout main
git checkout -b feature/phase-2-auth-ui  # Phase 1 내용이 없음!

# ✅ 올바른 방법
git checkout feature/phase-1-database
git checkout -b feature/phase-2-auth-ui  # Phase 1 내용 포함
```

### 3. 커밋 주기
- 의미 있는 단위로 자주 커밋
- 하루 종료 시 반드시 커밋
- 대규모 작업은 여러 커밋으로 분리

### 4. Phase 완료 판단
- 체크리스트 100% 완료 확인
- 테스트 통과 확인
- 코드 리뷰 (선택)

---

## 📚 참고 자료

### Git Conventional Commits
- [Conventional Commits 공식 문서](https://www.conventionalcommits.org/)
- [Angular 커밋 가이드](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)

### 프로젝트 문서
- [PRD](docs/prd.md)
- [Phase 0 문서](docs/development-plans/phase-0/)
- [Phase 1 문서](docs/development-plans/phase-1/)
- ...

---

## 📞 문의 및 이슈

브랜치 전략에 대한 질문이나 개선 제안은 프로젝트 관리자에게 문의하세요.

**마지막 업데이트**: 2025-11-22
