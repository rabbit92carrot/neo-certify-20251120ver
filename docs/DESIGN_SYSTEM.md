# Neo Certificate System - Design System

## 📋 Overview

본 문서는 Neo Certificate System의 UI/UX 디자인 가이드라인을 정의합니다. 모든 프론트엔드 개발은 이 디자인 시스템을 준수하여 일관성 있는 사용자 경험을 제공해야 합니다.

**디자인 철학**: Supabase Dashboard의 깔끔하고 전문적인 스타일을 따릅니다.
**참조 이미지**: [UI-design-direction.png](../UI-design-direction.png)

---

## 🎨 Color Palette

### Primary Colors

**Green (주요 색상 - 성공, 활성 상태)**
```typescript
const GREEN = {
  50: '#f0fdf4',   // 배경 (hover 상태)
  100: '#dcfce7',  // 배경 (기본 상태)
  200: '#bbf7d0',  // 배경 (강조)
  700: '#15803d',  // 텍스트
  800: '#166534',  // 텍스트 (진한 상태)
}
```

**Usage**:
- Active status badges: `bg-green-100 text-green-800`
- Success messages: `bg-green-50 border-green-200 text-green-700`
- Hover states: `hover:bg-green-200`

---

### Secondary Colors

**Gray (배경, 텍스트, 보더)**
```typescript
const GRAY = {
  50: '#f9fafb',   // 페이지 배경
  100: '#f3f4f6',  // 카드 배경 (비활성)
  200: '#e5e7eb',  // 보더
  500: '#6b7280',  // 보조 텍스트
  600: '#4b5563',  // 일반 텍스트
  800: '#1f2937',  // 주요 텍스트
  900: '#111827',  // 제목 텍스트
}
```

**Usage**:
- Page background: `bg-gray-50`
- Card background: `bg-white` or `bg-gray-100` (inactive)
- Border: `border-gray-200`
- Text primary: `text-gray-900`
- Text secondary: `text-gray-600`
- Text muted: `text-gray-500`

---

### Semantic Colors

**Red (에러, 경고, 삭제)**
```typescript
const RED = {
  100: '#fee2e2',  // 배경
  700: '#b91c1c',  // 텍스트
  800: '#991b1b',  // 텍스트 (진한 상태)
}
```

**Usage**:
- Error badges: `bg-red-100 text-red-700`
- Delete buttons: `bg-red-600 hover:bg-red-700 text-white`
- Recall badges: `bg-red-100 text-red-700`

---

**Yellow (알림, 주의)**
```typescript
const YELLOW = {
  400: '#facc15',  // KakaoTalk 로고
  100: '#fef3c7',  // 배경
  700: '#a16207',  // 텍스트
}
```

**Usage**:
- Warning badges: `bg-yellow-100 text-yellow-700`
- KakaoTalk branding: `bg-yellow-400`

---

**Blue (정보, 링크)**
```typescript
const BLUE = {
  100: '#dbeafe',  // 배경
  600: '#2563eb',  // 링크
  700: '#1d4ed8',  // 텍스트
}
```

**Usage**:
- Info badges: `bg-blue-100 text-blue-700`
- Links: `text-blue-600 hover:text-blue-700 underline`

---

## 📝 Typography

### Font Family

```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**기본 폰트**: Tailwind CSS의 기본 sans-serif 스택 사용

---

### Font Sizes

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | 보조 정보, 타임스탬프 |
| `text-sm` | 14px | 20px | 본문 텍스트, 설명 |
| `text-base` | 16px | 24px | 기본 텍스트 |
| `text-lg` | 18px | 28px | 섹션 부제목 |
| `text-xl` | 20px | 28px | 카드 제목 |
| `text-2xl` | 24px | 32px | 페이지 부제목 |
| `text-3xl` | 30px | 36px | 페이지 제목 |

---

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | 본문 텍스트 |
| `font-medium` | 500 | 강조 텍스트, 버튼 |
| `font-semibold` | 600 | 섹션 제목 |
| `font-bold` | 700 | 페이지 제목 |

---

### Typography Examples

**페이지 제목**:
```tsx
<h1 className="text-3xl font-bold text-gray-900">
  제품 목록
</h1>
```

**섹션 제목**:
```tsx
<h2 className="text-xl font-semibold text-gray-800">
  활성 제품
</h2>
```

**본문**:
```tsx
<p className="text-sm text-gray-600">
  총 15개의 제품이 등록되어 있습니다.
</p>
```

**보조 정보**:
```tsx
<span className="text-xs text-gray-500">
  2025-01-20 14:30
</span>
```

---

## 📏 Spacing

### Spacing Scale

Tailwind CSS의 spacing scale을 준수합니다:

| Class | Size | Usage |
|-------|------|-------|
| `p-2` | 8px | 작은 padding (버튼, 뱃지) |
| `p-4` | 16px | 기본 padding (카드) |
| `p-6` | 24px | 중간 padding (섹션) |
| `p-8` | 32px | 큰 padding (페이지) |
| `gap-2` | 8px | 작은 간격 (아이콘 + 텍스트) |
| `gap-4` | 16px | 기본 간격 (폼 필드) |
| `gap-6` | 24px | 중간 간격 (섹션) |

---

### Layout Guidelines

**페이지 레이아웃**:
```tsx
<div className="min-h-screen bg-gray-50 p-8">
  <div className="max-w-7xl mx-auto space-y-6">
    {/* 콘텐츠 */}
  </div>
</div>
```

**카드 레이아웃**:
```tsx
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
  {/* 카드 내용 */}
</div>
```

**폼 레이아웃**:
```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">
      제품명
    </label>
    <input className="w-full px-3 py-2 border border-gray-200 rounded-md" />
  </div>
</div>
```

---

## 🎯 Components

### shadcn/ui Components

**사용 컴포넌트**:
- `Button` - 모든 버튼 (primary, secondary, destructive)
- `Table` - 데이터 테이블
- `Dialog` - 모달 창
- `Select` - 드롭다운
- `Input` - 입력 필드
- `Badge` - 상태 표시
- `Card` - 카드 레이아웃
- `Toast` - 알림 메시지 (sonner)

**설치 방법**:
```bash
npx shadcn-ui@latest add button table dialog select input badge card
npm install sonner
```

---

### Button Variants

**Primary (기본)**:
```tsx
<Button>저장</Button>
// bg-blue-600 hover:bg-blue-700 text-white
```

**Secondary (보조)**:
```tsx
<Button variant="secondary">취소</Button>
// bg-gray-100 hover:bg-gray-200 text-gray-900
```

**Destructive (삭제)**:
```tsx
<Button variant="destructive">삭제</Button>
// bg-red-600 hover:bg-red-700 text-white
```

**Outline (외곽선)**:
```tsx
<Button variant="outline">필터</Button>
// border border-gray-200 hover:bg-gray-100
```

---

### Badge Variants

**Status Badges**:
```tsx
// Active
<Badge className="bg-green-100 text-green-800">활성</Badge>

// Inactive
<Badge className="bg-gray-100 text-gray-800">비활성</Badge>

// Pending
<Badge className="bg-yellow-100 text-yellow-700">대기중</Badge>

// Error
<Badge className="bg-red-100 text-red-700">에러</Badge>
```

---

### Table Style

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="text-sm font-semibold text-gray-700">
        제품명
      </TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-gray-50">
      <TableCell className="text-sm text-gray-900">
        PDO Thread A
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### Card Style

```tsx
<Card className="bg-white border border-gray-200 shadow-sm">
  <CardHeader>
    <CardTitle className="text-xl font-semibold text-gray-900">
      제품 상세
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* 콘텐츠 */}
  </CardContent>
</Card>
```

---

## 🎨 Icons

### Icon Library

**Lucide React** 사용:
```bash
npm install lucide-react
```

**사용 예시**:
```tsx
import { Search, Plus, Edit, Trash2, Download } from 'lucide-react'

<Button>
  <Plus className="w-4 h-4 mr-2" />
  추가
</Button>
```

**아이콘 크기**:
- Small: `w-4 h-4` (16px) - 버튼 내부
- Medium: `w-5 h-5` (20px) - 일반 아이콘
- Large: `w-6 h-6` (24px) - 강조 아이콘

---

## 📱 Responsive Design

### Breakpoints

Tailwind CSS 기본 breakpoint 사용:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | 작은 태블릿 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 노트북 |
| `xl` | 1280px | 데스크톱 |
| `2xl` | 1536px | 대형 데스크톱 |

**MVP 범위**: 데스크톱 우선 (lg 이상)
**Post-MVP**: 모바일 반응형 추가

---

## ♿ Accessibility (a11y)

### 기본 원칙

1. **색상 대비**: WCAG AA 기준 준수 (4.5:1)
2. **키보드 네비게이션**: 모든 인터랙티브 요소 Tab 접근 가능
3. **ARIA 레이블**: 스크린 리더 지원
4. **Focus 표시**: visible focus indicator

### 구현 예시

**버튼**:
```tsx
<button
  aria-label="제품 삭제"
  className="focus:outline-none focus:ring-2 focus:ring-blue-500"
>
  <Trash2 className="w-4 h-4" />
</button>
```

**폼 필드**:
```tsx
<label htmlFor="product-name" className="text-sm font-medium">
  제품명
</label>
<input
  id="product-name"
  aria-required="true"
  aria-invalid={errors.name ? 'true' : 'false'}
/>
```

---

## 🔍 Usage Examples

### Product List Page (Phase 3.1)

```tsx
// 페이지 레이아웃
<div className="min-h-screen bg-gray-50 p-8">
  <div className="max-w-7xl mx-auto space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold text-gray-900">
        제품 목록
      </h1>
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        제품 추가
      </Button>
    </div>

    {/* Filters */}
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex gap-4">
        <Select>...</Select>
        <Input placeholder="검색..." />
      </div>
    </div>

    {/* Table */}
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <Table>...</Table>
    </div>
  </div>
</div>
```

---

### Mock KakaoTalk Page (Phase 6.6)

```tsx
// KakaoTalk 스타일 메시지 카드
<div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
  {/* Header */}
  <div className="flex items-center gap-2">
    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
      <MessageCircle className="w-6 h-6 text-gray-900" />
    </div>
    <div>
      <div className="text-sm font-semibold text-gray-900">
        Neo Certificate System
      </div>
      <div className="text-xs text-gray-500">
        인증 계정
      </div>
    </div>
  </div>

  {/* Message */}
  <div className="text-sm text-gray-800 leading-relaxed">
    [Neo Certificate] 제품이 출고되었습니다.
  </div>

  {/* Badge */}
  <div className="flex gap-2">
    <Badge className="bg-green-100 text-green-700">
      ✓ 인증됨
    </Badge>
  </div>
</div>
```

---

## 📋 Checklist

### Supabase 스타일 준수 체크리스트

개발 시 다음 항목을 확인하세요:

- [ ] **색상**: Green/Gray 팔레트 사용
- [ ] **배경**: 페이지는 `bg-gray-50`, 카드는 `bg-white`
- [ ] **보더**: `border-gray-200` 사용
- [ ] **그림자**: `shadow-sm` 사용 (과도한 그림자 지양)
- [ ] **타이포그래피**: 제목 `font-bold`, 본문 `font-normal`
- [ ] **간격**: 일관된 spacing (p-4, p-6, gap-4 등)
- [ ] **버튼**: shadcn/ui Button 컴포넌트 사용
- [ ] **테이블**: shadcn/ui Table 컴포넌트 사용
- [ ] **뱃지**: 의미에 맞는 색상 사용 (green=활성, red=에러)
- [ ] **아이콘**: Lucide React 사용
- [ ] **접근성**: ARIA 레이블, 키보드 네비게이션 지원

---

## 🔗 References

- [Supabase Dashboard](https://app.supabase.com/) - 디자인 참조
- [shadcn/ui](https://ui.shadcn.com/) - 컴포넌트 라이브러리
- [Tailwind CSS](https://tailwindcss.com/) - CSS 프레임워크
- [Lucide Icons](https://lucide.dev/) - 아이콘 라이브러리
- [UI-design-direction.png](../UI-design-direction.png) - 디자인 가이드

---

## 📝 Version History

- **v1.0.0** (2025-01-21): 초안 작성
  - Phase 3.1, 6.6에서 추출한 디자인 요소 통합
  - Supabase 스타일 가이드라인 정립
  - shadcn/ui 컴포넌트 사용법 문서화

---

**Last Updated**: 2025-01-21
**Maintainer**: Development Team
