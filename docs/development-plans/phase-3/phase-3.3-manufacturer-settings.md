# Phase 3.3: 제조사 설정 (Lot 정규식, 사용기한)

## 📋 Overview

**Phase 3.3**은 제조사별 Lot 번호 생성 규칙과 사용기한을 설정하는 기능을 구현합니다. Lot 접두사, 모델 자릿수, 일련번호 자릿수, 사용기한 개월 수를 설정하여 자동 Lot 번호 생성의 기반을 마련합니다.

### 주요 목표

1. **설정 조회 페이지**: 현재 설정 표시 및 수정 버튼
2. **설정 수정 폼**: Lot 번호 규칙 및 사용기한 설정
3. **실시간 미리보기**: 설정 변경 시 Lot 번호 형식 미리보기
4. **설정 검증**: Zod 스키마 기반 폼 검증
5. **설정 저장**: Upsert 패턴으로 설정 생성/수정

### 기술 스택

- **폼 관리**: React Hook Form + Zod
- **상태 관리**: TanStack Query (useQuery, useMutation)
- **UI 라이브러리**: shadcn/ui (Form, Input, Card, Alert)
- **라우팅**: React Router v6

### ⚠️ MVP 정책: 무제한 변경 허용

**주의**: MVP 단계에서는 제조사 설정을 **무제한으로 변경할 수 있습니다**.

- **이유**: 기능 테스트 및 검증을 위해 설정 변경 제한을 제거
- **실서비스 적용 시**: 초기 설정 후 잠금 기능 추가 필요
  - Lot 생산 이력이 있는 경우 설정 변경 불가
  - 또는 관리자 승인 후에만 변경 가능
- **현재 구현**: 언제든지 설정 수정 가능 (Edit 버튼 항상 활성화)

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

### src/constants/validation.ts
```typescript
export const VALIDATION_RULES = {
  MANUFACTURER_SETTINGS: {
    LOT_PREFIX_MIN_LENGTH: 1,
    LOT_PREFIX_MAX_LENGTH: 5,
    MODEL_DIGITS_MIN: 1,
    MODEL_DIGITS_MAX: 10,
    SEQUENCE_DIGITS_MIN: 1,
    SEQUENCE_DIGITS_MAX: 10,
    EXPIRY_MONTHS_MIN: 1,
    EXPIRY_MONTHS_MAX: 120,
  },
} as const
```

### src/constants/messages.ts
```typescript
export const SUCCESS_MESSAGES = {
  MANUFACTURER_SETTINGS: {
    CREATED: '제조사 설정이 등록되었습니다.',
    UPDATED: '제조사 설정이 수정되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  MANUFACTURER_SETTINGS: {
    CREATE_FAILED: '제조사 설정 등록에 실패했습니다.',
    UPDATE_FAILED: '제조사 설정 수정에 실패했습니다.',
    NOT_CONFIGURED: '제조사 설정이 완료되지 않았습니다.',
  },
} as const
```

---

## 📦 Work Content

### 1. ManufacturerSettingsPage 컴포넌트

**파일 경로**: `src/pages/manufacturer/ManufacturerSettingsPage.tsx`

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { VALIDATION_RULES } from '@/constants/validation'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import type { ManufacturerSettings } from '@/types/database'

const settingsSchema = z.object({
  lot_prefix: z
    .string()
    .min(1, 'Lot 접두사를 입력해주세요.')
    .max(
      VALIDATION_RULES.MANUFACTURER_SETTINGS.LOT_PREFIX_MAX_LENGTH,
      `Lot 접두사는 최대 ${VALIDATION_RULES.MANUFACTURER_SETTINGS.LOT_PREFIX_MAX_LENGTH}자까지 입력 가능합니다.`
    )
    .regex(
      VALIDATION_RULES.MANUFACTURER_SETTINGS.LOT_PREFIX_PATTERN,
      'Lot 접두사는 영문 대문자만 입력 가능합니다.'
    ),
  model_digits: z
    .number()
    .min(
      VALIDATION_RULES.MANUFACTURER_SETTINGS.MODEL_DIGITS_MIN,
      `모델 자릿수는 최소 ${VALIDATION_RULES.MANUFACTURER_SETTINGS.MODEL_DIGITS_MIN}자리여야 합니다.`
    )
    .max(
      VALIDATION_RULES.MANUFACTURER_SETTINGS.MODEL_DIGITS_MAX,
      `모델 자릿수는 최대 ${VALIDATION_RULES.MANUFACTURER_SETTINGS.MODEL_DIGITS_MAX}자리까지 설정 가능합니다.`
    ),
  sequence_digits: z
    .number()
    .min(
      VALIDATION_RULES.MANUFACTURER_SETTINGS.SEQUENCE_DIGITS_MIN,
      `일련번호 자릿수는 최소 ${VALIDATION_RULES.MANUFACTURER_SETTINGS.SEQUENCE_DIGITS_MIN}자리여야 합니다.`
    )
    .max(
      VALIDATION_RULES.MANUFACTURER_SETTINGS.SEQUENCE_DIGITS_MAX,
      `일련번호 자릿수는 최대 ${VALIDATION_RULES.MANUFACTURER_SETTINGS.SEQUENCE_DIGITS_MAX}자리까지 설정 가능합니다.`
    ),
  expiry_months: z
    .number()
    .min(
      VALIDATION_RULES.MANUFACTURER_SETTINGS.EXPIRY_MONTHS_MIN,
      `사용기한은 최소 ${VALIDATION_RULES.MANUFACTURER_SETTINGS.EXPIRY_MONTHS_MIN}개월이어야 합니다.`
    )
    .max(
      VALIDATION_RULES.MANUFACTURER_SETTINGS.EXPIRY_MONTHS_MAX,
      `사용기한은 최대 ${VALIDATION_RULES.MANUFACTURER_SETTINGS.EXPIRY_MONTHS_MAX}개월까지 설정 가능합니다.`
    ),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export function ManufacturerSettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)

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

  // Fetch manufacturer settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['manufacturerSettings', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manufacturer_settings')
        .select('*')
        .eq('organization_id', userData!.organization_id)
        .maybeSingle()

      if (error) throw error
      return data as ManufacturerSettings | null
    },
    enabled: !!userData?.organization_id,
  })

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: settings
      ? {
          lot_prefix: settings.lot_prefix,
          model_digits: settings.model_digits,
          sequence_digits: settings.sequence_digits,
          expiry_months: settings.expiry_months,
        }
      : {
          lot_prefix: '',
          model_digits: VALIDATION_RULES.MANUFACTURER_SETTINGS.MODEL_DIGITS_DEFAULT,
          sequence_digits: VALIDATION_RULES.MANUFACTURER_SETTINGS.SEQUENCE_DIGITS_DEFAULT,
          expiry_months: VALIDATION_RULES.MANUFACTURER_SETTINGS.EXPIRY_MONTHS_DEFAULT,
        },
  })

  // Watch form values for preview
  const watchedValues = form.watch()

  // Upsert settings mutation
  const upsertSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      const { data: upsertedSettings, error } = await supabase
        .from('manufacturer_settings')
        .upsert(
          {
            organization_id: userData!.organization_id,
            lot_prefix: data.lot_prefix,
            model_digits: data.model_digits,
            sequence_digits: data.sequence_digits,
            expiry_months: data.expiry_months,
          },
          {
            onConflict: 'organization_id',
          }
        )
        .select()
        .single()

      if (error) throw error
      return upsertedSettings as ManufacturerSettings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['manufacturerSettings', userData?.organization_id],
      })
      toast({
        title: SUCCESS_MESSAGES.MANUFACTURER_SETTINGS.SAVED,
      })
      setIsEditing(false)
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.MANUFACTURER_SETTINGS.SAVE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: SettingsFormData) => {
    upsertSettingsMutation.mutate(data)
  }

  // Generate Lot number preview
  const generateLotPreview = (values: SettingsFormData): string => {
    if (!values.lot_prefix) return '(미리보기)'

    const prefix = values.lot_prefix
    const model = '1'.repeat(values.model_digits)
    const sequence = '1'.repeat(values.sequence_digits)

    return `${prefix}${model}${sequence}`
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg text-gray-600">설정을 불러오는 중...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">
            {ERROR_MESSAGES.MANUFACTURER_SETTINGS.FETCH_FAILED}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">제조사 설정</h1>
          <p className="mt-1 text-sm text-gray-600">
            Lot 번호 생성 규칙 및 사용기한을 설정합니다
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            {settings ? '설정 수정' : '설정 등록'}
          </Button>
        )}
      </div>

      {/* No settings yet */}
      {!settings && !isEditing && (
        <Alert>
          <AlertTitle>설정이 등록되지 않았습니다</AlertTitle>
          <AlertDescription>
            Lot 번호 생성 규칙 및 사용기한을 설정해주세요. 설정이 완료되면 Lot 생산 등록이 가능합니다.
          </AlertDescription>
        </Alert>
      )}

      {/* View Mode */}
      {settings && !isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>현재 설정</CardTitle>
            <CardDescription>
              Lot 번호 생성 규칙 및 사용기한 설정값입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-gray-700">Lot 접두사</div>
                <div className="mt-1 font-mono text-lg">{settings.lot_prefix}</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700">모델 자릿수</div>
                <div className="mt-1 text-lg">{settings.model_digits}자리</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700">일련번호 자릿수</div>
                <div className="mt-1 text-lg">{settings.sequence_digits}자리</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-700">사용기한</div>
                <div className="mt-1 text-lg">{settings.expiry_months}개월</div>
              </div>
            </div>

            <div className="rounded-lg border bg-blue-50 p-4">
              <div className="text-sm font-semibold text-blue-900">Lot 번호 형식 예시</div>
              <div className="mt-2 font-mono text-xl font-bold text-blue-700">
                {generateLotPreview({
                  lot_prefix: settings.lot_prefix,
                  model_digits: settings.model_digits,
                  sequence_digits: settings.sequence_digits,
                  expiry_months: settings.expiry_months,
                })}
              </div>
              <div className="mt-2 text-xs text-blue-600">
                형식: {settings.lot_prefix}[모델 {settings.model_digits}자리][일련번호{' '}
                {settings.sequence_digits}자리]
              </div>
            </div>

            <div className="text-sm text-gray-600">
              최종 수정일:{' '}
              {new Date(settings.updated_at).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>{settings ? '설정 수정' : '설정 등록'}</CardTitle>
            <CardDescription>
              Lot 번호 생성 규칙 및 사용기한을 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Lot Prefix */}
                <FormField
                  control={form.control}
                  name="lot_prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lot 접두사 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="예: ABC"
                          maxLength={VALIDATION_RULES.MANUFACTURER_SETTINGS.LOT_PREFIX_MAX_LENGTH}
                          {...field}
                          onChange={(e) => {
                            // Convert to uppercase
                            const value = e.target.value.toUpperCase()
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        영문 대문자만 입력 가능 (최대{' '}
                        {VALIDATION_RULES.MANUFACTURER_SETTINGS.LOT_PREFIX_MAX_LENGTH}자)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Model Digits */}
                <FormField
                  control={form.control}
                  name="model_digits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>모델 자릿수 *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={VALIDATION_RULES.MANUFACTURER_SETTINGS.MODEL_DIGITS_MIN}
                          max={VALIDATION_RULES.MANUFACTURER_SETTINGS.MODEL_DIGITS_MAX}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Lot 번호에 포함될 모델 번호의 자릿수 (
                        {VALIDATION_RULES.MANUFACTURER_SETTINGS.MODEL_DIGITS_MIN}~
                        {VALIDATION_RULES.MANUFACTURER_SETTINGS.MODEL_DIGITS_MAX}자리)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Sequence Digits */}
                <FormField
                  control={form.control}
                  name="sequence_digits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>일련번호 자릿수 *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={VALIDATION_RULES.MANUFACTURER_SETTINGS.SEQUENCE_DIGITS_MIN}
                          max={VALIDATION_RULES.MANUFACTURER_SETTINGS.SEQUENCE_DIGITS_MAX}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Lot 번호에 포함될 일련번호의 자릿수 (
                        {VALIDATION_RULES.MANUFACTURER_SETTINGS.SEQUENCE_DIGITS_MIN}~
                        {VALIDATION_RULES.MANUFACTURER_SETTINGS.SEQUENCE_DIGITS_MAX}자리)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Expiry Months */}
                <FormField
                  control={form.control}
                  name="expiry_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>사용기한 (개월) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={VALIDATION_RULES.MANUFACTURER_SETTINGS.EXPIRY_MONTHS_MIN}
                          max={VALIDATION_RULES.MANUFACTURER_SETTINGS.EXPIRY_MONTHS_MAX}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        생산일로부터 사용기한까지의 개월 수 (
                        {VALIDATION_RULES.MANUFACTURER_SETTINGS.EXPIRY_MONTHS_MIN}~
                        {VALIDATION_RULES.MANUFACTURER_SETTINGS.EXPIRY_MONTHS_MAX}개월)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview */}
                <div className="rounded-lg border bg-blue-50 p-4">
                  <div className="text-sm font-semibold text-blue-900">
                    Lot 번호 형식 미리보기
                  </div>
                  <div className="mt-2 font-mono text-xl font-bold text-blue-700">
                    {generateLotPreview(watchedValues)}
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    형식: {watchedValues.lot_prefix || '(접두사)'}[모델{' '}
                    {watchedValues.model_digits}자리][일련번호 {watchedValues.sequence_digits}
                    자리]
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      form.reset()
                    }}
                  >
                    취소
                  </Button>
                  <Button type="submit" disabled={upsertSettingsMutation.isPending}>
                    {upsertSettingsMutation.isPending ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## 📝 TypeScript Type Definitions

**파일 경로**: `src/types/database.ts` (기존 파일에 추가)

```typescript
// ManufacturerSettings 타입은 Phase 1.2에서 이미 정의됨
export interface ManufacturerSettings {
  id: string
  organization_id: string
  lot_prefix: string
  model_digits: number
  sequence_digits: number
  expiry_months: number
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
  MANUFACTURER_SETTINGS: {
    LOT_PREFIX_MAX_LENGTH: 5,
    LOT_PREFIX_PATTERN: /^[A-Z]+$/,
    MODEL_DIGITS_MIN: 2,
    MODEL_DIGITS_MAX: 6,
    MODEL_DIGITS_DEFAULT: 3,
    SEQUENCE_DIGITS_MIN: 3,
    SEQUENCE_DIGITS_MAX: 8,
    SEQUENCE_DIGITS_DEFAULT: 5,
    EXPIRY_MONTHS_MIN: 1,
    EXPIRY_MONTHS_MAX: 120,
    EXPIRY_MONTHS_DEFAULT: 36,
  },
} as const
```

### 2. Messages

**파일 경로**: `src/constants/messages.ts` (기존 파일에 추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존 messages
  MANUFACTURER_SETTINGS: {
    SAVED: '설정이 저장되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존 messages
  MANUFACTURER_SETTINGS: {
    FETCH_FAILED: '설정을 불러올 수 없습니다.',
    SAVE_FAILED: '설정 저장에 실패했습니다.',
  },
} as const
```

---

## 📁 Files Created/Modified

### 신규 파일

1. **src/pages/manufacturer/ManufacturerSettingsPage.tsx** (~300 lines)
   - 설정 조회/수정 UI
   - Lot 번호 형식 미리보기
   - Upsert 패턴으로 설정 저장

### 수정 파일

1. **src/constants/validation.ts**
   - VALIDATION_RULES.MANUFACTURER_SETTINGS 추가

2. **src/constants/messages.ts**
   - SUCCESS_MESSAGES.MANUFACTURER_SETTINGS 추가
   - ERROR_MESSAGES.MANUFACTURER_SETTINGS 추가

3. **src/App.tsx** (React Router 설정)
   - ManufacturerSettingsPage 라우트 추가

```typescript
// src/App.tsx
import { ManufacturerSettingsPage } from '@/pages/manufacturer/ManufacturerSettingsPage'

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
        <Route path="settings" element={<ManufacturerSettingsPage />} />
        {/* Phase 3.4 이후 추가될 routes */}
      </Route>

      {/* ... 기타 routes */}
    </Routes>
  )
}
```

---

## ✅ Test Requirements

### ManufacturerSettingsPage 컴포넌트 테스트

**파일 경로**: `src/pages/manufacturer/__tests__/ManufacturerSettingsPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ManufacturerSettingsPage } from '../ManufacturerSettingsPage'
import { supabase } from '@/lib/supabase'
import { AuthContext } from '@/contexts/AuthContext'
import type { User } from '@supabase/supabase-js'
import type { ManufacturerSettings } from '@/types/database'

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

const mockSettings: ManufacturerSettings = {
  id: 'settings-1',
  organization_id: 'org-1',
  lot_prefix: 'ABC',
  model_digits: 3,
  sequence_digits: 5,
  expiry_months: 36,
  created_at: '2025-01-15T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
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

describe('ManufacturerSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('설정이 없을 때 안내 메시지를 표시해야 한다', async () => {
    const mockFrom = vi.fn()

    // User data query
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

    // Settings query (no settings)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ManufacturerSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('설정이 등록되지 않았습니다')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /설정 등록/ })).toBeInTheDocument()
  })

  it('기존 설정을 표시해야 한다', async () => {
    const mockFrom = vi.fn()

    // User data query
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

    // Settings query (existing settings)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ManufacturerSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('ABC')).toBeInTheDocument()
    })

    expect(screen.getByText('3자리')).toBeInTheDocument()
    expect(screen.getByText('5자리')).toBeInTheDocument()
    expect(screen.getByText('36개월')).toBeInTheDocument()
    expect(screen.getByText(/ABC11111/)).toBeInTheDocument() // Lot preview
  })

  it('설정 수정 버튼 클릭 시 수정 폼이 표시되어야 한다', async () => {
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
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ManufacturerSettingsPage />)

    await waitFor(() => {
      expect(screen.getByText('ABC')).toBeInTheDocument()
    })

    const editButton = screen.getByRole('button', { name: /설정 수정/ })
    await userEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/Lot 접두사/)).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/모델 자릿수/)).toBeInTheDocument()
    expect(screen.getByLabelText(/일련번호 자릿수/)).toBeInTheDocument()
    expect(screen.getByLabelText(/사용기한/)).toBeInTheDocument()
  })

  it('Lot 번호 미리보기가 실시간으로 업데이트되어야 한다', async () => {
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
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ManufacturerSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /설정 등록/ })).toBeInTheDocument()
    })

    const registerButton = screen.getByRole('button', { name: /설정 등록/ })
    await userEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/Lot 접두사/)).toBeInTheDocument()
    })

    // Type lot prefix
    const prefixInput = screen.getByLabelText(/Lot 접두사/)
    await userEvent.type(prefixInput, 'XYZ')

    // Check if preview updates
    await waitFor(() => {
      expect(screen.getByText(/XYZ11111111/)).toBeInTheDocument() // Default: 3 model + 5 sequence
    })
  })

  it('설정 저장이 성공해야 한다', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({
      data: {
        ...mockSettings,
        lot_prefix: 'XYZ',
      },
      error: null,
    })

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
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockUpsert,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ManufacturerSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /설정 등록/ })).toBeInTheDocument()
    })

    const registerButton = screen.getByRole('button', { name: /설정 등록/ })
    await userEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/Lot 접두사/)).toBeInTheDocument()
    })

    // Fill form
    await userEvent.type(screen.getByLabelText(/Lot 접두사/), 'XYZ')

    // Submit
    const submitButton = screen.getByRole('button', { name: /저장/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled()
    })
  })

  it('필수 필드 검증이 동작해야 한다', async () => {
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
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ManufacturerSettingsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /설정 등록/ })).toBeInTheDocument()
    })

    const registerButton = screen.getByRole('button', { name: /설정 등록/ })
    await userEvent.click(registerButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/Lot 접두사/)).toBeInTheDocument()
    })

    // Clear lot_prefix and submit
    const prefixInput = screen.getByLabelText(/Lot 접두사/)
    await userEvent.clear(prefixInput)

    const submitButton = screen.getByRole('button', { name: /저장/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Lot 접두사를 입력해주세요.')).toBeInTheDocument()
    })
  })
})
```

### 테스트 시나리오 요약

1. **설정 없을 때 안내 메시지**: 설정이 없을 때 안내 메시지와 "설정 등록" 버튼 표시 확인
2. **기존 설정 표시**: 기존 설정 값들이 올바르게 표시되는지 확인
3. **수정 폼 표시**: "설정 수정" 버튼 클릭 시 수정 폼이 표시되는지 확인
4. **실시간 미리보기**: Lot 접두사 입력 시 미리보기가 실시간으로 업데이트되는지 확인
5. **설정 저장 성공**: 모든 필드를 올바르게 입력하고 저장 성공 확인
6. **필수 필드 검증**: Lot 접두사를 비워두고 제출 시 검증 에러 표시 확인

---

## 🔍 Troubleshooting

### 1. 설정을 불러올 수 없음

**증상**:
```
설정을 불러올 수 없습니다.
```

**원인**:
- Supabase RLS 정책이 제대로 설정되지 않음
- `organization_id` 불일치

**해결**:

1. Supabase RLS 정책 확인:
```sql
-- manufacturer_settings 테이블 SELECT 정책
CREATE POLICY "Users can view their organization settings"
ON manufacturer_settings FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
```

2. Query 확인:
```typescript
const { data, error } = await supabase
  .from('manufacturer_settings')
  .select('*')
  .eq('organization_id', userData!.organization_id)
  .maybeSingle() // single() 대신 maybeSingle() 사용 (없으면 null 반환)

if (error) {
  console.error('Settings fetch error:', error)
  throw error
}
```

---

### 2. Upsert가 동작하지 않음

**증상**:
- 설정 저장 시 중복 에러 발생

**원인**:
- `onConflict` 옵션 누락
- Unique constraint 설정 오류

**해결**:

1. Upsert 옵션 확인:
```typescript
const { data, error } = await supabase
  .from('manufacturer_settings')
  .upsert(
    {
      organization_id: userData!.organization_id,
      lot_prefix: data.lot_prefix,
      model_digits: data.model_digits,
      sequence_digits: data.sequence_digits,
      expiry_months: data.expiry_months,
    },
    {
      onConflict: 'organization_id', // 필수! organization_id가 unique constraint
    }
  )
  .select()
  .single()
```

2. Database Unique Constraint 확인:
```sql
-- manufacturer_settings 테이블에 unique constraint 있는지 확인
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'manufacturer_settings'
  AND constraint_type = 'UNIQUE';

-- 없으면 추가
ALTER TABLE manufacturer_settings
ADD CONSTRAINT manufacturer_settings_organization_id_key
UNIQUE (organization_id);
```

---

### 3. Lot 접두사가 소문자로 입력됨

**증상**:
- 사용자가 소문자 입력해도 자동으로 대문자로 변환되지 않음

**원인**:
- `onChange` 핸들러에서 대문자 변환 누락

**해결**:

1. Input의 onChange 핸들러 수정:
```typescript
<Input
  placeholder="예: ABC"
  {...field}
  onChange={(e) => {
    const value = e.target.value.toUpperCase() // 대문자 변환!
    field.onChange(value)
  }}
/>
```

2. Zod 스키마에도 transform 추가 (선택사항):
```typescript
lot_prefix: z
  .string()
  .min(1)
  .max(5)
  .regex(/^[A-Z]+$/)
  .transform((val) => val.toUpperCase()), // Transform to uppercase
```

---

### 4. 미리보기가 업데이트되지 않음

**증상**:
- Lot 접두사 입력해도 미리보기가 변경되지 않음

**원인**:
- `form.watch()` 누락
- 미리보기 컴포넌트가 watchedValues를 사용하지 않음

**해결**:

1. `form.watch()` 사용:
```typescript
const watchedValues = form.watch() // 모든 필드 watch

// 또는 특정 필드만 watch
const lotPrefix = form.watch('lot_prefix')
const modelDigits = form.watch('model_digits')
```

2. 미리보기 함수에 watchedValues 전달:
```typescript
<div className="mt-2 font-mono text-xl font-bold text-blue-700">
  {generateLotPreview(watchedValues)} {/* watchedValues 사용! */}
</div>
```

---

### 5. 수정 후 View 모드로 돌아가지 않음

**증상**:
- 설정 저장 성공했지만 여전히 Edit 모드

**원인**:
- `setIsEditing(false)` 누락

**해결**:

1. mutation `onSuccess` 콜백 확인:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: ['manufacturerSettings', userData?.organization_id],
  })
  toast({
    title: SUCCESS_MESSAGES.MANUFACTURER_SETTINGS.SAVED,
  })
  setIsEditing(false) // 필수!
},
```

---

## 🔄 Git Commit Message

```bash
feat(manufacturer): add manufacturer settings page

- Implement ManufacturerSettingsPage with view/edit modes
- Add Lot number generation rule settings (prefix, model/sequence digits)
- Add expiry months setting
- Add real-time Lot number format preview
- Implement upsert pattern for settings create/update
- Create manufacturer settings validation rules

Features:
- View mode: Display current settings with Lot format example
- Edit mode: Form with real-time preview
- Lot prefix: Uppercase alphabets only (max 5 chars)
- Model digits: 2-6 digits
- Sequence digits: 3-8 digits
- Expiry months: 1-120 months
- Upsert pattern for seamless create/update

Test scenarios:
- Display no-settings alert when settings not exist
- Display existing settings correctly
- Show edit form when edit button clicked
- Update Lot preview in real-time
- Save settings successfully
- Validate required fields

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] ManufacturerSettingsPage 컴포넌트 구현 완료
- [ ] View/Edit 모드 전환 기능 동작 확인
- [ ] 설정이 없을 때 안내 메시지 표시 확인
- [ ] 기존 설정 조회 및 표시 확인
- [ ] Lot 접두사 대문자 자동 변환 동작 확인
- [ ] 모델 자릿수, 일련번호 자릿수, 사용기한 입력 확인
- [ ] Lot 번호 형식 미리보기 실시간 업데이트 확인
- [ ] 설정 저장 (Upsert) 성공 확인
- [ ] 폼 검증 (Zod 스키마) 동작 확인
- [ ] 저장 후 View 모드로 전환 확인
- [ ] 로딩 상태 UI 표시 확인
- [ ] 에러 상태 UI 표시 확인
- [ ] 모바일 반응형 레이아웃 확인
- [ ] VALIDATION_RULES.MANUFACTURER_SETTINGS 상수 정의 완료
- [ ] SUCCESS_MESSAGES.MANUFACTURER_SETTINGS, ERROR_MESSAGES.MANUFACTURER_SETTINGS 정의 완료
- [ ] 6개 테스트 시나리오 통과
- [ ] Supabase RLS 정책 (SELECT, INSERT, UPDATE) 설정 확인
- [ ] manufacturer_settings 테이블에 organization_id UNIQUE constraint 확인
- [ ] TypeScript strict mode 컴파일 에러 없음
- [ ] ESLint 경고 없음
- [ ] Git commit (Conventional Commits) 완료

---

## 🔗 References

- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [shadcn/ui Card Component](https://ui.shadcn.com/docs/components/card)
- [shadcn/ui Alert Component](https://ui.shadcn.com/docs/components/alert)
- [Supabase Upsert Documentation](https://supabase.com/docs/reference/javascript/upsert)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 3.4 - Lot 생산 등록](phase-3.4-lot-production.md)

**Phase 3.4 개요**:
- Lot 생산 등록 폼
- 자동 Lot 번호 생성 로직
- Virtual code 생성
- 생산일, 사용기한 자동 계산
- 생산 수량 입력
