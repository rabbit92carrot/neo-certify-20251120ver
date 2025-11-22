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
   * FIFO 할당 알고리즘 (PRD Section 15.1)
   *
   * Phase 1.3 아키텍처 기반:
   * - 1 Lot = N Virtual Codes (virtual_codes 테이블)
   * - Virtual Code 단위 할당 (Lot 단위 아님)
   *
   * 정렬 우선순위:
   * 1차: lots.manufacture_date ASC (제조일이 빠른 Lot 우선)
   * 2차: lots.expiry_date ASC (사용기한이 가까운 Lot 우선)
   * 3차: virtual_codes.sequence_number ASC (⭐ Lot 내부 순서, Phase 1.3)
   *      - create_lot_with_virtual_codes() 함수에서 1~quantity 할당
   *      - UUID v4 사용 시 sequence_number로 명시적 순서 보장
   * 4차: lots.created_at ASC (Lot 생성일)
   *
   * 데이터베이스 쿼리 예시:
   * ```sql
   * SELECT vc.*
   * FROM virtual_codes vc
   * JOIN lots l ON vc.lot_id = l.id
   * WHERE l.product_id = $1
   *   AND vc.status = 'IN_STOCK'
   *   AND vc.owner_id = $2
   * ORDER BY
   *   l.manufacture_date ASC,
   *   l.expiry_date ASC,
   *   vc.sequence_number ASC,  -- ⭐ 명시적 순서
   *   l.created_at ASC
   * LIMIT $3
   * ```
   *
   * @param productId - 제품 ID
   * @param requestedQty - 요청 수량
   * @returns 할당된 Virtual Code 목록 (FIFO 정렬 순서)
   * @throws 재고가 없거나 부족한 경우 에러
   */
  // 타입 정의 추가 (any 타입 제거)
  interface InventoryItem {
    lot: {
      product_id: string;
      // 다른 lot 필드들...
    };
    current_quantity: number;
    // 다른 inventory 필드들...
  }

  const allocateFIFO = (productId: string, requestedQty: number) => {
    // 1. 해당 제품의 재고만 필터링 (타입 안전)
    const productInventory = productsWithInventory?.filter(
      (inv: InventoryItem) => inv.lot.product_id === productId
    )

    if (!productInventory || productInventory.length === 0) {
      throw new Error(ERROR_MESSAGES.INVENTORY.NO_STOCK)
    }

    // 2. 총 가용 재고 확인 (타입 안전)
    const totalAvailable = productInventory.reduce(
      (sum: number, inv: InventoryItem) => sum + inv.current_quantity,
      0
    )

    if (totalAvailable < requestedQty) {
      throw new Error(ERROR_MESSAGES.INVENTORY.INSUFFICIENT_STOCK(requestedQty, totalAvailable))
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
      if (cart.length === 0) throw new Error(ERROR_MESSAGES.SHIPMENT.CART_EMPTY)
      if (!selectedTargetId) throw new Error(ERROR_MESSAGES.VALIDATION.TARGET_REQUIRED(targetType))

      /**
       * Phase 1.3 아키텍처:
       * - shipments 테이블: lot_id, quantity 컬럼 없음
       * - shipment_details 테이블: virtual_code_id 목록 (N개 레코드)
       */

      for (const item of cart) {
        /**
         * 1. FIFO로 Virtual Code 선택
         *
         * ⚠️ 중요: Supabase 클라이언트는 JOIN 쿼리에서 복잡한 정렬을 지원하지 않음
         * 따라서 RPC 함수 또는 두 단계 조회 필요
         *
         * 옵션 A: RPC 함수 사용 (권장)
         * ```typescript
         * const { data: virtualCodes } = await supabase.rpc('get_fifo_virtual_codes', {
         *   p_product_id: item.product.id,
         *   p_owner_id: userData!.organization_id,
         *   p_quantity: item.quantity
         * })
         * ```
         *
         * 옵션 B: 두 단계 조회 (현재 구현)
         * - 1단계: allocateFIFO()로 Lot 목록 결정 (이미 FIFO 정렬됨)
         * - 2단계: 각 Lot에서 sequence_number 순으로 Virtual Code 선택
         */
        const { data: virtualCodes, error: vcError } = await supabase
          .from('virtual_codes')
          .select('id, lot_id, sequence_number')
          .eq('owner_id', userData!.organization_id)
          .eq('owner_type', 'organization')
          .eq('status', 'IN_STOCK')
          .in('lot_id', item.selectedLots.map(l => l.lot.id))
          .order('sequence_number', { ascending: true })
          .limit(item.quantity)

        if (vcError) throw vcError
        if (!virtualCodes || virtualCodes.length < item.quantity) {
          throw new Error(ERROR_MESSAGES.INVENTORY.INSUFFICIENT_VIRTUAL_CODES)
        }

        // 2. Create Shipment
        // PRD Section 5.3: Hospital shipments have immediate ownership transfer (COMPLETED status)
        // PRD Section 5.1: Distributor-to-distributor uses PENDING workflow
        const { data: shipment, error: shipmentError } = await supabase
          .from('shipments')
          .insert({
            from_organization_id: userData!.organization_id,
            to_organization_id: selectedTargetId,
            shipment_date: format(new Date(), 'yyyy-MM-dd'),
            received_date: targetType === 'HOSPITAL' ? format(new Date(), 'yyyy-MM-dd') : null, // 병원은 즉시
            status: targetType === 'HOSPITAL' ? SHIPMENT_STATUS.COMPLETED : SHIPMENT_STATUS.PENDING, // ✅ PRD compliant
          })
          .select()
          .single()

        if (shipmentError) throw shipmentError

        // 3. Create ShipmentDetails (N개)
        const shipmentDetails = virtualCodes.map(vc => ({
          shipment_id: shipment.id,
          virtual_code_id: vc.id,
        }))

        const { error: detailsError } = await supabase
          .from('shipment_details')
          .insert(shipmentDetails)

        if (detailsError) throw detailsError

        // 4. Update Virtual Code status (Phase 1.3 shipment_transaction 함수 사용)
        const { error: rpcError } = await supabase.rpc('shipment_transaction', {
          p_virtual_code_ids: virtualCodes.map(vc => vc.id),
          p_from_org_id: userData!.organization_id,
          p_to_org_id: selectedTargetId,
          p_to_org_type: targetType, // 'HOSPITAL' | 'DISTRIBUTOR'
        })

        if (rpcError) throw rpcError

        // 5. History 기록
        const historyRecords = virtualCodes.map(vc => ({
          virtual_code_id: vc.id,
          action_type: 'SHIPMENT',
          from_owner_type: 'organization',
          from_owner_id: userData!.organization_id,
          to_owner_type: 'organization',
          to_owner_id: selectedTargetId,
        }))

        const { error: historyError } = await supabase
          .from('history')
          .insert(historyRecords)

        if (historyError) throw historyError
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
            <SelectValue placeholder={TERMINOLOGY.PLACEHOLDERS.SELECT_TARGET(targetType)} />
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

## 📝 PostgreSQL RPC Function for FIFO (Optional Enhancement)

### get_fifo_virtual_codes 함수

**설명**: Virtual Code 선택 시 완전한 FIFO 정렬을 보장하는 RPC 함수

**파일 위치**: `supabase/migrations/xxx_get_fifo_virtual_codes.sql`

```sql
CREATE OR REPLACE FUNCTION get_fifo_virtual_codes(
  p_product_id UUID,
  p_owner_id UUID,
  p_quantity INTEGER
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  lot_id UUID,
  sequence_number INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id,
    vc.code,
    vc.lot_id,
    vc.sequence_number
  FROM virtual_codes vc
  JOIN lots l ON vc.lot_id = l.id
  WHERE
    l.product_id = p_product_id
    AND vc.owner_id = p_owner_id
    AND vc.owner_type = 'organization'
    AND vc.status = 'IN_STOCK'
  ORDER BY
    l.manufacture_date ASC,      -- 1차: 제조일 빠른 순
    l.expiry_date ASC,            -- 2차: 사용기한 가까운 순
    vc.sequence_number ASC,       -- 3차: Lot 내부 순서
    l.created_at ASC              -- 4차: Lot 생성일
  LIMIT p_quantity;
END;
$$;

-- 사용 예시 (TypeScript)
/*
const { data: virtualCodes, error } = await supabase.rpc('get_fifo_virtual_codes', {
  p_product_id: 'uuid-here',
  p_owner_id: userData.organization_id,
  p_quantity: 10
})

if (error) throw error

// virtualCodes는 이미 완전한 FIFO 순서로 정렬되어 있음
console.log(virtualCodes) // [{ id, code, lot_id, sequence_number }, ...]
*/
```

**장점**:
- ✅ 데이터베이스 레벨에서 완전한 FIFO 정렬 보장
- ✅ 클라이언트 측 로직 단순화 (두 단계 조회 불필요)
- ✅ 성능 향상 (단일 쿼리로 처리)
- ✅ 복잡한 JOIN + ORDER BY 조합 지원

**단점**:
- ⚠️ Supabase 마이그레이션 관리 필요
- ⚠️ RPC 함수 버전 관리 복잡도 증가

---

## 🔍 FIFO 알고리즘 상세 명세 (PRD Section 15.1)

### 핵심 원칙

**PRD 요구사항**:
- 기본적으로 모든 출고는 FIFO(First In First Out) 방식
- 제조사만 예외적으로 특정 Lot 선택 가능
- 유통사/병원은 반드시 FIFO 적용

### FIFO 정렬 규칙 (4단계)

**src/constants/business-logic.ts**:
```typescript
export const FIFO_SORT = {
  PRIMARY: {
    FIELD: 'manufacture_date',  // 1차: 제조일 (오래된 것 우선)
    ORDER: 'ASC'
  },
  SECONDARY: {
    FIELD: 'expiry_date',      // 2차: 유효기간 (만료 임박 우선)
    ORDER: 'ASC'
  },
  TERTIARY: {
    FIELD: 'sequence_number',  // 3차: Lot 내 시퀀스 번호
    ORDER: 'ASC'
  },
  FALLBACK: {
    FIELD: 'created_at',       // 4차: 시스템 등록 시간
    ORDER: 'ASC'
  },
} as const
```

### 구현 방식 비교

#### Option A: PostgreSQL RPC 함수 (권장)
```sql
-- 데이터베이스 레벨에서 FIFO 정렬 보장
ORDER BY
  l.manufacture_date ASC,
  l.expiry_date ASC,
  vc.sequence_number ASC,
  vc.created_at ASC
```

**장점**:
- ✅ 데이터베이스 레벨에서 완전한 FIFO 보장
- ✅ 성능 최적화 (인덱스 활용)
- ✅ 일관성 보장

**단점**:
- ⚠️ RPC 함수 관리 복잡도

#### Option B: Application 레벨 정렬
```typescript
// TypeScript에서 정렬
const sortedCodes = virtualCodes.sort((a, b) => {
  // 1차: manufacture_date
  if (a.lot.manufacture_date !== b.lot.manufacture_date) {
    return new Date(a.lot.manufacture_date).getTime() -
           new Date(b.lot.manufacture_date).getTime()
  }
  // 2차: expiry_date
  if (a.lot.expiry_date !== b.lot.expiry_date) {
    return new Date(a.lot.expiry_date).getTime() -
           new Date(b.lot.expiry_date).getTime()
  }
  // 3차: sequence_number
  if (a.sequence_number !== b.sequence_number) {
    return a.sequence_number - b.sequence_number
  }
  // 4차: created_at
  return new Date(a.created_at).getTime() -
         new Date(b.created_at).getTime()
})
```

**장점**:
- ✅ 구현 간단
- ✅ 디버깅 용이

**단점**:
- ⚠️ 성능 이슈 (대량 데이터)
- ⚠️ 메모리 사용량 증가

### 예외 사항: 제조사 Lot 선택

**PRD Section 15.1**: "제조사는 FIFO 외에 특정 Lot 선택 가능"

```typescript
// 제조사용 출고 옵션
interface ShipmentOptions {
  method: 'FIFO' | 'LOT_SELECT'  // 제조사만 LOT_SELECT 가능
  selectedLotId?: string          // LOT_SELECT 시 필수
}

// 역할별 권한 체크
const canSelectLot = (userRole: string) => {
  return userRole === 'MANUFACTURER'
}
```

### 테스트 시나리오

```typescript
describe('FIFO Algorithm', () => {
  it('should prioritize by manufacture_date first', () => {
    // 제조일 기준 정렬 검증
  })

  it('should prioritize by expiry_date when manufacture_date is same', () => {
    // 유효기간 기준 정렬 검증
  })

  it('should use sequence_number for same lot', () => {
    // 시퀀스 번호 정렬 검증
  })

  it('should prevent non-manufacturers from lot selection', () => {
    // 유통사/병원 Lot 선택 차단 검증
  })
})
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
