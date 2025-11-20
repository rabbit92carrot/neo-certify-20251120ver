# Phase 0.3: 개발 도구 설정

## 📋 개요

**목표**: ESLint, Prettier, Vitest 등 개발 도구 완벽 설정
**선행 조건**: Phase 0.2 (프로젝트 생성) 완료
**예상 소요 시간**: 1-2시간

---

## 🎯 개발 원칙 준수 체크리스트

- [ ] SSOT: 설정 파일 단일 위치 관리
- [ ] No Magic Numbers: 설정 값은 명시적으로
- [x] No 'any' type: ESLint 규칙으로 강제
- [ ] Clean Code: 설정 파일 정리
- [ ] 테스트 작성: Vitest 환경 구축
- [ ] Git commit: 도구별 커밋

---

## 📦 작업 내용

### 1. ESLint 설정

```bash
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
```

**eslint.config.js**:
```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error', // any 타입 금지
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-magic-numbers': ['warn', {
        ignore: [0, 1, -1],
        ignoreEnums: true,
        ignoreNumericLiteralTypes: true,
        ignoreReadonlyClassProperties: true,
      }],
    },
  },
)
```

**package.json scripts 추가**:
```json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix"
  }
}
```

### 2. Prettier 설정

```bash
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
```

**.prettierrc**:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**.prettierignore**:
```
dist
node_modules
.supabase
coverage
```

**package.json scripts 추가**:
```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,md}\""
  }
}
```

### 3. Vitest 설정

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jsdom
```

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.{ts,js}',
        '**/types/',
        '**/constants/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**src/test/setup.ts**:
```typescript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})
```

**package.json scripts 추가**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### 4. 샘플 테스트 작성

**src/App.test.tsx**:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('should render the app title', () => {
    render(<App />)
    expect(screen.getByText(/네오인증서 시스템/i)).toBeInTheDocument()
  })

  it('should render the initialization message', () => {
    render(<App />)
    expect(screen.getByText(/프로젝트 초기화 완료/i)).toBeInTheDocument()
  })
})
```

### 5. 실행 검증

```bash
# Lint 검사
npm run lint

# Format 검사
npm run format:check

# 테스트 실행
npm run test

# 커버리지 확인
npm run test:coverage
```

---

## 📝 TypeScript 타입 정의

**src/test/types.ts**:
```typescript
import { ReactElement } from 'react'
import { RenderOptions } from '@testing-library/react'

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // 추후 Context Provider 등 추가
}

export type RenderResult = ReturnType<typeof import('@testing-library/react').render>
```

---

## 🔧 Constants 정의

해당 없음 (설정 파일)

---

## 📁 생성/수정 파일 목록

**생성**:
- `/eslint.config.js`
- `/.prettierrc`
- `/.prettierignore`
- `/vitest.config.ts`
- `/src/test/setup.ts`
- `/src/test/types.ts`
- `/src/App.test.tsx`

**수정**:
- `/package.json` (scripts 추가)

---

## ✅ 테스트 요구사항

### 자동 테스트

```bash
# ESLint 검사
npm run lint

# Prettier 검사
npm run format:check

# 단위 테스트
npm run test

# 커버리지 목표
# - 초기: 100% (App.tsx만 존재)
```

**예상 결과**:
```
✓ src/App.test.tsx (2 tests)
  ✓ App
    ✓ should render the app title
    ✓ should render the initialization message

Test Files  1 passed (1)
     Tests  2 passed (2)
```

---

## 🔄 Git Commit

```bash
git add eslint.config.js package.json package-lock.json
git commit -m "chore: Setup ESLint with strict TypeScript rules"

git add .prettierrc .prettierignore package.json
git commit -m "chore: Setup Prettier for code formatting"

git add vitest.config.ts src/test/ package.json
git commit -m "test: Setup Vitest and React Testing Library"

git add src/App.test.tsx
git commit -m "test: Add initial App component tests"
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] ESLint 설정 완료 (any 타입 금지 규칙 포함)
- [ ] Prettier 설정 완료
- [ ] Vitest + RTL 설정 완료
- [ ] 샘플 테스트 작성 및 통과
- [ ] `npm run lint` 에러 없음
- [ ] `npm run format:check` 에러 없음
- [ ] `npm run test` 통과
- [ ] Git commit 완료 (4개 커밋)
- [ ] 다음 Phase 진행 가능

---

## 🔗 참고 자료

- [ESLint 공식 문서](https://eslint.org/)
- [Prettier 공식 문서](https://prettier.io/)
- [Vitest 공식 문서](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)

---

## ⏭️ 다음 단계

[Phase 0.4 - 폴더 구조 생성](phase-0.4-folder-structure.md)

**작업 내용**:
- src/ 하위 전체 폴더 구조 생성
- 각 디렉토리에 README.md 작성
- 프로젝트 구조 문서화
