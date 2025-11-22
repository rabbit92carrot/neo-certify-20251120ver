# Phase 3.1: 제품 목록 조회 UI

## 📋 Overview

**Phase 3.1**은 제조사가 등록한 제품 목록을 조회하는 UI를 구현합니다. TanStack Table을 활용한 고급 테이블 UI, 필터링, 정렬, 페이지네이션, 제품 활성화/비활성화 기능을 포함합니다.

### 주요 목표

1. **제품 목록 테이블 UI**: TanStack Table을 활용한 반응형 테이블 구현
2. **필터링 기능**: 제품명, UDI-DI, 모델명, 활성화 상태 필터
3. **정렬 및 페이지네이션**: 컬럼별 정렬, 페이지당 행 수 조절
4. **제품 활성화/비활성화**: 빠른 상태 토글 기능
5. **제품 상세 이동**: 제품 행 클릭 시 상세 페이지 이동

### 기술 스택

- **UI 라이브러리**: TanStack Table v8, shadcn/ui (Table, Input, Select, Badge)
- **상태 관리**: TanStack Query (useQuery, useQueryClient)
- **폼 관리**: React Hook Form + Zod
- **라우팅**: React Router v6

---

## 🎯 Development Principles Checklist

- [ ] **SSOT (Single Source of Truth)**: 모든 리터럴은 constants에서 관리
- [ ] **No Magic Numbers**: 하드코딩된 숫자 없이 상수 사용
- [ ] **No 'any' Type**: 모든 타입을 명시적으로 정의
- [ ] **Clean Code**: 함수는 단일 책임, 명확한 변수명
- [ ] **Test-Driven Development**: 테스트 시나리오 우선 작성
- [ ] **Git Conventional Commits**: feat/fix/docs/test 등 규칙 준수
- [ ] **Frontend-First Development**: API 호출 전 타입 및 인터페이스 정의
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 🔧 Required Constants

이 Phase에서 사용하는 모든 constants를 아래에 정의합니다.

### src/constants/status.ts
```typescript
// ⭐ TERMINOLOGY 상수 import 추가
import { TERMINOLOGY } from '@/constants/terminology'

export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const

// 하드코딩 제거 - TERMINOLOGY 사용
export const PRODUCT_STATUS_LABELS = {
  active: TERMINOLOGY.STATUSES.ACTIVE.ko,     // '활성'
  inactive: TERMINOLOGY.STATUSES.INACTIVE.ko,  // '비활성'
} as const

export const PRODUCT_STATUS_COLORS = {
  active: 'default',
  inactive: 'secondary',
} as const
```

### src/constants/messages.ts
```typescript
import { formatMessage } from '@/constants/messages'
import { TERMINOLOGY } from '@/constants/terminology'

export const SUCCESS_MESSAGES = {
  PRODUCT: {
    STATUS_UPDATED: formatMessage('{item} 상태가 업데이트되었습니다.', {
      item: TERMINOLOGY.ENTITIES.PRODUCT.ko
    }),
  },
} as const

export const ERROR_MESSAGES = {
  PRODUCT: {
    STATUS_UPDATE_FAILED: formatMessage('{item} 상태 업데이트에 실패했습니다.', {
      item: TERMINOLOGY.ENTITIES.PRODUCT.ko
    }),
  },
} as const
```

### src/constants/pagination.ts
```typescript
export const PAGINATION_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20
```

---

## 📦 Work Content

### 1. ProductListPage 컴포넌트

**파일 경로**: `src/pages/manufacturer/ProductListPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type PaginationState,
} from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  PRODUCT_STATUS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_COLORS,
} from '@/constants/status'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { PAGINATION_SIZES, DEFAULT_PAGE_SIZE } from '@/constants/pagination'
import { ROUTES } from '@/constants/routes'
import type { Product, Organization } from '@/types/database'

interface ProductWithOrganization extends Product {
  organization: Organization
}

const columnHelper = createColumnHelper<ProductWithOrganization>()

export function ProductListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Table state
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch products
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async () => {
      // First, get user's organization_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user!.id)
        .single()

      if (userError) throw userError

      // Then, fetch products for this organization
      const { data, error } = await supabase
        .from('products')
        .select('*, organization:organizations(*)')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ProductWithOrganization[]
    },
    enabled: !!user,
  })

  // Toggle product status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ productId, newStatus }: { productId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', productId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({
        title: SUCCESS_MESSAGES.PRODUCT.STATUS_UPDATED,
      })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.PRODUCT.UPDATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  // Table columns
  const columns = [
    columnHelper.accessor('name', {
      header: '제품명',
      cell: (info) => (
        <div className="font-medium text-gray-900">{info.getValue()}</div>
      ),
    }),
    columnHelper.accessor('udi_di', {
      header: 'UDI-DI',
      cell: (info) => (
        <div className="font-mono text-sm text-gray-600">{info.getValue()}</div>
      ),
    }),
    columnHelper.accessor('model_name', {
      header: '모델명',
      cell: (info) => (
        <div className="text-sm text-gray-600">{info.getValue()}</div>
      ),
    }),
    columnHelper.accessor('status', {
      header: '상태',
      cell: (info) => {
        const status = info.getValue()
        return (
          <Badge
            className={cn(
              'cursor-pointer transition-colors',
              PRODUCT_STATUS_COLORS[status as keyof typeof PRODUCT_STATUS]
            )}
            onClick={(e) => {
              e.stopPropagation()
              const newStatus =
                status === PRODUCT_STATUS.ACTIVE
                  ? PRODUCT_STATUS.INACTIVE
                  : PRODUCT_STATUS.ACTIVE
              toggleStatusMutation.mutate({
                productId: info.row.original.id,
                newStatus,
              })
            }}
          >
            {PRODUCT_STATUS_LABELS[status as keyof typeof PRODUCT_STATUS]}
          </Badge>
        )
      },
    }),
    columnHelper.accessor('created_at', {
      header: '등록일',
      cell: (info) => {
        const date = new Date(info.getValue())
        return (
          <div className="text-sm text-gray-600">
            {date.toLocaleDateString('ko-KR')}
          </div>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '작업',
      cell: (info) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`${ROUTES.MANUFACTURER.PRODUCTS}/${info.row.original.id}/edit`)
          }}
        >
          수정
        </Button>
      ),
    }),
  ]

  // Create table instance
  const table = useReactTable({
    data: products ?? [],
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Apply filters
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    table.getColumn('name')?.setFilterValue(value)
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    if (value === 'all') {
      table.getColumn('status')?.setFilterValue(undefined)
    } else {
      table.getColumn('status')?.setFilterValue(value)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg text-gray-600">제품 목록을 불러오는 중...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">
            {ERROR_MESSAGES.PRODUCT.FETCH_FAILED}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">제품 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            등록된 제품 목록을 조회하고 관리합니다
          </p>
        </div>
        <Button
          onClick={() => navigate(ROUTES.MANUFACTURER.PRODUCTS_NEW)}
        >
          제품 등록
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 md:flex-row md:items-center">
        <div className="flex-1">
          <Input
            placeholder="제품명 검색..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value={PRODUCT_STATUS.ACTIVE}>
                {PRODUCT_STATUS_LABELS.active}
              </SelectItem>
              <SelectItem value={PRODUCT_STATUS.INACTIVE}>
                {PRODUCT_STATUS_LABELS.inactive}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      header.column.getCanSort() && 'cursor-pointer select-none',
                      'font-semibold'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() === 'asc' && '↑'}
                      {header.column.getIsSorted() === 'desc' && '↓'}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-gray-600"
                >
                  등록된 제품이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    navigate(`${ROUTES.MANUFACTURER.PRODUCTS}/${row.original.id}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">페이지당 행 수:</span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGINATION_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {table.getState().pagination.pageIndex + 1} /{' '}
              {table.getPageCount()}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                다음
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-gray-50 p-4">
        <div className="text-sm text-gray-600">
          전체 <span className="font-semibold text-gray-900">{products?.length ?? 0}</span>개 제품
          {' · '}
          활성 <span className="font-semibold text-green-600">
            {products?.filter((p) => p.status === PRODUCT_STATUS.ACTIVE).length ?? 0}
          </span>개
          {' · '}
          비활성 <span className="font-semibold text-gray-600">
            {products?.filter((p) => p.status === PRODUCT_STATUS.INACTIVE).length ?? 0}
          </span>개
        </div>
      </div>
    </div>
  )
}
```

---

## 📝 TypeScript Type Definitions

**파일 경로**: `src/types/database.ts` (기존 파일에 추가)

```typescript
// Product 타입은 Phase 1.2에서 이미 정의됨
export interface Product {
  id: string
  organization_id: string
  name: string
  udi_di: string
  model_name: string
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string
  updated_at: string
}

// Organization 타입은 Phase 1.2에서 이미 정의됨
export interface Organization {
  id: string
  type: 'manufacturer' | 'distributor' | 'hospital'
  name: string
  business_number: string
  business_license_url: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  updated_at: string
}
```

**파일 경로**: `src/types/product.ts` (신규 파일)

```typescript
import type { Product, Organization } from './database'

export interface ProductWithOrganization extends Product {
  organization: Organization
}

export interface ProductListFilters {
  search?: string
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface ProductListSorting {
  column: 'name' | 'udi_di' | 'model_name' | 'created_at'
  direction: 'asc' | 'desc'
}
```

---

## 🔧 Constants Definitions

### 1. Product Status Constants

**파일 경로**: `src/constants/status.ts` (기존 파일에 추가)

```typescript
export const PRODUCT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export const PRODUCT_STATUS_LABELS = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
} as const

export const PRODUCT_STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800 hover:bg-green-200',
  INACTIVE: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
} as const
```

### 2. Pagination Constants

**파일 경로**: `src/constants/pagination.ts` (신규 파일)

```typescript
export const PAGINATION_SIZES = [10, 20, 50, 100] as const

export const DEFAULT_PAGE_SIZE = 20
```

### 3. Routes Constants

**파일 경로**: `src/constants/routes.ts` (기존 파일에 추가)

```typescript
export const ROUTES = {
  // ... 기존 routes
  MANUFACTURER: {
    DASHBOARD: '/manufacturer/dashboard',
    PRODUCTS: '/manufacturer/products',
    PRODUCTS_NEW: '/manufacturer/products/new',
    PRODUCTION: '/manufacturer/production',
    SHIPMENT: '/manufacturer/shipment',
    INVENTORY: '/manufacturer/inventory',
    HISTORY: '/manufacturer/history',
    SETTINGS: '/manufacturer/settings',
  },
  // ... 기타 roles
} as const
```

### 4. Messages Constants

**파일 경로**: `src/constants/messages.ts` (기존 파일에 추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존 messages
  PRODUCT: {
    STATUS_UPDATED: '제품 상태가 변경되었습니다.',
    CREATED: '제품이 등록되었습니다.',
    UPDATED: '제품 정보가 수정되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존 messages
  PRODUCT: {
    FETCH_FAILED: '제품 목록을 불러올 수 없습니다.',
    UPDATE_FAILED: '제품 상태 변경에 실패했습니다.',
    CREATE_FAILED: '제품 등록에 실패했습니다.',
  },
} as const
```

---

## 📁 Files Created/Modified

### 신규 파일

1. **src/pages/manufacturer/ProductListPage.tsx** (~280 lines)
   - 제품 목록 테이블 UI
   - TanStack Table 구현
   - 필터링, 정렬, 페이지네이션
   - 제품 상태 토글

2. **src/types/product.ts** (~20 lines)
   - ProductWithOrganization 타입
   - ProductListFilters 타입
   - ProductListSorting 타입

3. **src/constants/pagination.ts** (~5 lines)
   - PAGINATION_SIZES 상수
   - DEFAULT_PAGE_SIZE 상수

### 수정 파일

1. **src/constants/status.ts**
   - PRODUCT_STATUS 추가
   - PRODUCT_STATUS_LABELS 추가
   - PRODUCT_STATUS_COLORS 추가

2. **src/constants/routes.ts**
   - ROUTES.MANUFACTURER 경로 추가

3. **src/constants/messages.ts**
   - SUCCESS_MESSAGES.PRODUCT 추가
   - ERROR_MESSAGES.PRODUCT 추가

4. **src/App.tsx** (React Router 설정)
   - ProductListPage 라우트 추가

```typescript
// src/App.tsx
import { ProductListPage } from '@/pages/manufacturer/ProductListPage'

export function AppRoutes() {
  return (
    <Routes>
      {/* ... 기존 routes */}

      <Route
        path="/manufacturer/*"
        element={
          <ProtectedRoute allowedRoles={[ORGANIZATION_TYPE.MANUFACTURER]}>
            <BaseLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<ManufacturerDashboard />} />
        <Route path="products" element={<ProductListPage />} />
        {/* Phase 3.2에서 추가될 routes */}
      </Route>

      {/* ... 기타 routes */}
    </Routes>
  )
}
```

---

## ✅ Test Requirements

### ProductListPage 컴포넌트 테스트

**파일 경로**: `src/pages/manufacturer/__tests__/ProductListPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ProductListPage } from '../ProductListPage'
import { supabase } from '@/lib/supabase'
import { AuthContext } from '@/contexts/AuthContext'
import type { User } from '@supabase/supabase-js'
import type { ProductWithOrganization } from '@/types/product'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockProducts: ProductWithOrganization[] = [
  {
    id: '1',
    organization_id: 'org-1',
    name: '의료용 실',
    udi_di: '01234567890123',
    model_name: 'MODEL-A',
    status: 'ACTIVE',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
    organization: {
      id: 'org-1',
      type: 'manufacturer',
      name: '제조사 A',
      business_number: '123-45-67890',
      business_license_url: null,
      status: 'APPROVED',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  },
  {
    id: '2',
    organization_id: 'org-1',
    name: '수술용 바늘',
    udi_di: '01234567890124',
    model_name: 'MODEL-B',
    status: 'INACTIVE',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
    organization: {
      id: 'org-1',
      type: 'manufacturer',
      name: '제조사 A',
      business_number: '123-45-67890',
      business_license_url: null,
      status: 'APPROVED',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  },
]

const mockUser: User = {
  id: 'user-1',
  email: 'manufacturer@example.com',
  created_at: '2025-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
}

const mockAuthContextValue = {
  user: mockUser,
  session: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  updatePassword: vi.fn(),
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContextValue}>
          {ui}
        </AuthContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ProductListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('제품 목록을 성공적으로 렌더링해야 한다', async () => {
    // Mock Supabase queries
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
        order: vi.fn().mockResolvedValue({
          data: mockProducts,
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductListPage />)

    // Wait for products to load
    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    // Check if all products are displayed
    expect(screen.getByText('의료용 실')).toBeInTheDocument()
    expect(screen.getByText('수술용 바늘')).toBeInTheDocument()
    expect(screen.getByText('01234567890123')).toBeInTheDocument()
    expect(screen.getByText('01234567890124')).toBeInTheDocument()
  })

  it('제품명 검색 필터가 동작해야 한다', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
        order: vi.fn().mockResolvedValue({
          data: mockProducts,
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductListPage />)

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    // Search for "실"
    const searchInput = screen.getByPlaceholderText('제품명 검색...')
    await userEvent.type(searchInput, '실')

    // Only "의료용 실" should be visible
    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
      expect(screen.queryByText('수술용 바늘')).not.toBeInTheDocument()
    })
  })

  it('상태 필터가 동작해야 한다', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
        order: vi.fn().mockResolvedValue({
          data: mockProducts,
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductListPage />)

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    // Filter by "활성"
    const statusSelect = screen.getByRole('combobox', { name: /상태 필터/i })
    await userEvent.click(statusSelect)
    await userEvent.click(screen.getByText('활성'))

    // Only active products should be visible
    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
      expect(screen.queryByText('수술용 바늘')).not.toBeInTheDocument()
    })
  })

  it('제품 상태 토글이 동작해야 한다', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
        order: vi.fn().mockResolvedValue({
          data: mockProducts,
          error: null,
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(mockUpdate()),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductListPage />)

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    // Click on "활성" badge for first product
    const activeBadge = screen.getAllByText('활성')[0]
    await userEvent.click(activeBadge)

    // Check if update was called
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  it('페이지네이션이 동작해야 한다', async () => {
    // Create 25 products for pagination test
    const manyProducts = Array.from({ length: 25 }, (_, i) => ({
      ...mockProducts[0],
      id: `product-${i}`,
      name: `제품 ${i + 1}`,
      udi_di: `0123456789012${i}`,
    }))

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
        order: vi.fn().mockResolvedValue({
          data: manyProducts,
          error: null,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductListPage />)

    await waitFor(() => {
      expect(screen.getByText('제품 1')).toBeInTheDocument()
    })

    // Check page indicator
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument()

    // Click "다음" button
    const nextButton = screen.getByText('다음')
    await userEvent.click(nextButton)

    // Check if page 2 products are visible
    await waitFor(() => {
      expect(screen.getByText('제품 21')).toBeInTheDocument()
    })

    // Check page indicator updated
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument()
  })

  it('에러 상태를 렌더링해야 한다', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductListPage />)

    await waitFor(() => {
      expect(screen.getByText('제품 목록을 불러올 수 없습니다.')).toBeInTheDocument()
    })

    expect(screen.getByText('Database error')).toBeInTheDocument()
  })
})
```

### 테스트 시나리오 요약

1. **제품 목록 렌더링**: 제품 목록이 성공적으로 로드되고 테이블에 표시되는지 확인
2. **제품명 검색 필터**: 검색어 입력 시 필터링이 올바르게 동작하는지 확인
3. **상태 필터**: 활성/비활성 필터 선택 시 올바르게 필터링되는지 확인
4. **제품 상태 토글**: 상태 Badge 클릭 시 상태가 변경되고 mutation이 호출되는지 확인
5. **페이지네이션**: 다음/이전 페이지 버튼이 올바르게 동작하는지 확인
6. **에러 상태**: 데이터 fetch 실패 시 에러 메시지가 표시되는지 확인

---

## 🔍 Troubleshooting

### 1. 제품 목록이 로드되지 않음

**증상**:
```
제품 목록을 불러올 수 없습니다.
```

**원인**:
- Supabase RLS 정책이 제대로 설정되지 않음
- `organization_id` 불일치

**해결**:

1. Supabase RLS 정책 확인:
```sql
-- products 테이블 SELECT 정책
CREATE POLICY "Users can view products from their organization"
ON products FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
```

2. 사용자 organization_id 확인:
```typescript
const { data: userData } = await supabase
  .from('users')
  .select('organization_id')
  .eq('id', user!.id)
  .single()

console.log('User organization_id:', userData?.organization_id)
```

---

### 2. 제품 상태 토글이 동작하지 않음

**증상**:
```
제품 상태 변경에 실패했습니다.
```

**원인**:
- Supabase RLS UPDATE 정책이 없음
- 업데이트 권한 부족

**해결**:

1. Supabase RLS UPDATE 정책 추가:
```sql
CREATE POLICY "Users can update products from their organization"
ON products FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
```

2. Mutation 에러 로깅:
```typescript
const toggleStatusMutation = useMutation({
  mutationFn: async ({ productId, newStatus }) => {
    const { error } = await supabase
      .from('products')
      .update({ status: newStatus })
      .eq('id', productId)

    if (error) {
      console.error('Update error:', error)
      throw error
    }
  },
  // ...
})
```

---

### 3. TanStack Table 필터링이 동작하지 않음

**증상**:
- 검색어 입력해도 테이블이 필터링되지 않음

**원인**:
- `getFilteredRowModel()` 누락
- 컬럼 ID 불일치

**해결**:

1. Table 설정 확인:
```typescript
const table = useReactTable({
  data: products ?? [],
  columns,
  state: {
    sorting,
    columnFilters, // 필수
    pagination,
  },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(), // 필수!
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
})
```

2. 컬럼 ID 확인:
```typescript
// 컬럼 accessor 이름과 setFilterValue의 컬럼 이름이 일치해야 함
table.getColumn('name')?.setFilterValue(value) // 'name'은 accessor 이름
```

---

### 4. 페이지네이션이 올바르게 동작하지 않음

**증상**:
- "다음" 버튼 클릭해도 페이지가 넘어가지 않음

**원인**:
- `getPaginationRowModel()` 누락
- 페이지 상태 관리 오류

**해결**:

1. Pagination 모델 확인:
```typescript
const table = useReactTable({
  // ...
  state: {
    pagination, // 필수
  },
  onPaginationChange: setPagination, // 필수
  getPaginationRowModel: getPaginationRowModel(), // 필수!
})
```

2. 페이지 상태 초기화:
```typescript
const [pagination, setPagination] = useState<PaginationState>({
  pageIndex: 0, // 0부터 시작
  pageSize: DEFAULT_PAGE_SIZE,
})
```

---

### 5. 모바일에서 테이블이 잘림

**증상**:
- 모바일에서 테이블 컬럼이 화면 밖으로 벗어남

**원인**:
- 반응형 처리 누락
- 고정 너비 테이블

**해결**:

1. 테이블 래퍼에 overflow 추가:
```typescript
<div className="overflow-x-auto rounded-lg border bg-white">
  <Table>
    {/* ... */}
  </Table>
</div>
```

2. 모바일에서 일부 컬럼 숨김:
```typescript
columnHelper.accessor('udi_di', {
  header: 'UDI-DI',
  cell: (info) => (
    <div className="hidden font-mono text-sm text-gray-600 md:block">
      {info.getValue()}
    </div>
  ),
})
```

---

## 🔄 Git Commit Message

```bash
feat(manufacturer): add product list page with filtering and pagination

- Implement ProductListPage with TanStack Table
- Add product name search and status filter
- Add column sorting and pagination
- Add product status toggle (active/inactive)
- Add product summary statistics
- Create product types and constants

Test scenarios:
- Product list rendering
- Search filter functionality
- Status filter functionality
- Status toggle mutation
- Pagination controls
- Error state rendering

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] ProductListPage 컴포넌트 구현 완료
- [ ] TanStack Table 통합 완료
- [ ] 제품명 검색 필터 동작 확인
- [ ] 상태 필터 (활성/비활성) 동작 확인
- [ ] 컬럼별 정렬 기능 동작 확인
- [ ] 페이지네이션 (이전/다음, 페이지 크기 조절) 동작 확인
- [ ] 제품 상태 토글 (Badge 클릭) 동작 확인
- [ ] 제품 행 클릭 시 상세 페이지 이동 확인
- [ ] "제품 등록" 버튼 클릭 시 등록 페이지 이동 확인
- [ ] 제품 요약 통계 (전체/활성/비활성 개수) 표시 확인
- [ ] 로딩 상태 UI 표시 확인
- [ ] 에러 상태 UI 표시 확인
- [ ] 빈 상태 ("등록된 제품이 없습니다") 표시 확인
- [ ] 모바일 반응형 레이아웃 확인
- [ ] PRODUCT_STATUS, PAGINATION_SIZES 등 constants 정의 완료
- [ ] ProductWithOrganization, ProductListFilters 등 타입 정의 완료
- [ ] 6개 테스트 시나리오 통과
- [ ] Supabase RLS 정책 (SELECT, UPDATE) 설정 확료
- [ ] TypeScript strict mode 컴파일 에러 없음
- [ ] ESLint 경고 없음
- [ ] Git commit (Conventional Commits) 완료

---

## 🔗 References

- [TanStack Table Documentation](https://tanstack.com/table/v8)
- [shadcn/ui Table Component](https://ui.shadcn.com/docs/components/table)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 3.2 - 제품 CRUD](phase-3.2-product-crud.md)

**Phase 3.2 개요**:
- 제품 등록 폼 (ProductCreatePage)
- 제품 수정 폼 (ProductEditPage)
- 제품 상세 페이지 (ProductDetailPage)
- UDI-DI 중복 검증
- 제품 비활성화 기능
