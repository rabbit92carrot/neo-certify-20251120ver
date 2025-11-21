# Phase 4.3: 유통사/병원 출고

## 📋 Overview

**Phase 4.3**은 유통사가 병원 또는 다른 유통사로 제품을 출고하는 기능을 구현합니다.

**PRD 참조**: Section 5.1 - "다단계 유통: 유통사 → 유통사 가능", Section 5.3 - 유통사→유통사 및 유통사→병원 플로우

Phase 3.5(제조사 출고)와 유사하지만 출고 대상을 선택할 수 있습니다:
- **유통사 → 병원**: **즉시 소유권 이전** (Pending 없음, PRD Section 5.3)
- **유통사 → 유통사**: Pending 워크플로우 적용 (다단계 유통)

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

### HospitalShipmentPage 컴포넌트

**파일 경로**: `src/pages/distributor/HospitalShipmentPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { ORGANIZATION_TYPE, SHIPMENT_STATUS } from '@/constants/status'
import type { Product, Organization, Inventory, Lot } from '@/types/database'

interface CartItem {
  product: Product
  quantity: number
  selectedLots: { lot: Lot; quantity: number }[]
}

export function HospitalShipmentPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [targetType, setTargetType] = useState<'HOSPITAL' | 'DISTRIBUTOR'>('HOSPITAL') // 출고 대상 선택
  const [selectedTargetId, setSelectedTargetId] = useState('') // 병원 또는 유통사 ID
  const [quantity, setQuantity] = useState(1)

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

  // Fetch target organizations (hospital or distributor)
  const { data: targetOrganizations } = useQuery({
    queryKey: ['targetOrganizations', targetType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('type', targetType) // HOSPITAL 또는 DISTRIBUTOR
        .eq('status', 'approved')
        .order('name')

      if (error) throw error
      return data as Organization[]
    },
  })

  // Fetch products with inventory
  const { data: productsWithInventory } = useQuery({
    queryKey: ['productsWithInventory', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, lot:lots(*, product:products(*))')
        .eq('organization_id', userData!.organization_id)
        .gt('current_quantity', 0)

      if (error) throw error
      return data
    },
    enabled: !!userData?.organization_id,
  })

  /**
   * FIFO 할당 알고리즘
   *
   * 보강 작업 업데이트:
   * - 1차: 제조일(manufacture_date)이 빠른 Lot 우선 (오래된 것 먼저)
   * - 2차: 사용기한(expiry_date)이 가까운 Lot 우선
   * - 3차: Virtual Code의 sequence_number 순서 (Lot 내부 순서)
   * - 4차: Lot 생성일(created_at) 기준
   *
   * ⭐ 주의: 데이터베이스 쿼리 시 이미 FIFO 정렬되어 있다고 가정합니다.
   * inventory 조회 시 .order() 메서드로 정렬 필요.
   *
   * @param productId - 제품 ID
   * @param requestedQty - 요청 수량
   * @returns 할당된 Lot 목록 (FIFO 정렬 순서)
   * @throws 재고가 없거나 부족한 경우 에러
   */
  const allocateFIFO = (productId: string, requestedQty: number) => {
    // 1. 해당 제품의 재고만 필터링
    const productInventory = productsWithInventory?.filter(
      (inv: any) => inv.lot.product_id === productId
    )

    if (!productInventory || productInventory.length === 0) {
      throw new Error('재고가 없습니다.')
    }

    // 2. 총 가용 재고 확인
    const totalAvailable = productInventory.reduce(
      (sum: number, inv: any) => sum + inv.current_quantity,
      0
    )

    if (totalAvailable < requestedQty) {
      throw new Error(`재고가 부족합니다. (요청: ${requestedQty}, 가용: ${totalAvailable})`)
    }

    // 3. FIFO 순서로 수량 할당 (이미 정렬된 상태)
    // Note: inventory 쿼리에서 이미 FIFO 정렬되어 있어야 합니다.
    // .order('lot.manufacture_date', { ascending: true })
    // .order('lot.expiry_date', { ascending: true })
    const allocatedLots: { lot: Lot; quantity: number }[] = []
    let remainingQty = requestedQty

    for (const inv of productInventory) {
      if (remainingQty === 0) break
      const allocateQty = Math.min(inv.current_quantity, remainingQty)
      allocatedLots.push({ lot: inv.lot, quantity: allocateQty })
      remainingQty -= allocateQty
    }

    return allocatedLots
  }

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error('장바구니가 비어 있습니다.')
      if (!selectedTargetId) throw new Error(`${targetType === 'HOSPITAL' ? '병원' : '유통사'}을 선택해주세요.`)

      for (const item of cart) {
        for (const { lot, quantity: shipQty } of item.selectedLots) {
          // PRD Section 5.3: 병원 출고 시 즉시 소유권 이전 (Pending 없음)
          if (targetType === 'HOSPITAL') {
            // Create shipment (즉시 COMPLETED)
            const { data: shipment } = await supabase.from('shipments').insert({
              lot_id: lot.id,
              from_organization_id: userData!.organization_id,
              to_organization_id: selectedTargetId,
              quantity: shipQty,
              shipment_date: format(new Date(), 'yyyy-MM-dd'),
              received_date: format(new Date(), 'yyyy-MM-dd'), // 즉시 입고
              status: SHIPMENT_STATUS.COMPLETED, // 즉시 완료
            }).select().single()

            if (!shipment) throw new Error('출고 생성 실패')

            // Decrement sender inventory
            await supabase.rpc('decrement_inventory', {
              p_lot_id: lot.id,
              p_organization_id: userData!.organization_id,
              p_quantity: shipQty,
              p_user_id: user!.id,
            })

            // Increment receiver inventory (병원)
            const { data: existingInventory } = await supabase
              .from('inventory')
              .select('id, current_quantity')
              .eq('lot_id', lot.id)
              .eq('organization_id', selectedTargetId)
              .maybeSingle()

            if (existingInventory) {
              // 기존 재고 업데이트
              await supabase
                .from('inventory')
                .update({
                  current_quantity: existingInventory.current_quantity + shipQty,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingInventory.id)
            } else {
              // 신규 재고 생성
              await supabase.from('inventory').insert({
                lot_id: lot.id,
                organization_id: selectedTargetId,
                current_quantity: shipQty,
              })
            }
          } else {
            // 유통사 출고: Pending 워크플로우 적용
            await supabase.from('shipments').insert({
              lot_id: lot.id,
              from_organization_id: userData!.organization_id,
              to_organization_id: selectedTargetId,
              quantity: shipQty,
              shipment_date: format(new Date(), 'yyyy-MM-dd'),
              status: SHIPMENT_STATUS.PENDING, // 수락 대기
            })

            // Decrement sender inventory
            await supabase.rpc('decrement_inventory', {
              p_lot_id: lot.id,
              p_organization_id: userData!.organization_id,
              p_quantity: shipQty,
              p_user_id: user!.id,
            })
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['productsWithInventory'] })
      toast({
        title: targetType === 'HOSPITAL'
          ? SUCCESS_MESSAGES.SHIPMENT.CREATED + ' (병원 즉시 입고 완료)'
          : SUCCESS_MESSAGES.SHIPMENT.CREATED + ' (유통사 입고 대기)'
      })
      setCart([])
      setSelectedTargetId('')
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.SHIPMENT.CREATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">유통사/병원 출고</h1>
        <p className="mt-1 text-sm text-gray-600">병원 또는 다른 유통사로 제품을 출고합니다</p>
      </div>

      {/* 출고 대상 선택 (PRD Section 5.1: 다단계 유통) */}
      <div>
        <label className="text-sm font-medium">출고 대상 유형</label>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="targetType"
              value="HOSPITAL"
              checked={targetType === 'HOSPITAL'}
              onChange={(e) => {
                setTargetType('HOSPITAL')
                setSelectedTargetId('') // 대상 초기화
              }}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">병원</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="targetType"
              value="DISTRIBUTOR"
              checked={targetType === 'DISTRIBUTOR'}
              onChange={(e) => {
                setTargetType('DISTRIBUTOR')
                setSelectedTargetId('') // 대상 초기화
              }}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">유통사 (다단계 유통)</span>
          </label>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">
          {targetType === 'HOSPITAL' ? '병원' : '유통사'} 선택
        </label>
        <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder={`${targetType === 'HOSPITAL' ? '병원' : '유통사'}을 선택하세요`} />
          </SelectTrigger>
          <SelectContent>
            {targetOrganizations?.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cart implementation similar to Phase 3.5 */}

      <Button
        onClick={() => createShipmentMutation.mutate()}
        disabled={cart.length === 0 || !selectedTargetId}
      >
        {targetType === 'HOSPITAL' ? '병원 출고 (즉시 완료)' : '유통사 출고 (수락 대기)'}
      </Button>
    </div>
  )
}
```

---

## 🔄 Git Commit Message

```bash
feat(distributor): add hospital shipment page

- Implement hospital shipment with FIFO allocation
- Add hospital selection dropdown
- Reuse cart and FIFO logic from manufacturer

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 4.4 - 반품 처리](phase-4.4-returns.md)
