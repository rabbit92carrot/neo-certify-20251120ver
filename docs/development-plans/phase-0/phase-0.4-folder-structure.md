# Phase 0.4: 폴더 구조 생성

## 📋 개요

**목표**: 전체 프로젝트 폴더 구조 생성 및 문서화
**선행 조건**: Phase 0.3 (개발 도구 설정) 완료
**예상 소요 시간**: 30분

---

## 🎯 개발 원칙 준수 체크리스트

- [x] SSOT: 폴더 구조 명확한 역할 분리
- [x] No Magic Numbers: 해당 없음
- [x] No 'any' type: 해당 없음
- [x] Clean Code: 일관된 네이밍
- [ ] 테스트 작성: tests/ 디렉토리 구조
- [ ] Git commit: 1개 커밋
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림
---

## 📦 작업 내용

### 1. src/ 폴더 구조 생성

```bash
cd src

# 컴포넌트 디렉토리
mkdir -p components/{ui,common,manufacturer,distributor,hospital,admin}

# 페이지 디렉토리
mkdir -p pages/{auth,manufacturer,distributor,hospital,admin,mock}

# 비즈니스 로직 디렉토리
mkdir -p constants
mkdir -p types
mkdir -p lib
mkdir -p hooks
mkdir -p services
mkdir -p contexts

# 유틸리티
mkdir -p utils

# 테스트
cd ..
mkdir -p tests/{unit,integration,e2e}
```

### 2. 각 디렉토리에 README.md 작성

**src/components/README.md**:
```markdown
# Components

React 컴포넌트 모음

## 구조

- `ui/`: shadcn/ui 컴포넌트 (Button, Input 등)
- `common/`: 공통 컴포넌트 (Header, Footer, Sidebar 등)
- `manufacturer/`: 제조사 전용 컴포넌트
- `distributor/`: 유통사 전용 컴포넌트
- `hospital/`: 병원 전용 컴포넌트
- `admin/`: 관리자 전용 컴포넌트

## 원칙

- 모든 컴포넌트는 TypeScript로 작성
- Props는 명시적 타입 정의 필수
- 재사용 가능한 컴포넌트는 common/에 위치
```

**src/pages/README.md**:
```markdown
# Pages

라우팅될 페이지 컴포넌트

## 구조

- `auth/`: 로그인, 회원가입, 비밀번호 재설정
- `manufacturer/`: 제조사 페이지
- `distributor/`: 유통사 페이지
- `hospital/`: 병원 페이지
- `admin/`: 관리자 페이지
- `mock/`: Mock KakaoTalk 페이지

## 원칙

- 페이지는 비즈니스 로직 최소화
- 데이터 fetching은 hooks 사용
- 레이아웃은 components/common 활용
```

**src/constants/README.md**:
```markdown
# Constants

전역 상수 정의 (SSOT)

## 파일 구조

- `index.ts`: 모든 상수 중앙 export
- `status.ts`: 상태값 (VIRTUAL_CODE_STATUS, ORG_STATUS 등)
- `messages.ts`: 에러/성공 메시지
- `validation.ts`: 검증 규칙 (정규식, 제한값 등)
- `routes.ts`: URL 경로
- `roles.ts`: 사용자 역할

## 원칙

- 모든 Magic Number/String 금지
- as const 사용으로 타입 안전성 확보
- 다른 파일에서 import만 허용, 직접 정의 금지
```

**src/types/README.md**:
```markdown
# Types

TypeScript 타입 정의

## 파일 구조

- `database.ts`: Supabase 자동 생성 타입
- `entities.ts`: 비즈니스 엔티티 타입
- `api.ts`: API 요청/응답 타입
- `ui.ts`: UI 관련 타입

## 원칙

- any 타입 절대 금지
- unknown + type guard 활용
- 엄격한 타입 정의
```

**src/lib/README.md**:
```markdown
# Lib

유틸리티 및 라이브러리 설정

## 파일 구조

- `supabase.ts`: Supabase 클라이언트
- `utils.ts`: 범용 유틸리티 함수
- `validation.ts`: 검증 함수

## 원칙

- Pure function으로 작성
- Side effect 최소화
- 테스트 가능한 구조
```

**src/hooks/README.md**:
```markdown
# Hooks

Custom React Hooks

## 명명 규칙

- `use` 접두사 필수
- 명확한 역할 표현 (예: useAuth, useInventory)

## 원칙

- 재사용 가능한 로직만 hook으로 분리
- TanStack Query 활용
- 타입 안전성 확보
```

**src/services/README.md**:
```markdown
# Services

API 호출 및 비즈니스 로직

## 파일 구조 (예정)

- `auth.service.ts`: 인증 관련
- `product.service.ts`: 제품 관련
- `inventory.service.ts`: 재고 관련
- `transaction.service.ts`: 거래 관련

## 원칙

- 각 서비스는 단일 책임
- 에러 핸들링 포함
- 타입 안전한 응답
```

**src/contexts/README.md**:
```markdown
# Contexts

React Context 정의

## 파일 구조 (예정)

- `AuthContext.tsx`: 인증 상태
- `CartContext.tsx`: 장바구니 상태

## 원칙

- 전역 상태만 Context 사용
- 과도한 Context 남용 금지
- TypeScript 타입 명시
```

**tests/README.md**:
```markdown
# Tests

테스트 파일 모음

## 구조

- `unit/`: 단위 테스트 (함수, 유틸리티)
- `integration/`: 통합 테스트 (API 호출, DB)
- `e2e/`: E2E 테스트 (사용자 플로우)

## 실행

\`\`\`bash
npm run test           # 전체 테스트
npm run test:unit      # 단위 테스트만
npm run test:coverage  # 커버리지
\`\`\`
```

### 3. 최종 폴더 구조 확인

```
src/
├── components/
│   ├── ui/              # shadcn/ui
│   ├── common/          # 공통 컴포넌트
│   ├── manufacturer/    # 제조사
│   ├── distributor/     # 유통사
│   ├── hospital/        # 병원
│   ├── admin/           # 관리자
│   └── README.md
├── pages/
│   ├── auth/
│   ├── manufacturer/
│   ├── distributor/
│   ├── hospital/
│   ├── admin/
│   ├── mock/
│   └── README.md
├── constants/
│   └── README.md
├── types/
│   └── README.md
├── lib/
│   └── README.md
├── hooks/
│   └── README.md
├── services/
│   └── README.md
├── contexts/
│   └── README.md
├── utils/
├── test/
├── App.tsx
├── main.tsx
└── index.css

tests/
├── unit/
├── integration/
├── e2e/
└── README.md
```

---

## 📝 TypeScript 타입 정의

해당 없음 (폴더 구조만 생성)

---

## 🔧 Constants 정의

해당 없음

---

## 📁 생성/수정 파일 목록

**생성**:
- `src/components/` 및 하위 디렉토리
- `src/pages/` 및 하위 디렉토리
- `src/constants/`, `types/`, `lib/`, `hooks/`, `services/`, `contexts/`, `utils/`
- 각 디렉토리의 `README.md`
- `tests/unit/`, `tests/integration/`, `tests/e2e/`
- `tests/README.md`

---

## ✅ 테스트 요구사항

### 수동 검증

```bash
# 폴더 구조 확인
tree src/ -L 2
tree tests/ -L 1

# README 파일 존재 확인
find src -name "README.md"
find tests -name "README.md"
```

---

## 🔄 Git Commit

```bash
git add src/ tests/
git commit -m "chore: Create project folder structure with documentation"
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] src/ 하위 모든 폴더 생성
- [ ] tests/ 하위 폴더 생성
- [ ] 각 주요 디렉토리에 README.md 작성
- [ ] 폴더 구조 검증 완료
- [ ] Git commit 완료
- [ ] 다음 Phase 진행 가능

---

## 🔗 참고 자료

- [React 프로젝트 구조 Best Practices](https://react.dev/learn/thinking-in-react)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)

---

## ⏭️ 다음 단계

[Phase 0.5 - Constants 시스템 구축](phase-0.5-constants-system.md)

**작업 내용**:
- src/constants/ 하위 파일 생성
- 모든 상태값, 메시지, 검증 규칙 정의
- SSOT 원칙 적용
