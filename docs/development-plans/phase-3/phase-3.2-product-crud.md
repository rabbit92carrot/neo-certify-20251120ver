# Phase 3.2: 제품 CRUD (등록/수정/비활성화)

## 📋 Overview

**Phase 3.2**는 제품의 생성(Create), 조회(Read), 수정(Update), 비활성화(Soft Delete) 기능을 구현합니다. 제품 등록 폼, 제품 상세 페이지, 제품 수정 폼을 포함하며, UDI-DI 중복 검증 및 Zod 스키마 기반 폼 검증을 구현합니다.

### 주요 목표

1. **제품 등록 폼**: React Hook Form + Zod로 제품 정보 입력 및 검증
2. **UDI-DI 중복 검증**: 실시간 중복 체크 기능
3. **제품 상세 페이지**: 제품 정보 조회 및 수정/비활성화 액션
4. **제품 수정 폼**: 기존 제품 정보 수정
5. **제품 비활성화**: Soft delete (status = 'inactive')

### 기술 스택

- **폼 관리**: React Hook Form + Zod
- **상태 관리**: TanStack Query (useQuery, useMutation)
- **UI 라이브러리**: shadcn/ui (Form, Input, Textarea, Button, Badge)
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

## 📦 Work Content

### 1. ProductCreatePage 컴포넌트

**파일 경로**: `src/pages/manufacturer/ProductCreatePage.tsx`

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { VALIDATION_RULES } from '@/constants/validation'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { ROUTES } from '@/constants/routes'
import { PRODUCT_STATUS } from '@/constants/status'
import type { Product } from '@/types/database'

const productSchema = z.object({
  name: z
    .string()
    .min(1, '제품명을 입력해주세요.')
    .max(
      VALIDATION_RULES.PRODUCT.NAME_MAX_LENGTH,
      `제품명은 최대 ${VALIDATION_RULES.PRODUCT.NAME_MAX_LENGTH}자까지 입력 가능합니다.`
    ),
  udi_di: z
    .string()
    .min(1, 'UDI-DI를 입력해주세요.')
    .regex(
      VALIDATION_RULES.PRODUCT.UDI_DI_PATTERN,
      'UDI-DI는 14자리 숫자여야 합니다.'
    ),
  model_name: z
    .string()
    .min(1, '모델명을 입력해주세요.')
    .max(
      VALIDATION_RULES.PRODUCT.MODEL_NAME_MAX_LENGTH,
      `모델명은 최대 ${VALIDATION_RULES.PRODUCT.MODEL_NAME_MAX_LENGTH}자까지 입력 가능합니다.`
    ),
  description: z
    .string()
    .max(
      VALIDATION_RULES.PRODUCT.DESCRIPTION_MAX_LENGTH,
      `제품 설명은 최대 ${VALIDATION_RULES.PRODUCT.DESCRIPTION_MAX_LENGTH}자까지 입력 가능합니다.`
    )
    .optional(),
})

type ProductFormData = z.infer<typeof productSchema>

export function ProductCreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

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

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      udi_di: '',
      model_name: '',
      description: '',
    },
  })

  // Check UDI-DI duplicate
  const checkUdiDiDuplicate = async (udiDi: string): Promise<boolean> => {
    setIsCheckingDuplicate(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('udi_di', udiDi)
        .eq('organization_id', userData?.organization_id)
        .maybeSingle()

      if (error) throw error
      return !!data // true if duplicate exists
    } catch (error) {
      console.error('UDI-DI 중복 체크 에러:', error)
      return false
    } finally {
      setIsCheckingDuplicate(false)
    }
  }

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      // Check duplicate before creating
      const isDuplicate = await checkUdiDiDuplicate(data.udi_di)
      if (isDuplicate) {
        throw new Error(ERROR_MESSAGES.PRODUCT.UDI_DI_DUPLICATE)
      }

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert({
          organization_id: userData!.organization_id,
          name: data.name,
          udi_di: data.udi_di,
          model_name: data.model_name,
          description: data.description ?? null,
          status: PRODUCT_STATUS.ACTIVE,
        })
        .select()
        .single()

      if (error) throw error
      return newProduct as Product
    },
    onSuccess: (product) => {
      toast({
        title: SUCCESS_MESSAGES.PRODUCT.CREATED,
      })
      navigate(`${ROUTES.MANUFACTURER.PRODUCTS}/${product.id}`)
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.PRODUCT.CREATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: ProductFormData) => {
    createProductMutation.mutate(data)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">제품 등록</h1>
        <p className="mt-1 text-sm text-gray-600">
          새로운 제품 정보를 등록합니다
        </p>
      </div>

      {/* Form */}
      <div className="rounded-lg border bg-white p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제품명 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: 의료용 실"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    제품의 공식 명칭을 입력해주세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* UDI-DI */}
            <FormField
              control={form.control}
              name="udi_di"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UDI-DI (제품 고유 식별자) *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: 01234567890123"
                      maxLength={VALIDATION_RULES.PRODUCT.UDI_DI_LENGTH}
                      {...field}
                      onBlur={async (e) => {
                        field.onBlur()
                        const value = e.target.value
                        if (value.length === VALIDATION_RULES.PRODUCT.UDI_DI_LENGTH) {
                          const isDuplicate = await checkUdiDiDuplicate(value)
                          if (isDuplicate) {
                            form.setError('udi_di', {
                              message: ERROR_MESSAGES.PRODUCT.UDI_DI_DUPLICATE,
                            })
                          }
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    GS1 표준 14자리 숫자 (GTIN)
                    {isCheckingDuplicate && (
                      <span className="ml-2 text-blue-600">
                        중복 확인 중...
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Model Name */}
            <FormField
              control={form.control}
              name="model_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>모델명 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: MODEL-A-2025"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    제품의 모델 번호 또는 코드를 입력해주세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제품 설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="제품에 대한 추가 설명을 입력해주세요 (선택사항)"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    제품의 용도, 특징 등을 자유롭게 입력하세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.MANUFACTURER.PRODUCTS)}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createProductMutation.isPending || isCheckingDuplicate}
              >
                {createProductMutation.isPending ? '등록 중...' : '제품 등록'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
```

---

### 2. ProductDetailPage 컴포넌트

**파일 경로**: `src/pages/manufacturer/ProductDetailPage.tsx`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  PRODUCT_STATUS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_COLORS,
} from '@/constants/status'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { ROUTES } from '@/constants/routes'
import type { Product, Organization } from '@/types/database'

interface ProductWithOrganization extends Product {
  organization: Organization
}

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch product detail
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, organization:organizations(*)')
        .eq('id', productId!)
        .single()

      if (error) throw error
      return data as ProductWithOrganization
    },
    enabled: !!productId,
  })

  // Deactivate product mutation
  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('products')
        .update({ status: PRODUCT_STATUS.INACTIVE })
        .eq('id', productId!)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({
        title: SUCCESS_MESSAGES.PRODUCT.DEACTIVATED,
      })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.PRODUCT.DEACTIVATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  // Activate product mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('products')
        .update({ status: PRODUCT_STATUS.ACTIVE })
        .eq('id', productId!)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({
        title: SUCCESS_MESSAGES.PRODUCT.ACTIVATED,
      })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.PRODUCT.ACTIVATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg text-gray-600">제품 정보를 불러오는 중...</div>
      </div>
    )
  }

  // Error state
  if (error || !product) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">
            {ERROR_MESSAGES.PRODUCT.FETCH_FAILED}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED}
          </div>
          <Button
            className="mt-4"
            onClick={() => navigate(ROUTES.MANUFACTURER.PRODUCTS)}
          >
            제품 목록으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <Badge
              className={cn(
                PRODUCT_STATUS_COLORS[product.status as keyof typeof PRODUCT_STATUS]
              )}
            >
              {PRODUCT_STATUS_LABELS[product.status as keyof typeof PRODUCT_STATUS]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">제품 상세 정보</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.MANUFACTURER.PRODUCTS)}
          >
            목록
          </Button>
          <Button
            onClick={() =>
              navigate(`${ROUTES.MANUFACTURER.PRODUCTS}/${productId}/edit`)
            }
          >
            수정
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="rounded-lg border bg-white">
        <div className="divide-y">
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="font-semibold text-gray-700">제품명</div>
            <div className="md:col-span-2">{product.name}</div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="font-semibold text-gray-700">UDI-DI</div>
            <div className="font-mono md:col-span-2">{product.udi_di}</div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="font-semibold text-gray-700">모델명</div>
            <div className="md:col-span-2">{product.model_name}</div>
          </div>

          {product.description && (
            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
              <div className="font-semibold text-gray-700">제품 설명</div>
              <div className="whitespace-pre-wrap md:col-span-2">
                {product.description}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="font-semibold text-gray-700">상태</div>
            <div className="md:col-span-2">
              <Badge
                className={cn(
                  PRODUCT_STATUS_COLORS[product.status as keyof typeof PRODUCT_STATUS]
                )}
              >
                {PRODUCT_STATUS_LABELS[product.status as keyof typeof PRODUCT_STATUS]}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="font-semibold text-gray-700">등록일</div>
            <div className="md:col-span-2">
              {new Date(product.created_at).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="font-semibold text-gray-700">최종 수정일</div>
            <div className="md:col-span-2">
              {new Date(product.updated_at).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 rounded-lg border bg-gray-50 p-4">
        {product.status === PRODUCT_STATUS.ACTIVE ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">제품 비활성화</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>제품을 비활성화하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  비활성화된 제품은 새로운 Lot 생산 및 출고가 불가능합니다.
                  기존에 생산된 Lot은 영향을 받지 않습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deactivateMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  비활성화
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default">제품 활성화</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>제품을 활성화하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  활성화된 제품은 Lot 생산 및 출고가 가능합니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={() => activateMutation.mutate()}>
                  활성화
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
```

---

### 3. ProductEditPage 컴포넌트

**파일 경로**: `src/pages/manufacturer/ProductEditPage.tsx`

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { VALIDATION_RULES } from '@/constants/validation'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { ROUTES } from '@/constants/routes'
import type { Product } from '@/types/database'

const productEditSchema = z.object({
  name: z
    .string()
    .min(1, '제품명을 입력해주세요.')
    .max(
      VALIDATION_RULES.PRODUCT.NAME_MAX_LENGTH,
      `제품명은 최대 ${VALIDATION_RULES.PRODUCT.NAME_MAX_LENGTH}자까지 입력 가능합니다.`
    ),
  // UDI-DI는 수정 불가 (고유 식별자)
  model_name: z
    .string()
    .min(1, '모델명을 입력해주세요.')
    .max(
      VALIDATION_RULES.PRODUCT.MODEL_NAME_MAX_LENGTH,
      `모델명은 최대 ${VALIDATION_RULES.PRODUCT.MODEL_NAME_MAX_LENGTH}자까지 입력 가능합니다.`
    ),
  description: z
    .string()
    .max(
      VALIDATION_RULES.PRODUCT.DESCRIPTION_MAX_LENGTH,
      `제품 설명은 최대 ${VALIDATION_RULES.PRODUCT.DESCRIPTION_MAX_LENGTH}자까지 입력 가능합니다.`
    )
    .optional(),
})

type ProductEditFormData = z.infer<typeof productEditSchema>

export function ProductEditPage() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch product detail
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId!)
        .single()

      if (error) throw error
      return data as Product
    },
    enabled: !!productId,
  })

  const form = useForm<ProductEditFormData>({
    resolver: zodResolver(productEditSchema),
    values: product
      ? {
          name: product.name,
          model_name: product.model_name,
          description: product.description ?? '',
        }
      : undefined,
  })

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductEditFormData) => {
      const { data: updatedProduct, error } = await supabase
        .from('products')
        .update({
          name: data.name,
          model_name: data.model_name,
          description: data.description ?? null,
        })
        .eq('id', productId!)
        .select()
        .single()

      if (error) throw error
      return updatedProduct as Product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({
        title: SUCCESS_MESSAGES.PRODUCT.UPDATED,
      })
      navigate(`${ROUTES.MANUFACTURER.PRODUCTS}/${productId}`)
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.PRODUCT.UPDATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: ProductEditFormData) => {
    updateProductMutation.mutate(data)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg text-gray-600">제품 정보를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">제품 수정</h1>
        <p className="mt-1 text-sm text-gray-600">
          제품 정보를 수정합니다 (UDI-DI는 수정할 수 없습니다)
        </p>
      </div>

      {/* Form */}
      <div className="rounded-lg border bg-white p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* UDI-DI (Read-only) */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                UDI-DI (수정 불가)
              </label>
              <Input
                value={product?.udi_di ?? ''}
                disabled
                className="mt-1.5 bg-gray-50"
              />
              <p className="mt-1.5 text-sm text-gray-600">
                제품 고유 식별자는 수정할 수 없습니다
              </p>
            </div>

            {/* Product Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제품명 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 의료용 실" {...field} />
                  </FormControl>
                  <FormDescription>
                    제품의 공식 명칭을 입력해주세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Model Name */}
            <FormField
              control={form.control}
              name="model_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>모델명 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: MODEL-A-2025" {...field} />
                  </FormControl>
                  <FormDescription>
                    제품의 모델 번호 또는 코드를 입력해주세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제품 설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="제품에 대한 추가 설명을 입력해주세요 (선택사항)"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    제품의 용도, 특징 등을 자유롭게 입력하세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`${ROUTES.MANUFACTURER.PRODUCTS}/${productId}`)}
              >
                취소
              </Button>
              <Button type="submit" disabled={updateProductMutation.isPending}>
                {updateProductMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
```

---

## 📝 TypeScript Type Definitions

타입은 Phase 1.2 및 Phase 3.1에서 이미 정의되었습니다.

```typescript
// src/types/database.ts (기존)
export interface Product {
  id: string
  organization_id: string
  name: string
  udi_di: string
  model_name: string
  description: string | null
  status: 'active' | 'inactive'
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
  PRODUCT: {
    NAME_MAX_LENGTH: 100,
    UDI_DI_LENGTH: 14,
    UDI_DI_PATTERN: /^\d{14}$/,
    MODEL_NAME_MAX_LENGTH: 50,
    DESCRIPTION_MAX_LENGTH: 500,
  },
} as const
```

### 2. Messages

**파일 경로**: `src/constants/messages.ts` (기존 파일에 추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존 messages
  PRODUCT: {
    CREATED: '제품이 등록되었습니다.',
    UPDATED: '제품 정보가 수정되었습니다.',
    STATUS_UPDATED: '제품 상태가 변경되었습니다.',
    ACTIVATED: '제품이 활성화되었습니다.',
    DEACTIVATED: '제품이 비활성화되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존 messages
  PRODUCT: {
    FETCH_FAILED: '제품 정보를 불러올 수 없습니다.',
    CREATE_FAILED: '제품 등록에 실패했습니다.',
    UPDATE_FAILED: '제품 수정에 실패했습니다.',
    ACTIVATE_FAILED: '제품 활성화에 실패했습니다.',
    DEACTIVATE_FAILED: '제품 비활성화에 실패했습니다.',
    UDI_DI_DUPLICATE: '이미 등록된 UDI-DI입니다.',
  },
} as const
```

---

## 📁 Files Created/Modified

### 신규 파일

1. **src/pages/manufacturer/ProductCreatePage.tsx** (~180 lines)
   - 제품 등록 폼
   - UDI-DI 중복 검증
   - Zod 스키마 기반 폼 검증

2. **src/pages/manufacturer/ProductDetailPage.tsx** (~200 lines)
   - 제품 상세 정보 표시
   - 제품 활성화/비활성화 기능
   - AlertDialog 확인 UI

3. **src/pages/manufacturer/ProductEditPage.tsx** (~160 lines)
   - 제품 수정 폼
   - UDI-DI 읽기 전용 처리
   - Zod 스키마 기반 폼 검증

### 수정 파일

1. **src/constants/validation.ts**
   - VALIDATION_RULES.PRODUCT 추가

2. **src/constants/messages.ts**
   - SUCCESS_MESSAGES.PRODUCT 확장
   - ERROR_MESSAGES.PRODUCT 확장

3. **src/App.tsx** (React Router 설정)
   - ProductCreatePage, ProductDetailPage, ProductEditPage 라우트 추가

```typescript
// src/App.tsx
import { ProductCreatePage } from '@/pages/manufacturer/ProductCreatePage'
import { ProductDetailPage } from '@/pages/manufacturer/ProductDetailPage'
import { ProductEditPage } from '@/pages/manufacturer/ProductEditPage'

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
        {/* Phase 3.3 이후 추가될 routes */}
      </Route>

      {/* ... 기타 routes */}
    </Routes>
  )
}
```

---

## ✅ Test Requirements

### ProductCreatePage 컴포넌트 테스트

**파일 경로**: `src/pages/manufacturer/__tests__/ProductCreatePage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ProductCreatePage } from '../ProductCreatePage'
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

describe('ProductCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock user data query
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)
  })

  it('제품 등록 폼을 렌더링해야 한다', async () => {
    renderWithProviders(<ProductCreatePage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/제품명/)).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/UDI-DI/)).toBeInTheDocument()
    expect(screen.getByLabelText(/모델명/)).toBeInTheDocument()
    expect(screen.getByLabelText(/제품 설명/)).toBeInTheDocument()
  })

  it('필수 필드 검증이 동작해야 한다', async () => {
    renderWithProviders(<ProductCreatePage />)

    await waitFor(() => {
      expect(screen.getByText('제품 등록')).toBeInTheDocument()
    })

    // Submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /제품 등록/ })
    await userEvent.click(submitButton)

    // Check validation errors
    await waitFor(() => {
      expect(screen.getByText('제품명을 입력해주세요.')).toBeInTheDocument()
      expect(screen.getByText('UDI-DI를 입력해주세요.')).toBeInTheDocument()
      expect(screen.getByText('모델명을 입력해주세요.')).toBeInTheDocument()
    })
  })

  it('UDI-DI 형식 검증이 동작해야 한다', async () => {
    renderWithProviders(<ProductCreatePage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/UDI-DI/)).toBeInTheDocument()
    })

    const udiInput = screen.getByLabelText(/UDI-DI/)
    await userEvent.type(udiInput, '123') // Invalid: too short

    const submitButton = screen.getByRole('button', { name: /제품 등록/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('UDI-DI는 14자리 숫자여야 합니다.')).toBeInTheDocument()
    })
  })

  it('UDI-DI 중복 검사가 동작해야 한다', async () => {
    const mockFrom = vi.fn()

    // First call: get user organization
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

    // Second call: check UDI-DI duplicate (found)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'existing-product-id' },
              error: null,
            }),
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductCreatePage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/UDI-DI/)).toBeInTheDocument()
    })

    const udiInput = screen.getByLabelText(/UDI-DI/)
    await userEvent.type(udiInput, '01234567890123')
    await userEvent.tab() // Trigger onBlur

    await waitFor(() => {
      expect(screen.getByText('이미 등록된 UDI-DI입니다.')).toBeInTheDocument()
    })
  })

  it('제품 등록이 성공해야 한다', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: {
        id: 'new-product-id',
        organization_id: 'org-1',
        name: '의료용 실',
        udi_di: '01234567890123',
        model_name: 'MODEL-A',
        description: null,
        status: 'active',
        created_at: '2025-01-20T00:00:00Z',
        updated_at: '2025-01-20T00:00:00Z',
      },
      error: null,
    })

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

    // UDI-DI duplicate check (not found)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    })

    // Insert product
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockInsert,
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductCreatePage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/제품명/)).toBeInTheDocument()
    })

    // Fill form
    await userEvent.type(screen.getByLabelText(/제품명/), '의료용 실')
    await userEvent.type(screen.getByLabelText(/UDI-DI/), '01234567890123')
    await userEvent.type(screen.getByLabelText(/모델명/), 'MODEL-A')

    // Submit
    const submitButton = screen.getByRole('button', { name: /제품 등록/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled()
    })
  })
})
```

### ProductDetailPage 컴포넌트 테스트

**파일 경로**: `src/pages/manufacturer/__tests__/ProductDetailPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProductDetailPage } from '../ProductDetailPage'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

const mockProduct = {
  id: 'product-1',
  organization_id: 'org-1',
  name: '의료용 실',
  udi_di: '01234567890123',
  model_name: 'MODEL-A',
  description: '고품질 의료용 실입니다.',
  status: 'active',
  created_at: '2025-01-15T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
  organization: {
    id: 'org-1',
    type: 'manufacturer',
    name: '제조사 A',
    business_number: '123-45-67890',
    business_license_url: null,
    status: 'approved',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
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
        <Routes>
          <Route path="/manufacturer/products/:productId" element={ui} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>,
    {
      wrapper: ({ children }) => children,
    }
  )
}

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock navigation
    window.history.pushState({}, '', '/manufacturer/products/product-1')
  })

  it('제품 상세 정보를 렌더링해야 한다', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProduct,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    expect(screen.getByText('01234567890123')).toBeInTheDocument()
    expect(screen.getByText('MODEL-A')).toBeInTheDocument()
    expect(screen.getByText('고품질 의료용 실입니다.')).toBeInTheDocument()
  })

  it('제품 비활성화 버튼을 클릭하면 AlertDialog가 표시되어야 한다', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProduct,
            error: null,
          }),
        }),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    const deactivateButton = screen.getByRole('button', { name: /제품 비활성화/ })
    await userEvent.click(deactivateButton)

    await waitFor(() => {
      expect(screen.getByText('제품을 비활성화하시겠습니까?')).toBeInTheDocument()
    })
  })

  it('제품 비활성화가 성공해야 한다', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })

    const mockFrom = vi.fn()

    // Fetch product detail
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProduct,
            error: null,
          }),
        }),
      }),
    })

    // Update product status
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(mockUpdate()),
      }),
    })

    vi.mocked(supabase.from).mockImplementation(mockFrom)

    renderWithProviders(<ProductDetailPage />)

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    const deactivateButton = screen.getByRole('button', { name: /제품 비활성화/ })
    await userEvent.click(deactivateButton)

    await waitFor(() => {
      expect(screen.getByText('제품을 비활성화하시겠습니까?')).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: /비활성화$/ })
    await userEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled()
    })
  })
})
```

### 테스트 시나리오 요약

**ProductCreatePage**:
1. **폼 렌더링**: 제품 등록 폼의 모든 필드가 렌더링되는지 확인
2. **필수 필드 검증**: 필수 필드를 비워두고 제출 시 검증 에러 표시 확인
3. **UDI-DI 형식 검증**: 14자리 숫자가 아닌 경우 검증 에러 표시 확인
4. **UDI-DI 중복 검사**: onBlur 시 중복 검사가 동작하고 에러 표시 확인
5. **제품 등록 성공**: 모든 필드를 올바르게 입력하고 등록 성공 확인

**ProductDetailPage**:
1. **상세 정보 렌더링**: 제품 상세 정보가 올바르게 표시되는지 확인
2. **비활성화 AlertDialog**: 비활성화 버튼 클릭 시 확인 다이얼로그 표시 확인
3. **비활성화 성공**: 확인 버튼 클릭 시 mutation 호출 확인

---

## 🔍 Troubleshooting

### 1. UDI-DI 중복 검사가 동작하지 않음

**증상**:
- 중복된 UDI-DI 입력해도 에러 표시되지 않음

**원인**:
- `onBlur` 이벤트가 트리거되지 않음
- Supabase 쿼리 오류

**해결**:

1. `onBlur` 핸들러 확인:
```typescript
<Input
  {...field}
  onBlur={async (e) => {
    field.onBlur() // React Hook Form의 onBlur도 호출해야 함!
    const value = e.target.value
    if (value.length === VALIDATION_RULES.PRODUCT.UDI_DI_LENGTH) {
      const isDuplicate = await checkUdiDiDuplicate(value)
      if (isDuplicate) {
        form.setError('udi_di', {
          message: ERROR_MESSAGES.PRODUCT.UDI_DI_DUPLICATE,
        })
      }
    }
  }}
/>
```

2. Supabase 쿼리 확인:
```typescript
const { data, error } = await supabase
  .from('products')
  .select('id')
  .eq('udi_di', udiDi)
  .eq('organization_id', userData?.organization_id) // 같은 조직 내에서만 중복 체크
  .maybeSingle() // single() 대신 maybeSingle() 사용 (없으면 null 반환)

console.log('Duplicate check result:', data)
```

---

### 2. 제품 등록 후 상세 페이지로 이동하지 않음

**증상**:
- 제품 등록 성공했지만 페이지 이동 안 됨

**원인**:
- navigate 호출 누락
- 잘못된 경로

**해결**:

1. mutation `onSuccess` 콜백 확인:
```typescript
onSuccess: (product) => {
  toast({
    title: SUCCESS_MESSAGES.PRODUCT.CREATED,
  })
  navigate(`${ROUTES.MANUFACTURER.PRODUCTS}/${product.id}`) // product.id 사용!
},
```

2. ROUTES 상수 확인:
```typescript
// src/constants/routes.ts
export const ROUTES = {
  MANUFACTURER: {
    PRODUCTS: '/manufacturer/products', // 끝에 슬래시 없음
    // ...
  },
} as const
```

---

### 3. 제품 수정 시 기존 값이 폼에 표시되지 않음

**증상**:
- ProductEditPage 로드 시 폼이 비어 있음

**원인**:
- useForm의 `defaultValues` 사용 (동적 값에는 `values` 사용해야 함)

**해결**:

1. `values` prop 사용:
```typescript
const form = useForm<ProductEditFormData>({
  resolver: zodResolver(productEditSchema),
  values: product  // defaultValues가 아닌 values 사용!
    ? {
        name: product.name,
        model_name: product.model_name,
        description: product.description ?? '',
      }
    : undefined,
})
```

2. 로딩 상태 확인:
```typescript
if (isLoading) {
  return <div>제품 정보를 불러오는 중...</div>
}

// product가 로드된 후에만 폼 렌더링
return (
  <Form {...form}>
    {/* ... */}
  </Form>
)
```

---

### 4. 제품 비활성화 후 AlertDialog가 닫히지 않음

**증상**:
- 비활성화 성공했지만 다이얼로그가 계속 열려 있음

**원인**:
- shadcn/ui AlertDialog는 자동으로 닫히지만, 쿼리 invalidation으로 인해 리렌더링되면서 문제 발생

**해결**:

1. AlertDialog 컴포넌트 패턴 확인:
```typescript
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">제품 비활성화</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    {/* ... */}
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => deactivateMutation.mutate()}
        className="bg-red-600 hover:bg-red-700"
      >
        비활성화
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

AlertDialogAction을 클릭하면 자동으로 다이얼로그가 닫힙니다. 추가 제어가 필요 없습니다.

---

### 5. UDI-DI 수정이 가능함

**증상**:
- ProductEditPage에서 UDI-DI를 수정할 수 있음

**원인**:
- Input의 `disabled` prop 누락

**해결**:

1. UDI-DI 필드를 읽기 전용으로 설정:
```typescript
<div>
  <label className="text-sm font-medium text-gray-700">
    UDI-DI (수정 불가)
  </label>
  <Input
    value={product?.udi_di ?? ''}
    disabled // 필수!
    className="mt-1.5 bg-gray-50"
  />
  <p className="mt-1.5 text-sm text-gray-600">
    제품 고유 식별자는 수정할 수 없습니다
  </p>
</div>
```

2. productEditSchema에서 udi_di 제외:
```typescript
const productEditSchema = z.object({
  name: z.string().min(1),
  // udi_di: 제외됨! (수정 불가)
  model_name: z.string().min(1),
  description: z.string().optional(),
})
```

---

## 🔄 Git Commit Message

```bash
feat(manufacturer): add product CRUD operations

- Implement ProductCreatePage with UDI-DI duplicate check
- Implement ProductDetailPage with activate/deactivate actions
- Implement ProductEditPage with read-only UDI-DI
- Add product validation rules (name, UDI-DI, model, description)
- Add AlertDialog for product deactivation confirmation
- Create product form schemas with Zod

Features:
- Product registration with real-time UDI-DI duplicate check
- Product detail view with status badge
- Product edit form (UDI-DI read-only)
- Product activate/deactivate with confirmation dialog
- Form validation with Zod schemas
- Success/error toast notifications

Test scenarios:
- ProductCreatePage form rendering
- Required field validation
- UDI-DI format validation
- UDI-DI duplicate check
- Product creation success
- ProductDetailPage detail rendering
- Deactivate AlertDialog display
- Product deactivation success

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] ProductCreatePage 컴포넌트 구현 완료
- [ ] ProductDetailPage 컴포넌트 구현 완료
- [ ] ProductEditPage 컴포넌트 구현 완료
- [ ] 제품 등록 폼 필드 검증 (Zod 스키마) 동작 확인
- [ ] UDI-DI 실시간 중복 검사 동작 확인
- [ ] 제품 등록 성공 시 상세 페이지로 이동 확인
- [ ] 제품 상세 정보 표시 확인
- [ ] 제품 활성화/비활성화 기능 동작 확인
- [ ] AlertDialog 확인 UI 동작 확인
- [ ] 제품 수정 폼에서 UDI-DI 읽기 전용 처리 확인
- [ ] 제품 수정 성공 시 상세 페이지로 이동 확인
- [ ] 로딩 상태 UI 표시 확인
- [ ] 에러 상태 UI 표시 확인
- [ ] 모바일 반응형 레이아웃 확인
- [ ] VALIDATION_RULES.PRODUCT 상수 정의 완료
- [ ] SUCCESS_MESSAGES.PRODUCT, ERROR_MESSAGES.PRODUCT 정의 완료
- [ ] 8개 테스트 시나리오 통과
- [ ] Supabase RLS 정책 (INSERT, UPDATE) 설정 확인
- [ ] TypeScript strict mode 컴파일 에러 없음
- [ ] ESLint 경고 없음
- [ ] Git commit (Conventional Commits) 완료

---

## 🔗 References

- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [shadcn/ui Form Component](https://ui.shadcn.com/docs/components/form)
- [shadcn/ui AlertDialog Component](https://ui.shadcn.com/docs/components/alert-dialog)
- [TanStack Query Mutations](https://tanstack.com/query/latest/docs/react/guides/mutations)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 3.3 - 제조사 설정](phase-3.3-manufacturer-settings.md)

**Phase 3.3 개요**:
- 제조사별 Lot 번호 규칙 설정
- Lot 접두사 설정
- 모델 자릿수 설정
- 사용기한 개월 수 설정
- 설정 CRUD 기능
