# Phase 5.1: 시술 등록 (Treatment Registration)

## 📋 Overview

**Phase 5.1**은 병원에서 환자에게 제품을 시술하고, 환자 전화번호를 기반으로 소유권을 이전하는 핵심 기능을 구현합니다. 가상 코드는 실물이 없고 DB에만 존재하므로, **제품 종류 선택 + 수량 입력** 방식으로 시술을 등록하고, FIFO 알고리즘이 자동으로 가상 코드를 할당합니다.

**핵심 워크플로우** (PRD 섹션 8.7):
1. 제품 종류 선택 → 수량 입력 → 장바구니에 담기
2. 여러 제품 사용 시 반복
3. 환자 전화번호 입력 (010-1234-5678)
4. 확인 → FIFO로 가상 코드 자동 할당 → 소유권 환자에게 이전
5. 카카오 알림톡 메시지 생성 (DB에 기록, Mock 페이지 표시)

---

## 🎯 Business Rules (from PRD Section 15)

### 장바구니 처리 (15.7)
- **영속성**: DB 저장 없음, 페이지 세션 내에서만 일시 유지 (React state)
- **중복 담기**: 같은 제품을 여러 번 담으면 합산하여 표시
- **수량 수정**: 장바구니에 담은 후 수량 수정 가능 (개별 행 편집)
- **삭제**: 장바구니에서 제품 삭제 가능

### 환자 소유권 (15.6)
- 시술 완료 시 해당 가상 코드의 `owner_id`를 환자 전화번호로 설정
- 동일 전화번호 = 동일 환자 → 시술 이력 누적 관리

### 전화번호 정규화 (15.5)
- 입력: `010-1234-5678` (하이픈 포함 가능)
- 저장: `01012345678` (숫자만, 11자리)
- DB 트리거가 자동 정규화 (Phase 1.3)

### FIFO 할당 (15.1)
- 제품별로 가장 오래된 가상 코드부터 할당
- 정렬 순서: manufacture_date → expiry_date → sequence_number → created_at

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

### 1. TreatmentRegistrationPage 컴포넌트

**파일 경로**: `src/pages/hospital/TreatmentRegistrationPage.tsx`

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, Plus } from 'lucide-react'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { VALIDATION_RULES } from '@/constants/validation'
import { PHONE_FORMAT } from '@/constants/business-logic'
import type { Product } from '@/types/database'

// 장바구니 아이템 타입
interface CartItem {
  product_id: string
  product_name: string
  quantity: number
}

// 제품 선택 폼 스키마
const productSelectionSchema = z.object({
  product_id: z.string().min(1, '제품을 선택해주세요.'),
  quantity: z.number().min(1, '수량은 1개 이상이어야 합니다.'),
})

// 시술 완료 폼 스키마
const treatmentSchema = z.object({
  patient_phone: z
    .string()
    .regex(PHONE_FORMAT.DISPLAY_REGEX, '전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)')
    .min(12, '전화번호를 입력해주세요.')
    .max(13),
})

type ProductSelectionData = z.infer<typeof productSelectionSchema>
type TreatmentFormData = z.infer<typeof treatmentSchema>

export function TreatmentRegistrationPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // 장바구니 상태 (세션 내 메모리에만 존재)
  const [cart, setCart] = useState<CartItem[]>([])

  // 사용자 조직 정보 조회
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

  // 병원이 보유한 제품 목록 조회 (재고 있는 것만)
  const { data: availableProducts = [] } = useQuery<Product[]>({
    queryKey: ['hospitalProducts', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('virtual_codes')
        .select('product:products(*)')
        .eq('owner_id', userData!.organization_id)
        .eq('status', 'IN_STOCK')
        .order('product_id')

      if (error) throw error

      // 중복 제거 (product_id 기준)
      const uniqueProducts = Array.from(
        new Map(data.map((item) => [item.product.id, item.product])).values()
      )
      return uniqueProducts as Product[]
    },
    enabled: !!userData?.organization_id,
  })

  // 제품 선택 폼
  const productForm = useForm<ProductSelectionData>({
    resolver: zodResolver(productSelectionSchema),
    defaultValues: {
      product_id: '',
      quantity: 1,
    },
  })

  // 시술 완료 폼
  const treatmentForm = useForm<TreatmentFormData>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      patient_phone: '',
    },
  })

  // 장바구니에 제품 추가
  const addToCart = (data: ProductSelectionData) => {
    const product = availableProducts.find((p) => p.id === data.product_id)
    if (!product) return

    // 이미 장바구니에 있는 제품인지 확인
    const existingIndex = cart.findIndex((item) => item.product_id === data.product_id)

    if (existingIndex >= 0) {
      // 기존 제품의 수량 증가 (합산)
      const newCart = [...cart]
      newCart[existingIndex].quantity += data.quantity
      setCart(newCart)
      toast({ title: `${product.name} 수량이 추가되었습니다.` })
    } else {
      // 새 제품 추가
      setCart([
        ...cart,
        {
          product_id: data.product_id,
          product_name: product.name,
          quantity: data.quantity,
        },
      ])
      toast({ title: `${product.name}이(가) 장바구니에 담겼습니다.` })
    }

    // 폼 초기화
    productForm.reset()
  }

  // 장바구니에서 제품 삭제
  const removeFromCart = (product_id: string) => {
    setCart(cart.filter((item) => item.product_id !== product_id))
  }

  // 장바구니 수량 수정
  const updateCartQuantity = (product_id: string, newQuantity: number) => {
    if (newQuantity < 1) return
    setCart(cart.map((item) => (item.product_id === product_id ? { ...item, quantity: newQuantity } : item)))
  }

  // 시술 등록 Mutation
  const registerTreatmentMutation = useMutation({
    mutationFn: async (data: TreatmentFormData) => {
      if (cart.length === 0) {
        throw new Error('장바구니가 비어있습니다.')
      }

      // PostgreSQL 함수 호출: treatment_transaction
      // 이 함수는 FIFO 할당 + 소유권 이전 + 이력 기록 + 알림톡 메시지 생성을 원자적으로 처리
      const { data: result, error } = await supabase.rpc('treatment_transaction', {
        p_hospital_id: userData!.organization_id,
        p_patient_phone: data.patient_phone,
        p_cart_items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        p_user_id: user!.id,
      })

      if (error) throw error
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['hospitalProducts'] })
      queryClient.invalidateQueries({ queryKey: ['treatmentHistory'] })
      queryClient.invalidateQueries({ queryKey: ['notificationMessages'] })

      toast({
        title: SUCCESS_MESSAGES.TREATMENT.REGISTERED,
        description: `${result.treatment_record_id} - ${result.allocated_count}개 제품 할당 완료`,
      })

      // 폼 및 장바구니 초기화
      treatmentForm.reset()
      setCart([])
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.TREATMENT.REGISTER_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">시술 등록</h1>
        <p className="mt-1 text-sm text-gray-600">
          환자에게 사용할 제품을 선택하고, 환자 전화번호를 입력하여 소유권을 이전합니다.
        </p>
      </div>

      {/* Step 1: 제품 선택 및 장바구니 */}
      <Card>
        <CardHeader>
          <CardTitle>1. 제품 선택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(addToCart)} className="flex gap-4">
              <FormField
                control={productForm.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>제품 종류</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="제품을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.udi_di})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={productForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormLabel>수량</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end">
                <Button type="submit" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  장바구니 담기
                </Button>
              </div>
            </form>
          </Form>

          {/* 장바구니 테이블 */}
          {cart.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">장바구니</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제품명</TableHead>
                    <TableHead className="w-32">수량</TableHead>
                    <TableHead className="w-20">삭제</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(item.product_id, Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: 환자 전화번호 입력 및 시술 완료 */}
      <Card>
        <CardHeader>
          <CardTitle>2. 환자 정보 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...treatmentForm}>
            <form
              onSubmit={treatmentForm.handleSubmit((data) => registerTreatmentMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={treatmentForm.control}
                name="patient_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>환자 전화번호 *</FormLabel>
                    <FormControl>
                      <Input placeholder="010-1234-5678" maxLength={13} {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500">
                      하이픈 포함하여 입력 (예: 010-1234-5678)
                    </p>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={registerTreatmentMutation.isPending || cart.length === 0}
                className="w-full"
              >
                {registerTreatmentMutation.isPending ? '시술 등록 중...' : '시술 완료'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### 2. PostgreSQL Function: treatment_transaction

**파일 경로**: `supabase/migrations/[timestamp]_create_treatment_transaction.sql`

이 함수는 Phase 1.3에서 이미 정의되어 있습니다. 다음 작업을 원자적으로 수행:

1. **Advisory Lock 획득** (조직 + 제품별, Phase 7.4 동시성 제어)
2. **재고 확인**: 병원이 각 제품을 충분히 보유하고 있는지 확인
3. **FIFO 할당**: 각 제품별로 가장 오래된 가상 코드 선택
4. **소유권 이전**: 선택된 가상 코드의 `owner_id`를 환자 전화번호로 변경
5. **상태 변경**: `status = 'USED'`
6. **환자 레코드 생성/업데이트**: `patients` 테이블에 전화번호 추가 (없으면 생성)
7. **시술 기록 생성**: `treatment_records` + `treatment_details` 테이블 삽입
8. **이력 기록**: `history` 테이블에 `TREATMENT` 액션 기록
9. **알림톡 메시지 생성**: `notification_messages` 테이블에 메시지 삽입

**함수 시그니처** (Phase 1.3 참조):
```sql
CREATE OR REPLACE FUNCTION treatment_transaction(
  p_hospital_id UUID,
  p_patient_phone TEXT,
  p_cart_items JSONB, -- [{"product_id": "uuid", "quantity": 5}, ...]
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_treatment_record_id UUID;
  v_allocated_count INT := 0;
  -- ...
BEGIN
  -- 구현은 Phase 1.3 참조
END;
$$ LANGUAGE plpgsql;
```

---

### 3. Constants 정의

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존
  TREATMENT: {
    REGISTERED: '시술 등록이 완료되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존
  TREATMENT: {
    REGISTER_FAILED: '시술 등록에 실패했습니다.',
    INSUFFICIENT_STOCK: '재고가 부족합니다.',
    EMPTY_CART: '장바구니가 비어있습니다.',
  },
} as const
```

**파일 경로**: `src/constants/business-logic.ts` (확인)

```typescript
// Phase 0.5에서 이미 정의됨
export const PHONE_FORMAT = {
  STORAGE_LENGTH: 11, // 01012345678
  DISPLAY_REGEX: /^010-\d{4}-\d{4}$/, // 010-1234-5678
  NORMALIZE: (phone: string) => phone.replace(/-/g, ''), // 하이픈 제거
} as const
```

---

### 4. 라우팅 설정

**파일 경로**: `src/constants/routes.ts` (추가)

```typescript
export const ROUTES = {
  // ... 기존
  HOSPITAL: {
    // ...
    TREATMENT: '/hospital/treatment', // ← 추가
    RECALL: '/hospital/recall',
    INVENTORY: '/hospital/inventory',
    HISTORY: '/hospital/history',
  },
} as const
```

**파일 경로**: `src/App.tsx` (라우트 추가)

```typescript
import { TreatmentRegistrationPage } from '@/pages/hospital/TreatmentRegistrationPage'

// ...
<Route path={ROUTES.HOSPITAL.TREATMENT} element={<TreatmentRegistrationPage />} />
```

---

### 5. 내비게이션 메뉴 추가

**파일 경로**: `src/components/layout/HospitalNavigation.tsx` (수정)

```typescript
const hospitalMenuItems = [
  { label: '시술 등록', path: ROUTES.HOSPITAL.TREATMENT, icon: Plus }, // ← 최상단 추가
  { label: '회수', path: ROUTES.HOSPITAL.RECALL, icon: RotateCcw },
  { label: '재고 조회', path: ROUTES.HOSPITAL.INVENTORY, icon: Package },
  { label: '이력 조회', path: ROUTES.HOSPITAL.HISTORY, icon: History },
  // ...
]
```

---

## 🔧 TypeScript Types

**파일 경로**: `src/types/database.ts` (이미 Phase 1.5에서 자동 생성됨)

```typescript
export interface TreatmentRecord {
  id: string
  hospital_id: string
  patient_phone: string // 정규화된 형태 (01012345678)
  treated_by: string // User ID
  treated_at: string // ISO timestamp
  created_at: string
}

export interface TreatmentDetail {
  id: string
  treatment_record_id: string
  virtual_code_id: string
  product_id: string
  lot_id: string
  quantity: number
}

export interface NotificationMessage {
  id: string
  patient_phone: string
  message_type: 'AUTHENTICATION' | 'RECALL'
  message_content: string
  treatment_record_id?: string
  created_at: string
}
```

---

## ✅ Acceptance Criteria

### Functional Requirements
- [ ] 병원이 보유한 제품 목록을 조회할 수 있다 (재고 있는 것만)
- [ ] 제품을 선택하고 수량을 입력하여 장바구니에 담을 수 있다
- [ ] 같은 제품을 여러 번 담으면 수량이 합산된다
- [ ] 장바구니에서 수량을 수정하거나 제품을 삭제할 수 있다
- [ ] 환자 전화번호를 입력할 수 있다 (010-1234-5678 형식)
- [ ] 시술 완료 버튼을 클릭하면 FIFO로 가상 코드가 자동 할당된다
- [ ] 할당된 가상 코드의 소유권이 환자 전화번호로 이전된다
- [ ] 시술 기록이 `treatment_records`와 `treatment_details`에 저장된다
- [ ] 알림톡 메시지가 `notification_messages` 테이블에 생성된다
- [ ] 시술 완료 후 장바구니가 초기화된다

### Technical Requirements
- [ ] `treatment_transaction` PostgreSQL 함수 사용 (원자성 보장)
- [ ] Advisory Lock으로 동시성 제어 (조직 + 제품별 잠금)
- [ ] 전화번호는 DB 트리거로 자동 정규화 (`010-1234-5678` → `01012345678`)
- [ ] 재고 부족 시 명확한 에러 메시지 표시
- [ ] 장바구니는 React state에만 저장 (DB 영속성 없음)
- [ ] 모든 상수는 `src/constants/`에서 import (하드코딩 제로)

### UI/UX Requirements
- [ ] 제품 선택 드롭다운에 제품명 + UDI-DI 표시
- [ ] 장바구니 테이블에서 수량 inline 편집 가능
- [ ] 삭제 버튼에 빨간색 아이콘 표시
- [ ] 환자 전화번호 입력 필드 placeholder: `010-1234-5678`
- [ ] 시술 완료 버튼은 장바구니가 비어있으면 비활성화
- [ ] 시술 완료 후 성공 토스트 메시지 표시 (할당된 개수 포함)

---

## 🧪 Testing

### Unit Tests

**파일 경로**: `src/pages/hospital/__tests__/TreatmentRegistrationPage.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TreatmentRegistrationPage } from '../TreatmentRegistrationPage'

describe('TreatmentRegistrationPage', () => {
  it('renders product selection form', () => {
    render(<TreatmentRegistrationPage />)
    expect(screen.getByText('1. 제품 선택')).toBeInTheDocument()
    expect(screen.getByLabelText('제품 종류')).toBeInTheDocument()
  })

  it('adds product to cart', async () => {
    render(<TreatmentRegistrationPage />)

    // 제품 선택
    fireEvent.change(screen.getByLabelText('제품 종류'), { target: { value: 'product-uuid' } })
    fireEvent.change(screen.getByLabelText('수량'), { target: { value: '5' } })
    fireEvent.click(screen.getByText('장바구니 담기'))

    // 장바구니에 추가 확인
    await waitFor(() => {
      expect(screen.getByText('장바구니')).toBeInTheDocument()
    })
  })

  it('merges duplicate products in cart', () => {
    // 같은 제품 두 번 담기
    // 수량이 합산되는지 확인
  })

  it('validates phone number format', async () => {
    render(<TreatmentRegistrationPage />)

    fireEvent.change(screen.getByLabelText('환자 전화번호'), { target: { value: '12345' } })
    fireEvent.click(screen.getByText('시술 완료'))

    await waitFor(() => {
      expect(screen.getByText(/전화번호 형식이 올바르지 않습니다/)).toBeInTheDocument()
    })
  })

  it('disables submit button when cart is empty', () => {
    render(<TreatmentRegistrationPage />)
    expect(screen.getByText('시술 완료')).toBeDisabled()
  })
})
```

### Integration Tests

**파일 경로**: `src/pages/hospital/__tests__/TreatmentRegistrationPage.integration.test.tsx`

```typescript
describe('TreatmentRegistrationPage Integration', () => {
  it('completes full treatment workflow', async () => {
    // 1. 제품 선택 및 장바구니 담기
    // 2. 환자 전화번호 입력
    // 3. 시술 완료 클릭
    // 4. treatment_transaction 호출 확인
    // 5. 성공 토스트 표시 확인
    // 6. 장바구니 초기화 확인
  })

  it('handles insufficient stock error', async () => {
    // Mock: treatment_transaction returns error
    // 재고 부족 에러 메시지 표시 확인
  })

  it('handles concurrent treatments correctly', async () => {
    // 동일 제품에 대해 동시에 2개 시술 시도
    // Advisory Lock으로 순차 처리 확인
  })
})
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `src/pages/hospital/TreatmentRegistrationPage.tsx`
- `src/pages/hospital/__tests__/TreatmentRegistrationPage.test.tsx`
- `src/pages/hospital/__tests__/TreatmentRegistrationPage.integration.test.tsx`

**수정**:
- `src/constants/messages.ts` (TREATMENT 메시지 추가)
- `src/constants/routes.ts` (HOSPITAL.TREATMENT 경로 추가)
- `src/App.tsx` (라우트 추가)
- `src/components/layout/HospitalNavigation.tsx` (메뉴 추가)

**이미 존재** (Phase 1.3에서 생성됨):
- `supabase/migrations/[timestamp]_create_treatment_transaction.sql`
- `src/types/database.ts` (TreatmentRecord, TreatmentDetail, NotificationMessage)

---

## 🔄 Git Commit Message

```bash
feat(hospital): add treatment registration page with cart workflow

- Implement cart-based product selection (no scanning)
- Add patient phone number input with validation
- Integrate treatment_transaction PostgreSQL function
- Support FIFO automatic virtual code allocation
- Generate KakaoTalk notification messages
- Cart persists only in React state (no DB storage)
- Merge duplicate products in cart by summing quantities

Follows PRD Section 8.7 workflow exactly.

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 5.2 - 회수 (Recall)](phase-5.2-recall.md)

---

## 📌 Notes

### PRD 준수 사항
- ✅ PRD Section 8.7 (병원 시술 등록) 워크플로우 정확히 구현
- ✅ PRD Section 15.7 (장바구니 처리) - DB 저장 없음, 세션 내 메모리만
- ✅ PRD Section 15.5 (전화번호 정규화) - DB 트리거 활용
- ✅ PRD Section 15.6 (환자 소유권) - owner_id를 전화번호로 설정
- ✅ PRD Section 15.1 (FIFO) - treatment_transaction 함수에서 자동 처리

### 기술적 근거
- **가상 코드는 실물 없음**: 따라서 스캔 방식 불가, 제품 선택 + 수량 입력 방식 필수
- **장바구니 영속성 없음**: React state만 사용, 페이지 새로고침 시 초기화 (PRD 명시)
- **원자성 보장**: PostgreSQL 함수 내에서 모든 작업을 트랜잭션으로 처리
- **동시성 제어**: Advisory Lock으로 같은 조직 + 제품에 대한 동시 시술 방지

### Mock KakaoTalk 연동
- 시술 완료 시 `notification_messages` 테이블에 메시지 자동 생성
- Phase 6.6 (Mock KakaoTalk) 페이지에서 이 메시지를 조회하여 표시
- 메시지 내용: "귀하께서는 [병원명]에서 [제품명] [수량]개를 사용하셨습니다. (시술일시: YYYY-MM-DD HH:mm)"
