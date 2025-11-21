# Phase 4.3: 유통사/병원 출고

## 📋 Overview

**Phase 4.3**은 유통사가 병원 또는 다른 유통사로 제품을 출고하는 기능을 구현합니다.

**PRD 참조**: Section 5.1 - "다단계 유통: 유통사 → 유통사 가능", Section 5.3 - 유통사→유통사 및 유통사→병원 플로우

Phase 3.5(제조사 출고)와 유사하지만 출고 대상을 선택할 수 있습니다:
- **유통사 → 병원**: Pending 워크플로우 적용
- **유통사 → 유통사**: Pending 워크플로우 적용 (다단계 유통)

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

  // FIFO allocation
  const allocateFIFO = (productId: string, requestedQty: number) => {
    const productInventory = productsWithInventory?.filter(
      (inv: any) => inv.lot.product_id === productId
    )

    if (!productInventory || productInventory.length === 0) {
      throw new Error('재고가 없습니다.')
    }

    const totalAvailable = productInventory.reduce(
      (sum: number, inv: any) => sum + inv.current_quantity,
      0
    )

    if (totalAvailable < requestedQty) {
      throw new Error(`재고가 부족합니다. (요청: ${requestedQty}, 가용: ${totalAvailable})`)
    }

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
      if (!selectedHospitalId) throw new Error('병원을 선택해주세요.')

      for (const item of cart) {
        for (const { lot, quantity: shipQty } of item.selectedLots) {
          // Create shipment
          await supabase.from('shipments').insert({
            lot_id: lot.id,
            from_organization_id: userData!.organization_id,
            to_organization_id: selectedHospitalId,
            quantity: shipQty,
            shipment_date: format(new Date(), 'yyyy-MM-dd'),
            status: SHIPMENT_STATUS.PENDING,
          })

          // Decrement inventory
          await supabase.rpc('decrement_inventory', {
            p_lot_id: lot.id,
            p_organization_id: userData!.organization_id,
            p_quantity: shipQty,
            p_user_id: user!.id,
          })
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast({ title: SUCCESS_MESSAGES.SHIPMENT.CREATED })
      setCart([])
      setSelectedHospitalId('')
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
        disabled={cart.length === 0 || !selectedHospitalId}
      >
        출고 완료
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
