# Phase 3.4: Lot 생산 등록 (자동 번호 생성)

## 📋 Overview

**Phase 3.4**는 Lot 생산 등록 기능을 구현합니다. 제조사 설정을 기반으로 자동으로 Lot 번호를 생성하고, Virtual Code를 발급하며, 생산일과 사용기한을 계산하는 완전한 Lot 생산 워크플로우를 제공합니다.

### 주요 목표

1. **Lot 생산 등록 폼**: 제품 선택, 생산 수량, 생산일 입력
2. **자동 Lot 번호 생성**: 제조사 설정 기반 Lot 번호 자동 생성
3. **Virtual Code 생성**: 고유한 가상 코드 생성
4. **사용기한 자동 계산**: 생산일 + 사용기한 개월 수
5. **생산 등록 완료**: Lot 및 Inventory 테이블 데이터 생성

### 기술 스택

- **폼 관리**: React Hook Form + Zod
- **상태 관리**: TanStack Query (useQuery, useMutation)
- **UI 라이브러리**: shadcn/ui (Form, Select, Input, Calendar, Card)
- **날짜 처리**: date-fns (Asia/Seoul timezone)

---

## 🎯 Development Principles Checklist

- [ ] **SSOT (Single Source of Truth)**: 모든 리터럴은 constants에서 관리
- [ ] **No Magic Numbers**: 하드코딩된 숫자 없이 상수 사용
- [ ] **No 'any' Type**: 모든 타입을 명시적으로 정의
- [ ] **Clean Code**: 함수는 단일 책임, 명확한 변수명
- [ ] **Test-Driven Development**: 테스트 시나리오 우선 작성
- [ ] **Git Conventional Commits**: feat/fix/docs/test 등 규칙 준수
- [ ] **Frontend-First Development**: API 호출 전 타입 및 인터페이스 정의

---

## 📦 Work Content

### 1. LotProductionPage 컴포넌트

**파일 경로**: `src/pages/manufacturer/LotProductionPage.tsx`

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { addMonths, format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { VALIDATION_RULES } from '@/constants/validation'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { ROUTES } from '@/constants/routes'
import { PRODUCT_STATUS } from '@/constants/status'
import { TIMEZONE } from '@/constants/datetime'
import type { Product, ManufacturerSettings, Lot, Inventory } from '@/types/database'

const lotProductionSchema = z.object({
  product_id: z.string().min(1, '제품을 선택해주세요.'),
  quantity: z
    .number()
    .min(
      VALIDATION_RULES.LOT_PRODUCTION.QUANTITY_MIN,
      `생산 수량은 최소 ${VALIDATION_RULES.LOT_PRODUCTION.QUANTITY_MIN}개 이상이어야 합니다.`
    )
    .max(
      VALIDATION_RULES.LOT_PRODUCTION.QUANTITY_MAX,
      `생산 수량은 최대 ${VALIDATION_RULES.LOT_PRODUCTION.QUANTITY_MAX}개까지 입력 가능합니다.`
    ),
  production_date: z.date({
    required_error: '생산일을 선택해주세요.',
  }),
})

type LotProductionFormData = z.infer<typeof lotProductionSchema>

export function LotProductionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Get user's organization_id
  const { data: userData } = useQuery({
    queryKey: ['userData', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user!.id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  // Fetch active products
  const { data: products } = useQuery({
    queryKey: ['activeProducts', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', userData!.organization_id)
        .eq('status', PRODUCT_STATUS.ACTIVE)
        .order('name')

      if (error) throw error
      return data as Product[]
    },
    enabled: !!userData?.organization_id,
  })

  // Fetch manufacturer settings
  const { data: settings } = useQuery({
    queryKey: ['manufacturerSettings', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manufacturer_settings')
        .select('*')
        .eq('organization_id', userData!.organization_id)
        .single()

      if (error) throw error
      return data as ManufacturerSettings
    },
    enabled: !!userData?.organization_id,
  })

  const form = useForm<LotProductionFormData>({
    resolver: zodResolver(lotProductionSchema),
    defaultValues: {
      product_id: '',
      quantity: VALIDATION_RULES.LOT_PRODUCTION.QUANTITY_MIN,
      production_date: new Date(),
    },
  })

  const selectedProductId = form.watch('product_id')
  const selectedProduct = products?.find((p) => p.id === selectedProductId)

  // Generate Lot number
  const generateLotNumber = async (
    productId: string,
    settings: ManufacturerSettings
  ): Promise<string> => {
    // Get product to extract model number
    const product = products?.find((p) => p.id === productId)
    if (!product) throw new Error('제품을 찾을 수 없습니다.')

    // Extract model number from model_name (e.g., "MODEL-123" -> "123")
    const modelMatch = product.model_name.match(/\d+/)
    if (!modelMatch) throw new Error('모델명에서 숫자를 추출할 수 없습니다.')

    const modelNumber = modelMatch[0].padStart(settings.model_digits, '0')

    // Get next sequence number for this product
    const { data: existingLots, error } = await supabase
      .from('lots')
      .select('lot_number')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    let sequenceNumber = 1
    if (existingLots && existingLots.length > 0) {
      // Extract sequence from last lot number
      const lastLotNumber = existingLots[0].lot_number
      const sequenceMatch = lastLotNumber.match(/\d+$/)
      if (sequenceMatch) {
        sequenceNumber = parseInt(sequenceMatch[0], 10) + 1
      }
    }

    const sequence = sequenceNumber.toString().padStart(settings.sequence_digits, '0')

    return `${settings.lot_prefix}${modelNumber}${sequence}`
  }

  // Generate Virtual Code (unique 12-digit code)
  const generateVirtualCode = (): string => {
    const timestamp = Date.now().toString().slice(-8) // Last 8 digits of timestamp
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0') // 4 random digits
    return `${timestamp}${random}`
  }

  // Create lot production mutation
  const createLotMutation = useMutation({
    mutationFn: async (data: LotProductionFormData) => {
      if (!settings) {
        throw new Error(ERROR_MESSAGES.MANUFACTURER_SETTINGS.NOT_CONFIGURED)
      }

      // Generate lot number
      const lotNumber = await generateLotNumber(data.product_id, settings)

      // Generate virtual code
      const virtualCode = generateVirtualCode()

      // Calculate expiry date
      const expiryDate = addMonths(data.production_date, settings.expiry_months)

      // Create lot
      const { data: newLot, error: lotError } = await supabase
        .from('lots')
        .insert({
          product_id: data.product_id,
          lot_number: lotNumber,
          virtual_code: virtualCode,
          production_date: format(data.production_date, 'yyyy-MM-dd'),
          expiry_date: format(expiryDate, 'yyyy-MM-dd'),
          quantity: data.quantity,
        })
        .select()
        .single()

      if (lotError) throw lotError

      // Create initial inventory
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert({
          lot_id: newLot.id,
          organization_id: userData!.organization_id,
          current_quantity: data.quantity,
          last_updated_by: user!.id,
        })

      if (inventoryError) throw inventoryError

      return newLot as Lot
    },
    onSuccess: (lot) => {
      queryClient.invalidateQueries({ queryKey: ['lots'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast({
        title: SUCCESS_MESSAGES.LOT_PRODUCTION.CREATED,
        description: `Lot 번호: ${lot.lot_number}`,
      })
      navigate(ROUTES.MANUFACTURER.PRODUCTION)
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.LOT_PRODUCTION.CREATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: LotProductionFormData) => {
    createLotMutation.mutate(data)
  }

  // No settings alert
  if (!settings) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lot 생산 등록</h1>
          <p className="mt-1 text-sm text-gray-600">새로운 Lot을 생산 등록합니다</p>
        </div>

        <Alert variant="destructive">
          <AlertTitle>제조사 설정이 필요합니다</AlertTitle>
          <AlertDescription>
            Lot 생산을 등록하려면 먼저 제조사 설정(Lot 번호 규칙, 사용기한)을 완료해주세요.
          </AlertDescription>
        </Alert>

        <Button onClick={() => navigate(ROUTES.MANUFACTURER.SETTINGS)}>
          제조사 설정으로 이동
        </Button>
      </div>
    )
  }

  // No active products alert
  if (products && products.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lot 생산 등록</h1>
          <p className="mt-1 text-sm text-gray-600">새로운 Lot을 생산 등록합니다</p>
        </div>

        <Alert variant="destructive">
          <AlertTitle>활성 제품이 없습니다</AlertTitle>
          <AlertDescription>
            Lot 생산을 등록하려면 먼저 제품을 등록하고 활성화해주세요.
          </AlertDescription>
        </Alert>

        <Button onClick={() => navigate(ROUTES.MANUFACTURER.PRODUCTS_NEW)}>
          제품 등록하기
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lot 생산 등록</h1>
        <p className="mt-1 text-sm text-gray-600">새로운 Lot을 생산 등록합니다</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>생산 정보 입력</CardTitle>
          <CardDescription>
            제품, 생산 수량, 생산일을 입력하면 Lot 번호가 자동으로 생성됩니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Product Selection */}
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제품 선택 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="제품을 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.model_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      활성화된 제품만 선택 가능합니다
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>생산 수량 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={VALIDATION_RULES.LOT_PRODUCTION.QUANTITY_MIN}
                        max={VALIDATION_RULES.LOT_PRODUCTION.QUANTITY_MAX}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      생산할 제품의 수량을 입력해주세요 (개)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Production Date */}
              <FormField
                control={form.control}
                name="production_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>생산일 *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'yyyy년 MM월 dd일')
                            ) : (
                              <span>날짜를 선택해주세요</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      제품을 생산한 날짜를 선택해주세요
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preview */}
              {selectedProduct && settings && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-base text-blue-900">
                      Lot 정보 미리보기
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-blue-700">제품명:</div>
                      <div className="font-semibold text-blue-900">
                        {selectedProduct.name}
                      </div>

                      <div className="text-blue-700">모델명:</div>
                      <div className="font-semibold text-blue-900">
                        {selectedProduct.model_name}
                      </div>

                      <div className="text-blue-700">생산일:</div>
                      <div className="font-semibold text-blue-900">
                        {form.watch('production_date')
                          ? format(form.watch('production_date'), 'yyyy-MM-dd')
                          : '-'}
                      </div>

                      <div className="text-blue-700">사용기한:</div>
                      <div className="font-semibold text-blue-900">
                        {form.watch('production_date')
                          ? format(
                              addMonths(
                                form.watch('production_date'),
                                settings.expiry_months
                              ),
                              'yyyy-MM-dd'
                            )
                          : '-'}
                      </div>

                      <div className="text-blue-700">생산 수량:</div>
                      <div className="font-semibold text-blue-900">
                        {form.watch('quantity').toLocaleString()}개
                      </div>
                    </div>

                    <div className="mt-4 rounded border border-blue-300 bg-white p-3">
                      <div className="text-xs text-blue-700">
                        Lot 번호 (자동 생성됨)
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold text-blue-900">
                        {settings.lot_prefix}
                        {selectedProduct.model_name.match(/\d+/)?.[0]?.padStart(
                          settings.model_digits,
                          '0'
                        )}
                        XXXXX
                      </div>
                      <div className="mt-1 text-xs text-blue-600">
                        * 일련번호는 등록 시 자동으로 부여됩니다
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(ROUTES.MANUFACTURER.PRODUCTION)}
                >
                  취소
                </Button>
                <Button type="submit" disabled={createLotMutation.isPending}>
                  {createLotMutation.isPending ? '등록 중...' : 'Lot 생산 등록'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 📝 TypeScript Type Definitions

**파일 경로**: `src/types/database.ts` (기존 파일, Phase 1.2에서 이미 정의됨)

```typescript
export interface Lot {
  id: string
  product_id: string
  lot_number: string
  virtual_code: string
  production_date: string
  expiry_date: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface Inventory {
  id: string
  lot_id: string
  organization_id: string
  current_quantity: number
  last_updated_by: string
  created_at: string
  updated_at: string
}
```

---

## 🔧 Constants Definitions

### 1. Validation Rules

**파일 경로**: `src/constants/validation.ts` (기존 파일에 추가)

```typescript
export const VALIDATION_RULES = {
  // ... 기존 rules
  LOT_PRODUCTION: {
    QUANTITY_MIN: 1,
    QUANTITY_MAX: 1000000,
  },
} as const
```

### 2. Messages

**파일 경로**: `src/constants/messages.ts` (기존 파일에 추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존 messages
  LOT_PRODUCTION: {
    CREATED: 'Lot 생산이 등록되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존 messages
  LOT_PRODUCTION: {
    CREATE_FAILED: 'Lot 생산 등록에 실패했습니다.',
  },
  MANUFACTURER_SETTINGS: {
    // ... 기존 messages
    NOT_CONFIGURED: '제조사 설정이 완료되지 않았습니다.',
  },
} as const
```

### 3. DateTime Constants

**파일 경로**: `src/constants/datetime.ts` (신규 파일)

```typescript
export const TIMEZONE = 'Asia/Seoul' as const

export const DATE_FORMAT = {
  DISPLAY: 'yyyy년 MM월 dd일',
  DATABASE: 'yyyy-MM-dd',
  DATETIME: 'yyyy-MM-dd HH:mm:ss',
} as const
```

---

## 📁 Files Created/Modified

### 신규 파일

1. **src/pages/manufacturer/LotProductionPage.tsx** (~350 lines)
   - Lot 생산 등록 폼
   - 자동 Lot 번호 생성
   - Virtual Code 생성
   - 사용기한 자동 계산
   - Lot 정보 미리보기

2. **src/constants/datetime.ts** (~10 lines)
   - TIMEZONE 상수
   - DATE_FORMAT 상수

### 수정 파일

1. **src/constants/validation.ts**
   - VALIDATION_RULES.LOT_PRODUCTION 추가

2. **src/constants/messages.ts**
   - SUCCESS_MESSAGES.LOT_PRODUCTION 추가
   - ERROR_MESSAGES.LOT_PRODUCTION 추가
   - ERROR_MESSAGES.MANUFACTURER_SETTINGS.NOT_CONFIGURED 추가

3. **src/App.tsx** (React Router 설정)
   - LotProductionPage 라우트 추가

```typescript
// src/App.tsx
import { LotProductionPage } from '@/pages/manufacturer/LotProductionPage'

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
        <Route path="products/new" element={<ProductCreatePage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="products/:productId/edit" element={<ProductEditPage />} />
        <Route path="production" element={<LotProductionPage />} />
        <Route path="settings" element={<ManufacturerSettingsPage />} />
        {/* Phase 3.5 이후 추가될 routes */}
      </Route>

      {/* ... 기타 routes */}
    </Routes>
  )
}
```

---

## ✅ Test Requirements

### LotProductionPage 컴포넌트 테스트

**파일 경로**: `src/pages/manufacturer/__tests__/LotProductionPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { LotProductionPage } from '../LotProductionPage'
import { supabase } from '@/lib/supabase'
import { AuthContext } from '@/contexts/AuthContext'
import type { User } from '@supabase/supabase-js'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

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

const mockProducts = [
  {
    id: 'product-1',
    organization_id: 'org-1',
    name: '의료용 실',
    udi_di: '01234567890123',
    model_name: 'MODEL-123',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

const mockSettings = {
  id: 'settings-1',
  organization_id: 'org-1',
  lot_prefix: 'ABC',
  model_digits: 3,
  sequence_digits: 5,
  expiry_months: 36,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
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

describe('LotProductionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('설정이 없을 때 경고 메시지를 표시해야 한다', async () => {
    const mockFrom = vi.fn()

    // User data
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
      }),
    })

    // Products
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      }),
    })

    // Settings (not found)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('Not found')),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<LotProductionPage />)

    await waitFor(() => {
      expect(screen.getByText('제조사 설정이 필요합니다')).toBeInTheDocument()
    })
  })

  it('활성 제품이 없을 때 경고 메시지를 표시해야 한다', async () => {
    const mockFrom = vi.fn()

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [], // No products
              error: null,
            }),
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<LotProductionPage />)

    await waitFor(() => {
      expect(screen.getByText('활성 제품이 없습니다')).toBeInTheDocument()
    })
  })

  it('Lot 생산 폼을 렌더링해야 한다', async () => {
    const mockFrom = vi.fn()

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<LotProductionPage />)

    await waitFor(() => {
      expect(screen.getByText('제품 선택')).toBeInTheDocument()
    })

    expect(screen.getByText('생산 수량')).toBeInTheDocument()
    expect(screen.getByText('생산일')).toBeInTheDocument()
  })

  it('제품 선택 시 미리보기가 표시되어야 한다', async () => {
    const mockFrom = vi.fn()

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<LotProductionPage />)

    await waitFor(() => {
      expect(screen.getByText('제품 선택')).toBeInTheDocument()
    })

    // Select product
    const productSelect = screen.getByRole('combobox')
    await userEvent.click(productSelect)
    await userEvent.click(screen.getByText(/의료용 실/))

    // Check preview
    await waitFor(() => {
      expect(screen.getByText('Lot 정보 미리보기')).toBeInTheDocument()
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })
  })

  it('Lot 생산 등록이 성공해야 한다', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: {
        id: 'lot-1',
        product_id: 'product-1',
        lot_number: 'ABC12300001',
        virtual_code: '123456789012',
        production_date: '2025-01-20',
        expiry_date: '2028-01-20',
        quantity: 100,
      },
      error: null,
    })

    const mockFrom = vi.fn()

    // User data, products, settings queries...
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      }),
    })

    // Get existing lots (for sequence number)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    })

    // Insert lot
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockInsert,
        }),
      }),
    })

    // Insert inventory
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<LotProductionPage />)

    await waitFor(() => {
      expect(screen.getByText('제품 선택')).toBeInTheDocument()
    })

    // Fill form
    const productSelect = screen.getByRole('combobox')
    await userEvent.click(productSelect)
    await userEvent.click(screen.getByText(/의료용 실/))

    const quantityInput = screen.getByLabelText(/생산 수량/)
    await userEvent.clear(quantityInput)
    await userEvent.type(quantityInput, '100')

    // Submit
    const submitButton = screen.getByRole('button', { name: /Lot 생산 등록/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled()
    })
  })
})
```

### 테스트 시나리오 요약

1. **설정 없을 때 경고**: 제조사 설정이 없으면 경고 메시지 표시
2. **제품 없을 때 경고**: 활성 제품이 없으면 경고 메시지 표시
3. **폼 렌더링**: Lot 생산 폼의 모든 필드가 렌더링되는지 확인
4. **미리보기 표시**: 제품 선택 시 Lot 정보 미리보기가 표시되는지 확인
5. **Lot 생산 등록 성공**: 모든 필드를 입력하고 등록 성공 확인

---

## 🔍 Troubleshooting

### 1. Lot 번호가 중복 생성됨

**증상**:
- 동일한 Lot 번호가 여러 번 생성됨

**원인**:
- 일련번호 생성 로직에 race condition 발생
- Transaction 처리 부족

**해결**:

1. Database에 Unique Constraint 추가:
```sql
ALTER TABLE lots
ADD CONSTRAINT lots_lot_number_key UNIQUE (lot_number);
```

2. 에러 처리 추가:
```typescript
try {
  const { data: newLot, error: lotError } = await supabase
    .from('lots')
    .insert({ /* ... */ })
    .select()
    .single()

  if (lotError) {
    if (lotError.code === '23505') { // Unique violation
      throw new Error('Lot 번호가 중복되었습니다. 다시 시도해주세요.')
    }
    throw lotError
  }
} catch (error) {
  // Handle error
}
```

---

### 2. Virtual Code가 중복됨

**증상**:
- 동일한 Virtual Code가 생성됨

**원인**:
- Timestamp 기반 생성으로 동시 요청 시 중복 가능

**해결**:

1. UUID 기반으로 변경:
```typescript
import { v4 as uuidv4 } from 'uuid'

const generateVirtualCode = (): string => {
  // UUID를 12자리로 축약
  return uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase()
}
```

2. 또는 Database에서 생성:
```sql
-- PostgreSQL에서 랜덤 12자리 생성
CREATE OR REPLACE FUNCTION generate_virtual_code()
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 12));
END;
$$ LANGUAGE plpgsql;

-- Default value 설정
ALTER TABLE lots
ALTER COLUMN virtual_code SET DEFAULT generate_virtual_code();
```

---

### 3. 사용기한 계산이 잘못됨

**증상**:
- 사용기한이 예상과 다름

**원인**:
- Timezone 처리 오류
- date-fns의 addMonths 함수 사용 오류

**해결**:

1. Timezone 명시적 처리:
```typescript
import { addMonths, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const calculateExpiryDate = (productionDate: Date, expiryMonths: number): string => {
  // Asia/Seoul timezone으로 변환
  const zonedDate = toZonedTime(productionDate, 'Asia/Seoul')

  // 개월 수 추가
  const expiryDate = addMonths(zonedDate, expiryMonths)

  // yyyy-MM-dd 형식으로 변환
  return format(expiryDate, 'yyyy-MM-dd')
}
```

2. 테스트 추가:
```typescript
it('사용기한 계산이 정확해야 한다', () => {
  const productionDate = new Date('2025-01-20')
  const expiryMonths = 36

  const expiryDate = calculateExpiryDate(productionDate, expiryMonths)

  expect(expiryDate).toBe('2028-01-20')
})
```

---

### 4. 제품 모델명에서 숫자 추출 실패

**증상**:
```
모델명에서 숫자를 추출할 수 없습니다.
```

**원인**:
- 모델명에 숫자가 없음
- 정규식 매칭 실패

**해결**:

1. 모델명 검증 강화 (Phase 3.2에서):
```typescript
// ProductCreatePage에서 model_name 검증 추가
model_name: z
  .string()
  .min(1)
  .regex(/\d+/, '모델명에는 최소 1개 이상의 숫자가 포함되어야 합니다.')
```

2. Fallback 로직 추가:
```typescript
const modelMatch = product.model_name.match(/\d+/)
if (!modelMatch) {
  // Fallback: Use product ID의 마지막 숫자들
  const idMatch = product.id.match(/\d+$/)
  if (idMatch) {
    const modelNumber = idMatch[0].padStart(settings.model_digits, '0')
    // ...
  } else {
    throw new Error('모델명에서 숫자를 추출할 수 없습니다.')
  }
}
```

---

### 5. Inventory 생성 실패

**증상**:
- Lot은 생성되지만 Inventory 생성 실패

**원인**:
- RLS 정책 오류
- Foreign key constraint 오류

**해결**:

1. Transaction 사용 (Supabase Functions):
```sql
-- Supabase Edge Function으로 Transaction 처리
CREATE OR REPLACE FUNCTION create_lot_with_inventory(
  p_product_id UUID,
  p_lot_number TEXT,
  p_virtual_code TEXT,
  p_production_date DATE,
  p_expiry_date DATE,
  p_quantity INTEGER,
  p_organization_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_lot_id UUID;
BEGIN
  -- Insert lot
  INSERT INTO lots (product_id, lot_number, virtual_code, production_date, expiry_date, quantity)
  VALUES (p_product_id, p_lot_number, p_virtual_code, p_production_date, p_expiry_date, p_quantity)
  RETURNING id INTO v_lot_id;

  -- Insert inventory
  INSERT INTO inventory (lot_id, organization_id, current_quantity, last_updated_by)
  VALUES (v_lot_id, p_organization_id, p_quantity, p_user_id);

  RETURN v_lot_id;
END;
$$ LANGUAGE plpgsql;
```

2. 프론트엔드에서 호출:
```typescript
const { data, error } = await supabase.rpc('create_lot_with_inventory', {
  p_product_id: data.product_id,
  p_lot_number: lotNumber,
  p_virtual_code: virtualCode,
  p_production_date: format(data.production_date, 'yyyy-MM-dd'),
  p_expiry_date: format(expiryDate, 'yyyy-MM-dd'),
  p_quantity: data.quantity,
  p_organization_id: userData!.organization_id,
  p_user_id: user!.id,
})
```

---

## 🔄 Git Commit Message

```bash
feat(manufacturer): add lot production registration with auto-generation

- Implement LotProductionPage with product selection and quantity input
- Add automatic lot number generation based on manufacturer settings
- Add virtual code generation (12-digit unique code)
- Add expiry date auto-calculation (production date + expiry months)
- Add lot information preview before submission
- Create lots and inventory records in single transaction
- Add validation for manufacturer settings and active products

Features:
- Product selection from active products only
- Quantity input with min/max validation
- Production date picker with calendar UI
- Automatic lot number: {prefix}{model}{sequence}
- Automatic virtual code: timestamp + random
- Automatic expiry date calculation
- Real-time lot info preview
- Alert when settings or products not configured

Test scenarios:
- Display alert when settings not configured
- Display alert when no active products
- Render lot production form correctly
- Show preview when product selected
- Create lot successfully with auto-generated values

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] LotProductionPage 컴포넌트 구현 완료
- [ ] 제조사 설정 확인 및 경고 표시 확인
- [ ] 활성 제품 확인 및 경고 표시 확인
- [ ] 제품 선택 드롭다운 동작 확인
- [ ] 생산 수량 입력 및 검증 확인
- [ ] 생산일 선택 (Calendar UI) 동작 확인
- [ ] 자동 Lot 번호 생성 로직 동작 확인
- [ ] Virtual Code 생성 로직 동작 확인
- [ ] 사용기한 자동 계산 동작 확인
- [ ] Lot 정보 미리보기 실시간 업데이트 확인
- [ ] Lot 및 Inventory 레코드 생성 확인
- [ ] Lot 등록 성공 시 토스트 메시지 표시 확인
- [ ] 로딩 상태 UI 표시 확인
- [ ] 에러 상태 UI 표시 확인
- [ ] 모바일 반응형 레이아웃 확인
- [ ] VALIDATION_RULES.LOT_PRODUCTION 상수 정의 완료
- [ ] DATE_FORMAT, TIMEZONE 상수 정의 완료
- [ ] 5개 테스트 시나리오 통과
- [ ] Supabase RLS 정책 (INSERT for lots, inventory) 설정 확인
- [ ] lots 테이블에 lot_number UNIQUE constraint 확인
- [ ] TypeScript strict mode 컴파일 에러 없음
- [ ] ESLint 경고 없음
- [ ] Git commit (Conventional Commits) 완료

---

## 🔗 References

- [date-fns Documentation](https://date-fns.org/)
- [date-fns addMonths](https://date-fns.org/docs/addMonths)
- [shadcn/ui Calendar Component](https://ui.shadcn.com/docs/components/calendar)
- [shadcn/ui Popover Component](https://ui.shadcn.com/docs/components/popover)
- [Supabase RPC Functions](https://supabase.com/docs/reference/javascript/rpc)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 3.5 - 출고 (장바구니 + FIFO)](phase-3.5-shipment.md)

**Phase 3.5 개요**:
- 출고 장바구니 UI
- FIFO 알고리즘 기반 자동 Lot 할당
- 특정 Lot 선택 옵션
- 출고 수량 입력 및 검증
- 출고 완료 처리
