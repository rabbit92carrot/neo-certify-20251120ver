# Phase 0.2: React + TypeScript 프로젝트 생성

## 📋 개요

**목표**: Vite 기반 React + TypeScript 프로젝트 초기화
**선행 조건**: Phase 0.1 (Git 초기화) 완료
**예상 소요 시간**: 1시간

---

## 🎯 개발 원칙 준수 체크리스트

- [ ] SSOT: package.json 단일 의존성 관리
- [ ] No Magic Numbers: 버전은 명시적으로 관리
- [ ] No 'any' type: tsconfig strict mode 설정
- [ ] Clean Code: 프로젝트 구조 명확하게
- [ ] 테스트 작성: 초기 테스트 환경 구성
- [ ] Git commit: 단계별 커밋

---

## 📦 작업 내용

### 1. Vite 프로젝트 생성

```bash
npm create vite@latest . -- --template react-ts
```

**선택사항**:
- Framework: React
- Variant: TypeScript

### 2. 초기 의존성 설치

```bash
npm install
```

### 3. Tailwind CSS 설정

```bash
# Tailwind 및 관련 패키지 설치
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**tailwind.config.js**:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Supabase-style colors (UI design reference)
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
      },
    },
  },
  plugins: [],
}
```

**src/index.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. shadcn/ui 초기 설정

```bash
# shadcn/ui CLI 설치
npx shadcn-ui@latest init
```

**설정 선택**:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**components.json** (자동 생성됨):
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### 5. Path Alias 설정

**tsconfig.json** 수정:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path Alias */
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**vite.config.ts** 수정:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 6. 환경 변수 설정

**.env.example** (이미 생성됨):
```env
VITE_SUPABASE_URL=https://qveathzlquzvslobuewy.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**.env.local** (gitignore됨, 실제 값 입력):
```env
VITE_SUPABASE_URL=https://qveathzlquzvslobuewy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 7. 초기 디렉토리 정리

불필요한 파일 삭제:
```bash
rm src/App.css
rm src/assets/react.svg
rm public/vite.svg
```

**src/App.tsx** 단순화:
```typescript
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900">
          네오인증서 시스템
        </h1>
        <p className="mt-2 text-gray-600">
          프로젝트 초기화 완료
        </p>
      </div>
    </div>
  )
}

export default App
```

### 8. 개발 서버 실행 테스트

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속하여 확인

---

## 📝 TypeScript 타입 정의

**src/vite-env.d.ts** (자동 생성):
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

## 🔧 Constants 정의

**src/config/env.ts** (생성):
```typescript
export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const

// 환경 변수 검증
if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  throw new Error('Missing required environment variables')
}
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `/package.json`
- `/vite.config.ts`
- `/tsconfig.json`
- `/tailwind.config.js`
- `/postcss.config.js`
- `/components.json`
- `/src/config/env.ts`
- `/src/App.tsx`
- `/src/main.tsx`
- `/src/index.css`

**수정**:
- `.gitignore` (node_modules 등 이미 포함)

---

## ✅ 테스트 요구사항

### 수동 검증

```bash
# TypeScript 컴파일 확인
npx tsc --noEmit

# 개발 서버 실행
npm run dev

# 빌드 테스트
npm run build
```

**예상 결과**:
- ✅ TypeScript 에러 없음
- ✅ 개발 서버 정상 실행
- ✅ 빌드 성공

---

## 🔄 Git Commit

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json
git commit -m "chore: Initialize Vite + React + TypeScript project"

git add tailwind.config.js postcss.config.js components.json src/index.css
git commit -m "chore: Setup Tailwind CSS and shadcn/ui"

git add src/
git commit -m "chore: Setup initial project structure"
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] Vite 프로젝트 생성 완료
- [ ] TypeScript strict mode 설정
- [ ] Tailwind CSS 설정 완료
- [ ] shadcn/ui 초기 설정
- [ ] Path alias (@/*) 설정
- [ ] 환경 변수 파일 생성
- [ ] 개발 서버 정상 실행 확인
- [ ] Git commit 완료
- [ ] 다음 Phase 진행 가능

---

## 🔗 참고 자료

- [Vite 공식 문서](https://vitejs.dev/)
- [React + TypeScript](https://react-typescript-cheatsheet.netlify.app/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

## ⏭️ 다음 단계

[Phase 0.3 - 개발 도구 설정](phase-0.3-dev-tools.md)

**작업 내용**:
- ESLint 설정
- Prettier 설정
- Vitest 설정
- React Testing Library 설정
