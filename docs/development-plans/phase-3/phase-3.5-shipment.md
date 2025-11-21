# Phase 3.5: 출고 (장바구니 + FIFO/Lot 선택)

## 📋 Overview

**Phase 3.5**는 제조사의 제품 출고 기능을 구현합니다. 장바구니 UI를 통해 여러 제품을 추가하고, FIFO(First In First Out) 알고리즘으로 자동 Lot 할당하거나 특정 Lot을 직접 선택할 수 있습니다.

### 주요 목표

1. **출고 장바구니 UI**: 여러 제품 추가 및 수량 관리
2. **FIFO 자동 할당**: 생산일 기준 오래된 Lot부터 자동 할당
3. **특정 Lot 선택**: 사용자가 원하는 Lot 직접 선택
4. **재고 검증**: 출고 수량이 재고를 초과하지 않도록 검증
5. **출고 완료**: Shipment 및 Inventory 업데이트

### 기술 스택

- **폼 관리**: React Hook Form + Zod
- **상태 관리**: TanStack Query (useQuery, useMutation) + useState (장바구니)
- **UI 라이브러리**: shadcn/ui (Table, Dialog, Select, Badge)
- **날짜 처리**: date-fns

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

### 1. ShipmentPage 컴포넌트

**파일 경로**: `src/pages/manufacturer/ShipmentPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { ROUTES } from '@/constants/routes'
import { PRODUCT_STATUS } from '@/constants/status'
import type { Product, Lot, Inventory, Organization } from '@/types/database'

interface CartItem {
  product: Product
  quantity: number
  allocationType: 'fifo' | 'manual'
  selectedLots?: { lot: Lot; quantity: number }[]
}

interface InventoryWithLot extends Inventory {
  lot: Lot & { product: Product }
}

export function ShipmentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [cart, setCart] = useState<CartItem[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [allocationType, setAllocationType] = useState<'fifo' | 'manual'>('fifo')
  const [manualLotSelections, setManualLotSelections] = useState<{ lotId: string; quantity: number }[]>([]) // 수동 선택한 Lot들

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

  // Fetch inventory (for FIFO allocation)
  const { data: inventory } = useQuery({
    queryKey: ['inventory', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, lot:lots(*, product:products(*))')
        .eq('organization_id', userData!.organization_id)
        .gt('current_quantity', 0)
        .order('lot.production_date', { ascending: true }) // FIFO: oldest first

      if (error) throw error
      return data as InventoryWithLot[]
    },
    enabled: !!userData?.organization_id,
  })

  /**
   * FIFO 할당 알고리즘
   *
   * PRD 요구사항 (Section 5.2, 15.1) + 보강 작업 업데이트:
   * - 1차: 제조일(manufacture_date)이 빠른 Lot 우선 (오래된 것 먼저)
   * - 2차: 사용기한(expiry_date)이 가까운 Lot 우선
   * - 3차: Virtual Code의 sequence_number 순서 (Lot 내부 순서)
   * - 4차: Lot 생성일(created_at) 기준
   *
   * ⭐ 주의: Virtual Code 단위가 아닌 Lot 단위 정렬입니다.
   * Lot 내부의 Virtual Code는 sequence_number로 자동 정렬됩니다.
   *
   * @param productId - 제품 ID
   * @param requestedQuantity - 요청 수량
   * @returns 할당된 Lot 목록 (FIFO 정렬 순서)
   * @throws 재고가 없거나 부족한 경우 에러
   */
  const allocateFIFO = (productId: string, requestedQuantity: number) => {
    // 1. 해당 제품의 재고만 필터링
    const productInventory = inventory?.filter(
      (inv) => inv.lot.product_id === productId
    )

    if (!productInventory || productInventory.length === 0) {
      throw new Error('재고가 없습니다.')
    }

    // 2. FIFO 정렬 (4단계: manufacture_date → expiry_date → sequence_number → created_at)
    const sortedInventory = [...productInventory].sort((a, b) => {
      // 우선순위 1: 제조일 (오름차순 - 오래된 것부터)
      const mfgCompare = new Date(a.lot.manufacture_date).getTime() - new Date(b.lot.manufacture_date).getTime()
      if (mfgCompare !== 0) return mfgCompare

      // 우선순위 2: 사용기한 (오름차순 - 가까운 것부터)
      const expiryCompare = new Date(a.lot.expiry_date).getTime() - new Date(b.lot.expiry_date).getTime()
      if (expiryCompare !== 0) return expiryCompare

      // 우선순위 3: sequence_number (Lot 내부 순서, Virtual Code 테이블에서 관리)
      // Note: 이 단계에서는 Lot 단위 정렬이므로 실제 Virtual Code sequence_number는
      // 데이터베이스 쿼리 시 자동으로 ORDER BY sequence_number ASC 적용됩니다.

      // 우선순위 4: Lot 생성일 (오름차순)
      return new Date(a.lot.created_at).getTime() - new Date(b.lot.created_at).getTime()
    })

    // 3. 총 가용 재고 확인
    const totalAvailable = sortedInventory.reduce(
      (sum, inv) => sum + inv.current_quantity,
      0
    )

    if (totalAvailable < requestedQuantity) {
      throw new Error(
        `재고가 부족합니다. (요청: ${requestedQuantity}, 가용: ${totalAvailable})`
      )
    }

    // 4. FIFO 순서로 수량 할당
    const allocatedLots: { lot: Lot; quantity: number }[] = []
    let remainingQuantity = requestedQuantity

    for (const inv of sortedInventory) {
      if (remainingQuantity === 0) break

      const allocateQty = Math.min(inv.current_quantity, remainingQuantity)
      allocatedLots.push({
        lot: inv.lot,
        quantity: allocateQty,
      })
      remainingQuantity -= allocateQty
    }

    return allocatedLots
  }

  // Add to cart
  const handleAddToCart = () => {
    try {
      const product = products?.find((p) => p.id === selectedProductId)
      if (!product) {
        toast({
          title: '제품을 선택해주세요.',
          variant: 'destructive',
        })
        return
      }

      if (quantity <= 0) {
        toast({
          title: '수량은 1개 이상이어야 합니다.',
          variant: 'destructive',
        })
        return
      }

      // Check if product already in cart
      // PRD Section 15.7: 중복 담기 시 수량 합산
      const existingIndex = cart.findIndex((item) => item.product.id === selectedProductId)
      if (existingIndex !== -1) {
        // 기존 수량에 합산
        const updatedCart = [...cart]
        updatedCart[existingIndex].quantity += quantity
        setCart(updatedCart)

        toast({
          title: '수량이 추가되었습니다.',
          description: `총 ${updatedCart[existingIndex].quantity}개`,
        })
        return
      }

      // Allocate lots
      let selectedLots: { lot: Lot; quantity: number }[] | undefined
      if (allocationType === 'fifo') {
        selectedLots = allocateFIFO(selectedProductId, quantity)
      } else if (allocationType === 'manual') {
        // Manual lot selection validation (PRD Section 5.2)
        const totalSelected = manualLotSelections.reduce((sum, s) => sum + s.quantity, 0)
        if (totalSelected !== quantity) {
          toast({
            title: '수량 불일치',
            description: `선택된 수량(${totalSelected})이 요청 수량(${quantity})과 일치하지 않습니다.`,
            variant: 'destructive',
          })
          return
        }

        // Convert manual selections to selectedLots format
        selectedLots = manualLotSelections.map((selection) => {
          const inv = inventory?.find((i) => i.lot.id === selection.lotId)
          if (!inv) throw new Error(`Lot ${selection.lotId} not found`)
          return {
            lot: inv.lot,
            quantity: selection.quantity,
          }
        })
      }

      setCart([
        ...cart,
        {
          product,
          quantity,
          allocationType,
          selectedLots,
        },
      ])

      // Reset manual selections
      setManualLotSelections([])

      toast({
        title: '장바구니에 추가되었습니다.',
      })

      // Reset form
      setSelectedProductId('')
      setQuantity(1)
      setAllocationType('fifo')
      setIsAddDialogOpen(false)
    } catch (error) {
      toast({
        title: '장바구니 추가 실패',
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    }
  }

  // Remove from cart
  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
    toast({
      title: '장바구니에서 제거되었습니다.',
    })
  }

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) {
        throw new Error('장바구니가 비어 있습니다.')
      }

      // Create shipment records and update inventory
      for (const item of cart) {
        if (item.allocationType === 'fifo' && item.selectedLots) {
          for (const { lot, quantity: shipQty } of item.selectedLots) {
            // Create shipment record
            const { error: shipmentError } = await supabase.from('shipments').insert({
              lot_id: lot.id,
              from_organization_id: userData!.organization_id,
              to_organization_id: null, // Will be set in Phase 4 (distributor)
              quantity: shipQty,
              shipment_date: format(new Date(), 'yyyy-MM-dd'),
            })

            if (shipmentError) throw shipmentError

            // Update inventory
            const { error: inventoryError } = await supabase.rpc(
              'decrement_inventory',
              {
                p_lot_id: lot.id,
                p_organization_id: userData!.organization_id,
                p_quantity: shipQty,
                p_user_id: user!.id,
              }
            )

            if (inventoryError) throw inventoryError
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      toast({
        title: SUCCESS_MESSAGES.SHIPMENT.CREATED,
      })
      setCart([])
      navigate(ROUTES.MANUFACTURER.SHIPMENT)
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.SHIPMENT.CREATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const handleCheckout = () => {
    createShipmentMutation.mutate()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">출고 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            제품을 선택하고 출고할 수량을 입력하세요
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>제품 추가</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>출고 제품 추가</DialogTitle>
              <DialogDescription>
                출고할 제품과 수량을 선택해주세요
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Product Selection */}
              <div>
                <label className="text-sm font-medium">제품 선택</label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="제품을 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.model_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-medium">출고 수량</label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>

              {/* Allocation Type */}
              <div>
                <label className="text-sm font-medium">할당 방식</label>
                <Select value={allocationType} onValueChange={(v) => setAllocationType(v as 'fifo' | 'manual')}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fifo">자동 할당 (FIFO)</SelectItem>
                    <SelectItem value="manual">특정 Lot 선택 (수동)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-gray-600">
                  {allocationType === 'fifo'
                    ? 'FIFO: 사용기한이 가까운 Lot부터 자동으로 할당됩니다'
                    : '특정 Lot: 제조사가 직접 원하는 Lot을 선택합니다 (PRD Section 5.2)'}
                </p>
              </div>

              {/* Manual Lot Selection (PRD Section 5.2: Lot 선택 옵션) */}
              {allocationType === 'manual' && selectedProductId && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Lot 선택 (총 {quantity}개 필요)
                  </h3>
                  {inventory
                    ?.filter((inv) => inv.lot.product_id === selectedProductId && inv.current_quantity > 0)
                    .map((inv) => (
                      <div key={inv.lot.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            Lot #{inv.lot.lot_number}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            재고: {inv.current_quantity}개 | 사용기한: {format(new Date(inv.lot.expiry_date), 'yyyy-MM-dd')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={inv.current_quantity}
                            value={manualLotSelections.find((s) => s.lotId === inv.lot.id)?.quantity || 0}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 0
                              setManualLotSelections((prev) => {
                                const existing = prev.find((s) => s.lotId === inv.lot.id)
                                if (qty === 0) {
                                  return prev.filter((s) => s.lotId !== inv.lot.id)
                                }
                                if (existing) {
                                  return prev.map((s) =>
                                    s.lotId === inv.lot.id ? { ...s, quantity: qty } : s
                                  )
                                }
                                return [...prev, { lotId: inv.lot.id, quantity: qty }]
                              })
                            }}
                            className="w-20 text-sm"
                          />
                          <span className="text-xs text-gray-500">개</span>
                        </div>
                      </div>
                    ))}
                  <div className="mt-3 text-xs text-gray-600">
                    선택된 수량: {manualLotSelections.reduce((sum, s) => sum + s.quantity, 0)}개 / {quantity}개
                  </div>
                </div>
              )}

              <Button onClick={handleAddToCart} className="w-full">
                장바구니에 추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cart */}
      <Card>
        <CardHeader>
          <CardTitle>출고 장바구니</CardTitle>
          <CardDescription>출고할 제품 목록입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {cart.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              장바구니가 비어 있습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제품명</TableHead>
                  <TableHead>모델명</TableHead>
                  <TableHead>수량</TableHead>
                  <TableHead>할당 방식</TableHead>
                  <TableHead>할당된 Lot</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item) => (
                  <TableRow key={item.product.id}>
                    <TableCell className="font-medium">{item.product.name}</TableCell>
                    <TableCell>{item.product.model_name}</TableCell>
                    <TableCell>{item.quantity.toLocaleString()}개</TableCell>
                    <TableCell>
                      <Badge variant={item.allocationType === 'fifo' ? 'default' : 'secondary'}>
                        {item.allocationType === 'fifo' ? 'FIFO' : '수동'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.selectedLots && (
                        <div className="space-y-1 text-sm">
                          {item.selectedLots.map((sl, idx) => (
                            <div key={idx} className="text-gray-600">
                              {sl.lot.lot_number}: {sl.quantity}개
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                      >
                        제거
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Checkout */}
      {cart.length > 0 && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setCart([])}>
            장바구니 비우기
          </Button>
          <Button onClick={handleCheckout} disabled={createShipmentMutation.isPending}>
            {createShipmentMutation.isPending ? '출고 처리 중...' : '출고 완료'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

---

### 2. Database Function: decrement_inventory

**파일 경로**: `supabase/migrations/YYYYMMDDHHMMSS_create_decrement_inventory_function.sql`

```sql
-- Function to decrement inventory quantity
CREATE OR REPLACE FUNCTION decrement_inventory(
  p_lot_id UUID,
  p_organization_id UUID,
  p_quantity INTEGER,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Update inventory
  UPDATE inventory
  SET
    current_quantity = current_quantity - p_quantity,
    last_updated_by = p_user_id,
    updated_at = NOW()
  WHERE
    lot_id = p_lot_id
    AND organization_id = p_organization_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory record not found';
  END IF;

  -- Check if quantity is now negative (shouldn't happen with proper validation)
  IF (SELECT current_quantity FROM inventory WHERE lot_id = p_lot_id AND organization_id = p_organization_id) < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 📝 TypeScript Type Definitions

**파일 경로**: `src/types/shipment.ts` (신규 파일)

```typescript
import type { Product, Lot } from './database'

export interface CartItem {
  product: Product
  quantity: number
  allocationType: 'fifo' | 'manual'
  selectedLots?: { lot: Lot; quantity: number }[]
}

export interface LotAllocation {
  lot: Lot
  quantity: number
}
```

---

## 🔧 Constants Definitions

**파일 경로**: `src/constants/messages.ts` (기존 파일에 추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존 messages
  SHIPMENT: {
    CREATED: '출고가 완료되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존 messages
  SHIPMENT: {
    CREATE_FAILED: '출고 처리에 실패했습니다.',
  },
} as const
```

---

## 📁 Files Created/Modified

### 신규 파일

1. **src/pages/manufacturer/ShipmentPage.tsx** (~400 lines)
   - 출고 장바구니 UI
   - FIFO 자동 할당 알고리즘
   - 제품 추가/제거 기능

2. **src/types/shipment.ts** (~15 lines)
   - CartItem 타입
   - LotAllocation 타입

3. **supabase/migrations/XXX_create_decrement_inventory_function.sql** (~30 lines)
   - decrement_inventory 함수

### 수정 파일

1. **src/constants/messages.ts**
   - SUCCESS_MESSAGES.SHIPMENT 추가
   - ERROR_MESSAGES.SHIPMENT 추가

2. **src/App.tsx** (React Router 설정)
   - ShipmentPage 라우트 추가

---

## ✅ Test Requirements

### ShipmentPage 컴포넌트 테스트 (간략 버전)

```typescript
describe('ShipmentPage', () => {
  it('장바구니가 비어있을 때 메시지를 표시해야 한다', async () => {
    // Test implementation
  })

  it('제품을 장바구니에 추가할 수 있어야 한다', async () => {
    // Test implementation
  })

  it('FIFO 알고리즘이 오래된 Lot부터 할당해야 한다', async () => {
    // Test implementation
  })

  it('재고가 부족하면 에러를 표시해야 한다', async () => {
    // Test implementation
  })

  it('출고 완료 시 장바구니가 비워져야 한다', async () => {
    // Test implementation
  })
})
```

---

## 🔍 Troubleshooting

### 1. FIFO 할당 시 재고가 음수가 됨

**해결**: Database function에서 재고 검증 추가

### 2. 동시 출고 요청 시 race condition

**해결**: Database transaction 및 row-level locking 사용

---

## 🔄 Git Commit Message

```bash
feat(manufacturer): add shipment page with FIFO allocation

- Implement ShipmentPage with cart functionality
- Add FIFO (First In First Out) allocation algorithm
- Add product selection and quantity input
- Create decrement_inventory database function
- Add cart item management (add/remove)
- Add shipment creation with inventory update

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] ShipmentPage 컴포넌트 구현 완료
- [ ] FIFO 할당 알고리즘 동작 확인
- [ ] 장바구니 추가/제거 기능 동작 확인
- [ ] 출고 완료 처리 동작 확인
- [ ] decrement_inventory 함수 생성 확인
- [ ] 5개 테스트 시나리오 통과

---

## ⏭️ Next Steps

**다음 단계**: [Phase 3.6 - 재고 조회](phase-3.6-inventory.md)
