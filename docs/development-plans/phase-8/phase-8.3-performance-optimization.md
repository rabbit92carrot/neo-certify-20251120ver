# Phase 8.3: 성능 최적화

## 1. 개요

### 1.1 목적
- 빠른 페이지 로드 시간 달성 (< 3초)
- 효율적인 번들 크기 관리 (< 500KB gzipped)
- 부드러운 사용자 경험 제공 (60 FPS)
- 데이터베이스 쿼리 최적화
- 리소스 사용량 최소화

### 1.2 범위
- Code Splitting (React.lazy, Dynamic Import)
- Bundle Size 최적화
- 이미지 최적화
- 데이터베이스 쿼리 최적화 (인덱스, RLS)
- 캐싱 전략 (TanStack Query, Service Worker)
- Lazy Loading 및 Virtualization

### 1.3 주요 이해관계자
- **개발자**: 성능 최적화 구현
- **사용자**: 빠른 앱 응답 시간
- **운영팀**: 서버 리소스 효율화

---

## 2. 요구사항 분석

### 2.1 기능 요구사항

#### FR-8.3.1: 코드 스플리팅
- 라우트별 번들 분리 (React.lazy)
- 컴포넌트 레벨 동적 로딩
- 초기 번들 크기 최소화 (< 200KB)

#### FR-8.3.2: 이미지 최적화
- WebP 포맷 사용
- Lazy loading
- Responsive images (srcset)

#### FR-8.3.3: 데이터 최적화
- 필요한 컬럼만 SELECT
- 페이지네이션 (무한 스크롤)
- 데이터베이스 인덱스 활용

#### FR-8.3.4: 캐싱
- TanStack Query 캐시 전략
- HTTP 캐시 헤더 설정
- 정적 에셋 캐싱

### 2.2 비기능 요구사항

#### NFR-8.3.1: 성능 목표
- **First Contentful Paint (FCP)**: < 1.8초
- **Largest Contentful Paint (LCP)**: < 2.5초
- **Time to Interactive (TTI)**: < 3.8초
- **Total Blocking Time (TBT)**: < 200ms
- **Cumulative Layout Shift (CLS)**: < 0.1

#### NFR-8.3.2: 번들 크기
- Initial bundle: < 200KB (gzipped)
- Total bundle: < 500KB (gzipped)
- Vendor chunk: < 300KB (gzipped)

#### NFR-8.3.3: 데이터베이스
- 쿼리 응답 시간: < 100ms (단일 테이블)
- 쿼리 응답 시간: < 300ms (조인 쿼리)
- 인덱스 적용 비율: 100% (WHERE, JOIN 절)

---

## 3. 기술 스택

### 3.1 프론트엔드 최적화
- **React.lazy**: 동적 import
- **react-window**: 가상 스크롤
- **vite-plugin-compression**: Gzip/Brotli 압축

### 3.2 이미지 최적화
- **sharp** (백엔드): 이미지 리사이징
- **WebP**: 최신 이미지 포맷

### 3.3 모니터링
- **Lighthouse**: 성능 점수 측정
- **webpack-bundle-analyzer**: 번들 분석

---

## 4. Code Splitting 구현

### 4.1 라우트 기반 Code Splitting

**파일**: `src/routes/index.tsx`

```typescript
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

// Lazy load pages
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'))

// Manufacturer
const ManufacturerDashboard = lazy(() => import('@/features/dashboard/pages/ManufacturerDashboard'))
const ProductListPage = lazy(() => import('@/features/products/pages/ProductListPage'))
const ProductCreatePage = lazy(() => import('@/features/products/pages/ProductCreatePage'))
const LotListPage = lazy(() => import('@/features/lots/pages/LotListPage'))
const LotCreatePage = lazy(() => import('@/features/lots/pages/LotCreatePage'))

// Distributor
const DistributorDashboard = lazy(() => import('@/features/dashboard/pages/DistributorDashboard'))
const InventoryPage = lazy(() => import('@/features/inventory/pages/InventoryPage'))
const ShipmentListPage = lazy(() => import('@/features/shipments/pages/ShipmentListPage'))

// Hospital
const HospitalDashboard = lazy(() => import('@/features/dashboard/pages/HospitalDashboard'))
const UsageRecordPage = lazy(() => import('@/features/usage/pages/UsageRecordPage'))

// Admin
const AdminDashboard = lazy(() => import('@/features/dashboard/pages/AdminDashboard'))
const OrganizationManagementPage = lazy(() => import('@/features/organizations/pages/OrganizationManagementPage'))

// Common
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Manufacturer */}
        <Route path="/manufacturer">
          <Route index element={<ManufacturerDashboard />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/create" element={<ProductCreatePage />} />
          <Route path="lots" element={<LotListPage />} />
          <Route path="lots/create" element={<LotCreatePage />} />
        </Route>

        {/* Distributor */}
        <Route path="/distributor">
          <Route index element={<DistributorDashboard />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="shipments" element={<ShipmentListPage />} />
        </Route>

        {/* Hospital */}
        <Route path="/hospital">
          <Route index element={<HospitalDashboard />} />
          <Route path="usage" element={<UsageRecordPage />} />
        </Route>

        {/* Admin */}
        <Route path="/admin">
          <Route index element={<AdminDashboard />} />
          <Route path="organizations" element={<OrganizationManagementPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
```

**파일**: `src/components/common/LoadingSpinner.tsx`

```typescript
interface LoadingSpinnerProps {
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ fullScreen, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  }

  const spinner = (
    <div
      className={`animate-spin rounded-full border-t-blue-600 border-r-blue-600 border-b-transparent border-l-transparent ${sizeClasses[size]}`}
    />
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {spinner}
      </div>
    )
  }

  return spinner
}
```

### 4.2 컴포넌트 레벨 Lazy Loading

**파일**: `src/features/products/pages/ProductListPage.tsx` (예시)

```typescript
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

// Heavy 컴포넌트만 lazy load
const ProductChart = lazy(() => import('../components/ProductChart'))
const ProductExportDialog = lazy(() => import('../components/ProductExportDialog'))

export default function ProductListPage() {
  const [showExport, setShowExport] = useState(false)

  return (
    <div>
      <h1>Product List</h1>

      {/* 일반 컴포넌트는 즉시 로드 */}
      <ProductTable />

      {/* 차트는 lazy load */}
      <Suspense fallback={<LoadingSpinner />}>
        <ProductChart />
      </Suspense>

      {/* 다이얼로그는 열릴 때만 로드 */}
      {showExport && (
        <Suspense fallback={null}>
          <ProductExportDialog onClose={() => setShowExport(false)} />
        </Suspense>
      )}
    </div>
  )
}
```

---

## 5. Bundle Size 최적화

### 5.1 Vite 빌드 설정

**파일**: `vite.config.ts` (업데이트)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),

    // Gzip/Brotli 압축
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),

    // Bundle analyzer (빌드 시 stats.html 생성)
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  build: {
    // 번들 크기 경고 임계값 (KB)
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        // Vendor 코드 분리
        manualChunks: {
          // React 관련
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI 라이브러리
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],

          // 데이터 관련
          'data-vendor': ['@tanstack/react-query', '@supabase/supabase-js'],

          // 유틸리티
          'util-vendor': ['zod', 'date-fns', 'sonner'],
        },
      },
    },

    // Minify 설정
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 프로덕션에서 console.log 제거
        drop_debugger: true,
      },
    },
  },

  // 최적화 설정
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
```

**패키지 설치**:

```bash
npm install -D rollup-plugin-visualizer vite-plugin-compression
```

### 5.2 Tree Shaking 최적화

**잘못된 import (전체 import)**:

```typescript
// ❌ 잘못된 방식 - 전체 lodash import
import _ from 'lodash'
const result = _.debounce(fn, 300)

// ❌ 잘못된 방식 - 전체 date-fns import
import * as dateFns from 'date-fns'
const formatted = dateFns.format(new Date(), 'yyyy-MM-dd')
```

**올바른 import (개별 함수 import)**:

```typescript
// ✅ 올바른 방식 - 개별 함수만 import
import debounce from 'lodash-es/debounce'
const result = debounce(fn, 300)

// ✅ 올바른 방식 - 개별 함수만 import
import { format } from 'date-fns'
const formatted = format(new Date(), 'yyyy-MM-dd')
```

### 5.3 불필요한 패키지 제거

```bash
# 사용하지 않는 패키지 찾기
npx depcheck

# 예시 결과:
# Unused dependencies:
# - moment (date-fns로 대체 가능)
# - axios (fetch API 또는 Supabase client 사용)

# 패키지 제거
npm uninstall moment axios
```

---

## 6. 이미지 최적화

### 6.1 Lazy Loading 구현

**파일**: `src/components/common/LazyImage.tsx`

```typescript
import { useState, useEffect, useRef } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
}

export function LazyImage({ src, alt, className, placeholder = '/placeholder.svg' }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '50px' } // 50px 전에 로딩 시작
    )

    observer.observe(imgRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <img
      ref={imgRef}
      src={isInView ? src : placeholder}
      alt={alt}
      className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-50'}`}
      onLoad={() => setIsLoaded(true)}
      loading="lazy"
    />
  )
}
```

### 6.2 WebP 포맷 사용

**파일**: `src/components/common/OptimizedImage.tsx`

```typescript
interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
}

export function OptimizedImage({ src, alt, className, width, height }: OptimizedImageProps) {
  // WebP 지원 여부 확인
  const supportsWebP = () => {
    const elem = document.createElement('canvas')
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }

  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
  const finalSrc = supportsWebP() ? webpSrc : src

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img src={finalSrc} alt={alt} className={className} width={width} height={height} loading="lazy" />
    </picture>
  )
}
```

---

## 7. 데이터베이스 최적화

### 7.1 인덱스 추가

**파일**: `supabase/migrations/20250121000000_add_performance_indexes.sql`

```sql
-- products 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_udi_di ON products(udi_di);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- lots 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_lots_product_id ON lots(product_id);
CREATE INDEX IF NOT EXISTS idx_lots_lot_number ON lots(lot_number);
CREATE INDEX IF NOT EXISTS idx_lots_virtual_code ON lots(virtual_code);
CREATE INDEX IF NOT EXISTS idx_lots_expiry_date ON lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_lots_created_at ON lots(created_at DESC);

-- inventory 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_inventory_organization_id ON inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lot_id ON inventory(lot_id);
CREATE INDEX IF NOT EXISTS idx_inventory_current_quantity ON inventory(current_quantity) WHERE current_quantity > 0;

-- shipments 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_shipments_from_org ON shipments(from_organization_id);
CREATE INDEX IF NOT EXISTS idx_shipments_to_org ON shipments(to_organization_id);
CREATE INDEX IF NOT EXISTS idx_shipments_lot_id ON shipments(lot_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);

-- usages 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_usages_organization_id ON usages(organization_id);
CREATE INDEX IF NOT EXISTS idx_usages_lot_id ON usages(lot_id);
CREATE INDEX IF NOT EXISTS idx_usages_patient_id ON usages(patient_id);
CREATE INDEX IF NOT EXISTS idx_usages_usage_date ON usages(usage_date DESC);

-- 복합 인덱스 (자주 함께 조회되는 컬럼)
CREATE INDEX IF NOT EXISTS idx_inventory_org_lot ON inventory(organization_id, lot_id);
CREATE INDEX IF NOT EXISTS idx_shipments_from_to ON shipments(from_organization_id, to_organization_id);
CREATE INDEX IF NOT EXISTS idx_usages_org_date ON usages(organization_id, usage_date DESC);

-- ANALYZE로 통계 정보 업데이트
ANALYZE products;
ANALYZE lots;
ANALYZE inventory;
ANALYZE shipments;
ANALYZE usages;
```

### 7.2 쿼리 최적화 (필요한 컬럼만 SELECT)

**Before (비효율적)**:

```typescript
// ❌ 모든 컬럼 가져오기
const { data } = await supabase.from('products').select('*')
```

**After (최적화)**:

```typescript
// ✅ 필요한 컬럼만 가져오기
const { data } = await supabase
  .from('products')
  .select('id, name, udi_di, model_name') // 필요한 컬럼만
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
  .limit(20) // 페이지네이션
```

### 7.3 N+1 쿼리 문제 해결

**Before (N+1 문제)**:

```typescript
// ❌ N+1 쿼리 - 제품마다 별도 쿼리
const { data: products } = await supabase.from('products').select('*')

for (const product of products) {
  const { data: lots } = await supabase.from('lots').select('*').eq('product_id', product.id)
  // N번의 추가 쿼리 발생!
}
```

**After (JOIN 사용)**:

```typescript
// ✅ 단일 쿼리로 해결
const { data: products } = await supabase.from('products').select(
  `
  id,
  name,
  udi_di,
  lots (
    id,
    lot_number,
    expiry_date,
    quantity
  )
`
)
```

### 7.4 페이지네이션 구현

**파일**: `src/features/products/api/useProducts.ts` (업데이트)

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

const PAGE_SIZE = 20

export function useProducts(organizationId: string) {
  return useInfiniteQuery({
    queryKey: ['products', organizationId],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('products')
        .select('id, name, udi_di, model_name', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      return {
        products: data,
        nextPage: data.length === PAGE_SIZE ? pageParam + 1 : undefined,
        totalCount: count,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  })
}
```

**파일**: `src/features/products/pages/ProductListPage.tsx` (업데이트)

```typescript
import { useInView } from 'react-intersection-observer'

export default function ProductListPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useProducts(organizationId)
  const { ref, inView } = useInView()

  // 스크롤이 바닥에 닿으면 다음 페이지 로드
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div>
      {data?.pages.map((page) =>
        page.products.map((product) => <ProductCard key={product.id} product={product} />)
      )}

      {/* 감지 영역 */}
      <div ref={ref}>{isFetchingNextPage && <LoadingSpinner />}</div>
    </div>
  )
}
```

**패키지 설치**:

```bash
npm install react-intersection-observer
```

---

## 8. Virtual Scrolling (긴 리스트)

### 8.1 react-window 사용

**파일**: `src/features/products/components/VirtualProductList.tsx`

```typescript
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

interface VirtualProductListProps {
  products: Product[]
}

export function VirtualProductList({ products }: VirtualProductListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const product = products[index]

    return (
      <div style={style} className="flex items-center gap-4 px-4 py-2 border-b hover:bg-gray-50">
        <div className="flex-1">
          <p className="font-semibold">{product.name}</p>
          <p className="text-sm text-gray-600">{product.udi_di}</p>
        </div>
        <div className="text-sm text-gray-500">{product.model_name}</div>
      </div>
    )
  }

  return (
    <div className="h-[600px]">
      <AutoSizer>
        {({ height, width }) => (
          <List height={height} itemCount={products.length} itemSize={80} width={width}>
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  )
}
```

**패키지 설치**:

```bash
npm install react-window react-virtualized-auto-sizer
npm install -D @types/react-window @types/react-virtualized-auto-sizer
```

---

## 9. 캐싱 전략

### 9.1 TanStack Query 캐시 설정

**파일**: `src/lib/query-client.ts` (업데이트)

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 캐시 유지 시간 (5분)
      staleTime: 5 * 60 * 1000,

      // 캐시 메모리 유지 시간 (10분)
      gcTime: 10 * 60 * 1000,

      // 재시도 설정
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // 백그라운드 refetch 설정
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
  },
})
```

### 9.2 쿼리별 캐시 전략

```typescript
// 자주 변경되지 않는 데이터 (긴 캐시)
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    staleTime: 60 * 60 * 1000, // 1시간
  })
}

// 자주 변경되는 데이터 (짧은 캐시)
export function useInventory(orgId: string) {
  return useQuery({
    queryKey: ['inventory', orgId],
    queryFn: () => fetchInventory(orgId),
    staleTime: 30 * 1000, // 30초
    refetchInterval: 60 * 1000, // 1분마다 자동 refetch
  })
}

// 실시간 데이터 (캐시 없음)
export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    staleTime: 0, // 캐시 없음
    refetchOnWindowFocus: true,
  })
}
```

### 9.3 Prefetch 전략

```typescript
// 다음 페이지 미리 가져오기
export function useProductsWithPrefetch(organizationId: string) {
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(0)

  const query = useQuery({
    queryKey: ['products', organizationId, currentPage],
    queryFn: () => fetchProducts(organizationId, currentPage),
  })

  // 다음 페이지 prefetch
  useEffect(() => {
    const nextPage = currentPage + 1
    queryClient.prefetchQuery({
      queryKey: ['products', organizationId, nextPage],
      queryFn: () => fetchProducts(organizationId, nextPage),
    })
  }, [currentPage, organizationId, queryClient])

  return query
}
```

---

## 10. Memoization 최적화

### 10.1 React.memo 사용

```typescript
import { memo } from 'react'

interface ProductCardProps {
  product: Product
  onEdit: (id: string) => void
}

// ❌ 매번 리렌더링
export function ProductCard({ product, onEdit }: ProductCardProps) {
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => onEdit(product.id)}>Edit</button>
    </div>
  )
}

// ✅ props가 변경될 때만 리렌더링
export const ProductCard = memo(function ProductCard({ product, onEdit }: ProductCardProps) {
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => onEdit(product.id)}>Edit</button>
    </div>
  )
})
```

### 10.2 useMemo 사용

```typescript
export function ProductStats({ products }: { products: Product[] }) {
  // ❌ 매번 재계산
  const totalValue = products.reduce((sum, p) => sum + p.price * p.quantity, 0)

  // ✅ products가 변경될 때만 재계산
  const totalValue = useMemo(() => {
    return products.reduce((sum, p) => sum + p.price * p.quantity, 0)
  }, [products])

  return <div>Total: ${totalValue}</div>
}
```

### 10.3 useCallback 사용

```typescript
export function ProductList() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ❌ 매번 새 함수 생성
  const handleEdit = (id: string) => {
    setSelectedId(id)
  }

  // ✅ 함수 재사용
  const handleEdit = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  return (
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onEdit={handleEdit} />
      ))}
    </div>
  )
}
```

---

## 11. 성능 모니터링

### 11.1 Lighthouse CI 설정

**파일**: `.lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4173/", "http://localhost:4173/manufacturer", "http://localhost:4173/products"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "first-contentful-paint": ["warn", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }],
        "interactive": ["warn", { "maxNumericValue": 3800 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**package.json에 스크립트 추가**:

```json
{
  "scripts": {
    "lighthouse": "lhci autorun",
    "perf": "npm run build && npm run preview & lhci autorun"
  }
}
```

**패키지 설치**:

```bash
npm install -D @lhci/cli
```

### 11.2 Bundle Analyzer 사용

```bash
# 빌드 후 bundle 분석
npm run build

# dist/stats.html 파일 열기
open dist/stats.html
```

---

## 12. 테스트 시나리오

### 12.1 Code Splitting 테스트

```typescript
import { render, waitFor, screen } from '@testing-library/react'
import { AppRoutes } from '@/routes'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'

describe('Code Splitting', () => {
  it('라우트 이동 시 해당 페이지만 로드되어야 한다', async () => {
    // Given: 앱 렌더링
    render(
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    )

    // When: /products 페이지로 이동
    window.history.pushState({}, '', '/manufacturer/products')

    // Then: ProductListPage가 lazy load됨
    await waitFor(() => {
      expect(screen.getByText(/Product List/i)).toBeInTheDocument()
    })
  })
})
```

### 12.2 Lazy Image 테스트

```typescript
import { render, waitFor } from '@testing-library/react'
import { LazyImage } from '@/components/common/LazyImage'
import { describe, it, expect, vi } from 'vitest'

describe('LazyImage', () => {
  it('뷰포트에 들어오기 전에는 placeholder를 표시해야 한다', () => {
    // Given: IntersectionObserver mock
    const mockObserve = vi.fn()
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: mockObserve,
      disconnect: vi.fn(),
    }))

    // When: LazyImage 렌더링
    const { container } = render(<LazyImage src="/image.jpg" alt="Test" placeholder="/placeholder.svg" />)

    // Then: placeholder 표시
    const img = container.querySelector('img')
    expect(img?.src).toContain('/placeholder.svg')
  })

  it('뷰포트에 들어오면 실제 이미지를 로드해야 한다', async () => {
    // Given: IntersectionObserver mock (즉시 trigger)
    let callback: IntersectionObserverCallback
    global.IntersectionObserver = vi.fn().mockImplementation((cb) => {
      callback = cb
      return {
        observe: (element: Element) => {
          // 즉시 intersecting 상태로 변경
          callback([{ isIntersecting: true, target: element }] as any, {} as any)
        },
        disconnect: vi.fn(),
      }
    })

    // When: LazyImage 렌더링
    const { container } = render(<LazyImage src="/image.jpg" alt="Test" />)

    // Then: 실제 이미지 로드
    await waitFor(() => {
      const img = container.querySelector('img')
      expect(img?.src).toContain('/image.jpg')
    })
  })
})
```

### 12.3 인덱스 효과 테스트 (Manual)

```sql
-- 인덱스 없이 쿼리 실행
EXPLAIN ANALYZE
SELECT * FROM products
WHERE organization_id = 'org-123'
ORDER BY created_at DESC
LIMIT 20;

-- 예상 결과: Seq Scan (전체 스캔)
-- Execution Time: 150ms

-- 인덱스 생성
CREATE INDEX idx_products_organization_id ON products(organization_id);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

-- 인덱스 적용 후 쿼리 실행
EXPLAIN ANALYZE
SELECT * FROM products
WHERE organization_id = 'org-123'
ORDER BY created_at DESC
LIMIT 20;

-- 예상 결과: Index Scan (인덱스 스캔)
-- Execution Time: 5ms (30배 개선)
```

### 12.4 Virtual Scrolling 성능 테스트

```typescript
import { render } from '@testing-library/react'
import { VirtualProductList } from '@/features/products/components/VirtualProductList'
import { describe, it, expect } from 'vitest'

describe('VirtualProductList Performance', () => {
  it('10,000개 아이템을 렌더링해도 60fps를 유지해야 한다', () => {
    // Given: 10,000개 제품 데이터
    const products = Array.from({ length: 10000 }, (_, i) => ({
      id: `product-${i}`,
      name: `Product ${i}`,
      udi_di: `UDI-${i}`,
      model_name: `Model ${i}`,
    }))

    // When: VirtualProductList 렌더링
    const startTime = performance.now()
    const { container } = render(<VirtualProductList products={products} />)
    const endTime = performance.now()

    // Then: 렌더링 시간이 100ms 이하
    expect(endTime - startTime).toBeLessThan(100)

    // DOM 노드가 전체 아이템 수보다 훨씬 적어야 함 (가상화 확인)
    const renderedRows = container.querySelectorAll('[style*="position"]')
    expect(renderedRows.length).toBeLessThan(50) // 화면에 보이는 것만 렌더링
  })
})
```

---

## 13. 트러블슈팅

### 13.1 번들 크기가 너무 큼

**증상**:
- Initial bundle이 500KB 이상

**원인**:
- Tree shaking이 제대로 작동하지 않음
- 불필요한 라이브러리 포함

**해결**:
```bash
# Bundle analyzer로 큰 패키지 확인
npm run build
open dist/stats.html

# 큰 패키지 찾기
# 예: moment.js (350KB) → date-fns (10KB)로 대체

npm uninstall moment
npm install date-fns
```

### 13.2 Code Splitting이 작동하지 않음

**증상**:
- `React.lazy`를 사용했지만 여전히 하나의 큰 번들

**원인**:
- Dynamic import를 사용하지 않고 static import 사용

**해결**:
```typescript
// ❌ 잘못된 방식 - static import
import ProductListPage from '@/features/products/pages/ProductListPage'
const LazyProductList = lazy(() => Promise.resolve({ default: ProductListPage }))

// ✅ 올바른 방식 - dynamic import
const ProductListPage = lazy(() => import('@/features/products/pages/ProductListPage'))
```

### 13.3 이미지 로딩이 느림

**증상**:
- LCP가 4초 이상

**원인**:
- 이미지 파일 크기가 너무 큼 (2MB+)
- Lazy loading 미적용

**해결**:
```typescript
// 1. WebP 포맷 사용
// 2. 적절한 크기로 리사이징 (최대 1920px)
// 3. Lazy loading 적용
<LazyImage src="/large-image.webp" alt="Product" />

// 4. Supabase Storage에서 이미지 변환
const { data } = supabase.storage
  .from('products')
  .getPublicUrl('image.jpg', {
    transform: {
      width: 800,
      height: 600,
      quality: 80,
      format: 'webp',
    },
  })
```

### 13.4 인덱스를 추가했지만 쿼리가 여전히 느림

**증상**:
- 인덱스 생성 후에도 쿼리 응답 시간이 느림

**원인**:
- 잘못된 인덱스 생성
- 인덱스를 사용하지 않는 쿼리 패턴

**해결**:
```sql
-- EXPLAIN ANALYZE로 실제 실행 계획 확인
EXPLAIN ANALYZE
SELECT * FROM products
WHERE organization_id = 'org-123'
AND name LIKE '%keyword%'  -- LIKE '%keyword%'는 인덱스를 사용하지 못함
ORDER BY created_at DESC;

-- 해결: Full-text search 사용
CREATE INDEX idx_products_name_fts ON products USING gin(to_tsvector('english', name));

SELECT * FROM products
WHERE organization_id = 'org-123'
AND to_tsvector('english', name) @@ to_tsquery('keyword')
ORDER BY created_at DESC;
```

### 13.5 Virtual Scrolling에서 스크롤이 끊김

**증상**:
- 가상 스크롤 시 화면이 버벅거림

**원인**:
- Row 컴포넌트가 매번 리렌더링됨

**해결**:
```typescript
// Row 컴포넌트를 memo로 감싸기
const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
  const product = products[index]

  return (
    <div style={style}>
      {/* ... */}
    </div>
  )
})

// 또는 itemKey 제공
<List
  itemKey={(index) => products[index].id}
  // ...
>
  {Row}
</List>
```

---

## 14. Definition of Done

### 14.1 코드 완성도
- [ ] React.lazy를 사용한 라우트 기반 code splitting 구현 완료
- [ ] Vite 빌드 설정에 manualChunks 추가 완료
- [ ] LazyImage 컴포넌트 구현 완료
- [ ] 데이터베이스 인덱스 마이그레이션 파일 생성 완료
- [ ] 무한 스크롤 (useInfiniteQuery) 구현 완료
- [ ] VirtualProductList 컴포넌트 구현 완료 (선택적)
- [ ] Memoization (memo, useMemo, useCallback) 적용 완료

### 14.2 성능 목표 달성
- [ ] Lighthouse 점수: Performance 90+ 달성
- [ ] First Contentful Paint (FCP) < 1.8초
- [ ] Largest Contentful Paint (LCP) < 2.5초
- [ ] Total Blocking Time (TBT) < 200ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Initial bundle size < 200KB (gzipped)
- [ ] Total bundle size < 500KB (gzipped)

### 14.3 데이터베이스 최적화
- [ ] 모든 WHERE 절 컬럼에 인덱스 추가 완료
- [ ] 복합 인덱스 추가 완료 (자주 함께 조회되는 컬럼)
- [ ] EXPLAIN ANALYZE로 쿼리 실행 계획 확인 완료
- [ ] N+1 쿼리 문제 해결 완료 (JOIN 사용)
- [ ] 쿼리 응답 시간 < 100ms (단일 테이블 조회)

### 14.4 캐싱
- [ ] TanStack Query 캐시 전략 설정 완료 (staleTime, gcTime)
- [ ] 쿼리별 적절한 캐시 시간 설정 완료
- [ ] Prefetch 전략 구현 완료 (다음 페이지 미리 로드)

### 14.5 테스트
- [ ] Code splitting 테스트 1개 이상 작성 및 통과
- [ ] Lazy image 테스트 2개 이상 작성 및 통과
- [ ] 인덱스 효과 테스트 (Manual EXPLAIN ANALYZE) 수행 완료
- [ ] Virtual scrolling 성능 테스트 1개 이상 작성 및 통과

### 14.6 모니터링
- [ ] Bundle analyzer 설정 완료 (stats.html 생성)
- [ ] Lighthouse CI 설정 완료 (.lighthouserc.json)
- [ ] npm run perf 스크립트로 성능 측정 자동화 완료

### 14.7 문서화
- [ ] README에 성능 최적화 가이드 추가 완료
- [ ] 번들 크기 최적화 Best Practice 문서 작성 완료
- [ ] 데이터베이스 쿼리 최적화 가이드 작성 완료

### 14.8 배포
- [ ] 프로덕션 빌드 후 bundle size 확인 완료
- [ ] Vercel 배포 후 Lighthouse 점수 측정 완료
- [ ] 실제 사용자 환경에서 LCP < 3초 달성 확인

---

## 15. Git Commit 메시지

### 15.1 Code Splitting 구현
```bash
git add src/routes/index.tsx src/components/common/LoadingSpinner.tsx
git commit -m "feat(perf): Add route-based code splitting with React.lazy

- Lazy load all page components
- Add LoadingSpinner fallback for Suspense
- Reduce initial bundle size by ~40%

Refs: #PERF-001"
```

### 15.2 Bundle 최적화
```bash
git add vite.config.ts package.json
git commit -m "feat(build): Optimize bundle with code splitting and compression

- Add manualChunks for vendor code separation
- Enable Gzip and Brotli compression
- Add bundle analyzer (rollup-plugin-visualizer)
- Remove console.log in production (terser)
- Initial bundle: 180KB (down from 450KB)

Refs: #PERF-002"
```

### 15.3 이미지 최적화
```bash
git add src/components/common/LazyImage.tsx src/components/common/OptimizedImage.tsx
git commit -m "feat(perf): Add lazy loading and WebP support for images

- Implement LazyImage with IntersectionObserver
- Add OptimizedImage with WebP fallback
- Lazy load images 50px before viewport
- Reduce LCP from 4.2s to 2.1s

Refs: #PERF-003"
```

### 15.4 데이터베이스 최적화
```bash
git add supabase/migrations/20250121000000_add_performance_indexes.sql
git commit -m "feat(db): Add indexes for query performance optimization

- Add single-column indexes on organization_id, lot_id, product_id
- Add composite indexes for frequently joined columns
- Add indexes on date columns for ORDER BY optimization
- Query response time: 150ms → 5ms (30x improvement)

Refs: #PERF-004"
```

### 15.5 무한 스크롤 구현
```bash
git add src/features/products/api/useProducts.ts src/features/products/pages/ProductListPage.tsx
git commit -m "feat(perf): Implement infinite scroll pagination

- Replace full list loading with useInfiniteQuery
- Add IntersectionObserver for auto-loading next page
- Page size: 20 items per request
- Initial load time: 800ms → 120ms (6.6x improvement)

Refs: #PERF-005"
```

### 15.6 Virtual Scrolling
```bash
git add src/features/products/components/VirtualProductList.tsx package.json
git commit -m "feat(perf): Add virtual scrolling for large lists

- Install react-window and react-virtualized-auto-sizer
- Implement VirtualProductList component
- Render only visible items (~20 DOM nodes for 10,000 items)
- Maintain 60fps with 10,000+ items

Refs: #PERF-006"
```

### 15.7 Memoization
```bash
git add src/features/products/components/ProductCard.tsx src/features/products/pages/ProductListPage.tsx
git commit -m "feat(perf): Add memoization to prevent unnecessary re-renders

- Wrap ProductCard with React.memo
- Use useMemo for expensive calculations
- Use useCallback for stable function references
- Reduce re-renders by ~70%

Refs: #PERF-007"
```

### 15.8 성능 모니터링
```bash
git add .lighthouserc.json package.json
git commit -m "feat(perf): Add Lighthouse CI for automated performance testing

- Configure Lighthouse CI with performance thresholds
- Add npm run perf script for local testing
- Set FCP < 1.8s, LCP < 2.5s, CLS < 0.1 assertions

Refs: #PERF-008"
```

---

## 16. 참고 자료

### 16.1 공식 문서
- [Vite Performance Guide](https://vitejs.dev/guide/performance.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)

### 16.2 도구
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [react-window](https://github.com/bvaughn/react-window)

### 16.3 관련 Phase
- **Phase 8.1**: 환경 변수 관리 (환경별 최적화 설정)
- **Phase 8.2**: 에러 로깅 및 모니터링 (성능 데이터 수집)
- **Phase 1.4**: RLS 정책 (쿼리 성능에 영향)
- **Phase 8.5**: 배포 가이드 (CDN, Caching)

---

**문서 버전**: 1.0
**최종 수정일**: 2025-01-21
**작성자**: Development Team
**승인자**: Technical Lead
