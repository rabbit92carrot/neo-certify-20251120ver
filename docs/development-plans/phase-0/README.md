# Phase 0: 프로젝트 기반 구축

## 📋 개요

**목표**: 개발 환경 완벽 설정 및 프로젝트 초기화
**기간**: 1-2일
**완료 상태**: ✅ 완료

---

## 세부 계획 (5개 유닛)

- **[Phase 0.1](phase-0.1-git-init.md)**: Git 초기화 및 원격 저장소 연결
- **[Phase 0.2](phase-0.2-project-setup.md)**: Vite + React + TypeScript 프로젝트 생성
- **[Phase 0.3](phase-0.3-dev-tools.md)**: ESLint, Prettier, Vitest 개발 도구 설정
- **[Phase 0.4](phase-0.4-folder-structure.md)**: 프로젝트 폴더 구조 생성 및 문서화
- **[Phase 0.5](phase-0.5-constants-system.md)**: SSOT 기반 전역 상수 시스템 구축

---

## 주요 성과

### 1. Git 저장소 설정
- GitHub 원격 저장소 연결
- .gitignore 설정 (민감 정보 보호)
- Conventional Commits 기준 수립

### 2. 기술 스택 확정
- Frontend: Vite + React 18 + TypeScript 5
- UI: shadcn/ui + Tailwind CSS
- Testing: Vitest + React Testing Library
- Linting: ESLint (strict rules, no 'any' type)
- Formatting: Prettier

### 3. 프로젝트 구조
```
src/
├── components/       # React 컴포넌트 (ui, common, role-based)
├── pages/            # 페이지 컴포넌트
├── constants/        # 전역 상수 (SSOT) ★
├── types/            # TypeScript 타입 정의
├── lib/              # 유틸리티 및 라이브러리 설정
├── hooks/            # Custom React Hooks
├── services/         # API 서비스 로직
├── contexts/         # React Context
└── utils/            # 범용 유틸리티 함수
```

### 4. Constants 시스템 (SSOT)
- **status.ts**: 모든 상태값 (VIRTUAL_CODE_STATUS, ORGANIZATION_STATUS 등)
- **messages.ts**: 에러/성공 메시지 및 포맷팅 함수
- **validation.ts**: 검증 규칙, 정규식, 제한값
- **routes.ts**: URL 경로
- **roles.ts**: 사용자 역할

---

## 개발 원칙 준수 현황

- ✅ **SSOT**: 모든 상수를 constants/에 집중 관리
- ✅ **No Magic Numbers**: 모든 리터럴 값을 의미있는 상수로 정의
- ✅ **No 'any' Type**: ESLint 규칙으로 강제 (엄격 모드)
- ✅ **Clean Code**: 명확한 네이밍, 함수 단일 책임
- ✅ **Test-Driven**: Vitest 환경 구축 및 샘플 테스트 작성
- ✅ **Git Conventional Commits**: 최소 단위 커밋 전략 수립

---

## 테스트 결과

```bash
# 개발 서버 실행 확인
npm run dev  # ✅ http://localhost:5173

# Lint 검사
npm run lint  # ✅ 0 errors

# 포맷 검사
npm run format:check  # ✅ All files formatted

# 테스트 실행
npm run test  # ✅ All tests passing
```

---

## Git Commit 이력

```
chore: Initialize Git repository with .gitignore
chore: Initialize Vite + React + TypeScript project
chore: Setup Tailwind CSS and shadcn/ui
chore: Setup ESLint with strict TypeScript rules
chore: Setup Prettier for code formatting
test: Setup Vitest and React Testing Library
chore: Create project folder structure with documentation
feat(constants): Add status and role constants
feat(constants): Add route constants
feat(constants): Add message constants with formatter
feat(constants): Add validation rules and regex
feat(constants): Add central constants export
test(constants): Add constants validation tests
```

---

## 완료 기준 달성

- ✅ Git repository 설정 완료
- ✅ 프로젝트 초기화 완료
- ✅ 개발 도구 설정 완료 (ESLint, Prettier, Vitest)
- ✅ 폴더 구조 생성 및 문서화 완료
- ✅ Constants 시스템 완벽 구축
- ✅ 모든 테스트 통과
- ✅ TypeScript 엄격 모드 설정
- ✅ Git commit 완료 (13개 커밋)
- ✅ Git push 완료

---

## 다음 단계

**Phase 0 완료!**

다음: [Phase 1 - 데이터베이스 설계](../phase-1/)

**작업 내용**:
- Supabase 로컬 환경 구축
- 13개 테이블 마이그레이션
- RLS 정책 설정
- Storage 버킷 설정
