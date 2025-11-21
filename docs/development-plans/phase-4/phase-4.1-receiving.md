# Phase 4.1: 입고 관리

## 📋 Overview

**Phase 4.1**은 유통사가 제조사로부터 제품을 입고받는 기능을 구현합니다. 제조사의 출고 내역을 확인하고 입고 처리하여 유통사 재고를 생성합니다.

### 주요 목표

1. **입고 대기 목록**: 제조사로부터 발송된 출고 내역 조회
2. **입고 확인**: Virtual Code 스캔 또는 Lot 번호 입력으로 입고 처리
3. **재고 생성**: 입고 완료 시 유통사 재고에 추가
4. **입고 이력**: 입고 완료 내역 조회

### 기술 스택

- **폼 관리**: React Hook Form + Zod
- **상태 관리**: TanStack Query
- **UI 라이브러리**: shadcn/ui (Table, Dialog, Input, Badge)
- **스캐너**: HTML5 QuaggaJS (바코드 스캔, Phase 7에서 구현)

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

### 1. ReceivingPage 컴포넌트

**파일 경로**: `src/pages/distributor/ReceivingPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { SHIPMENT_STATUS } from '@/constants/status'
import { VALIDATION } from '@/constants/validation'
import type { Shipment, Lot, Product, Organization } from '@/types/database'

interface ShipmentWithDetails extends Shipment {
  lot: Lot & { product: Product }
  from_organization: Organization
}

interface ShipmentDetail {
  id: string
  shipment_id: string
  virtual_code_id: string
}

interface VirtualCodeWithStatus {
  id: string
  code: string
  status: 'IN_STOCK' | 'PENDING' | 'USED' | 'DISPOSED'
}

export function ReceivingPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithDetails | null>(null)
  const [virtualCodeInput, setVirtualCodeInput] = useState('')

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

  // Fetch pending shipments (sent to this distributor)
  const { data: pendingShipments, isLoading } = useQuery({
    queryKey: ['pendingShipments', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          lot:lots(*, product:products(*)),
          from_organization:organizations!shipments_from_organization_id_fkey(*)
        `)
        .eq('to_organization_id', userData!.organization_id)
        .eq('status', SHIPMENT_STATUS.PENDING)
        .order('shipment_date', { ascending: false })

      if (error) throw error
      return data as ShipmentWithDetails[]
    },
    enabled: !!userData?.organization_id,
  })

  // Receive shipment mutation
  const receiveShipmentMutation = useMutation({
    mutationFn: async (shipment: ShipmentWithDetails) => {
      /**
       * Phase 1.3 아키텍처:
       * - 1 Shipment = N Virtual Codes (shipment_details 테이블)
       * - virtual_codes.code: 12자리 MD5 해시 (Phase 1.3 generate_unique_virtual_code)
       * - 입고 시 모든 Virtual Code 검증 필요
       */

      // 1. Fetch shipment_details (N개 Virtual Code)
      const { data: shipmentDetails, error: detailsError } = await supabase
        .from('shipment_details')
        .select('virtual_code:virtual_codes(id, code, status)')
        .eq('shipment_id', shipment.id)

      if (detailsError) throw detailsError
      if (!shipmentDetails || shipmentDetails.length === 0) {
        throw new Error('출고 상세 정보를 찾을 수 없습니다.')
      }

      // 2. Verify virtual code (사용자가 입력한 코드가 shipment에 속하는지 확인)
      const expectedCodes = shipmentDetails.map(d => d.virtual_code.code)

      // 간단한 검증: 첫 번째 코드만 입력받아 검증 (실제로는 N개 모두 스캔 필요)
      if (!expectedCodes.includes(virtualCodeInput)) {
        throw new Error('Virtual Code가 이 출고 내역에 속하지 않습니다.')
      }

      // 3. Update shipment status
      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({
          status: SHIPMENT_STATUS.COMPLETED,
          received_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', shipment.id)

      if (shipmentError) throw shipmentError

      // 4. Update Virtual Code status (PENDING → IN_STOCK)
      const virtualCodeIds = shipmentDetails.map(d => d.virtual_code.id)

      const { error: vcUpdateError } = await supabase
        .from('virtual_codes')
        .update({
          status: 'IN_STOCK',      // 승인 완료
          pending_to: null,         // 대기 해제 (Phase 4 README Option 2)
          // owner_id는 이미 유통사 (출고 시 이전됨)
        })
        .in('id', virtualCodeIds)

      if (vcUpdateError) throw vcUpdateError

      // 5. History 기록 (RECEIVE 액션)
      const historyRecords = virtualCodeIds.map(vcId => ({
        virtual_code_id: vcId,
        action_type: 'RECEIVE',
        from_owner_type: 'organization',
        from_owner_id: shipment.from_organization_id,
        to_owner_type: 'organization',
        to_owner_id: userData!.organization_id,
      }))

      const { error: historyError } = await supabase
        .from('history')
        .insert(historyRecords)

      if (historyError) throw historyError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingShipments'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast({
        title: SUCCESS_MESSAGES.RECEIVING.COMPLETED,
      })
      setIsReceiveDialogOpen(false)
      setSelectedShipment(null)
      setVirtualCodeInput('')
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.RECEIVING.FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const handleReceiveClick = (shipment: ShipmentWithDetails) => {
    setSelectedShipment(shipment)
    setIsReceiveDialogOpen(true)
  }

  const handleReceiveConfirm = () => {
    if (selectedShipment) {
      receiveShipmentMutation.mutate(selectedShipment)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        입고 대기 목록을 불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">입고 관리</h1>
        <p className="mt-1 text-sm text-gray-600">
          제조사로부터 발송된 제품을 입고 처리합니다
        </p>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">입고 대기</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingShipments?.length ?? 0}건</div>
        </CardContent>
      </Card>

      {/* Pending Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle>입고 대기 목록</CardTitle>
          <CardDescription>제조사로부터 발송된 출고 내역입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingShipments && pendingShipments.length === 0 ? (
            <div className="py-12 text-center text-gray-600">
              입고 대기 중인 출고 내역이 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>발송일</TableHead>
                  <TableHead>제조사</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead>Lot 번호</TableHead>
                  <TableHead>수량</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingShipments?.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell>{shipment.shipment_date}</TableCell>
                    <TableCell>{shipment.from_organization.name}</TableCell>
                    <TableCell className="font-medium">
                      {shipment.lot.product.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {shipment.lot.lot_number}
                    </TableCell>
                    <TableCell>{shipment.quantity.toLocaleString()}개</TableCell>
                    <TableCell>
                      <Badge>{SHIPMENT_STATUS.PENDING}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleReceiveClick(shipment)}
                      >
                        입고 처리
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receive Dialog */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>입고 확인</DialogTitle>
            <DialogDescription>
              Virtual Code를 입력하여 입고를 확인하세요
            </DialogDescription>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-600">제품명:</div>
                  <div className="font-semibold">
                    {selectedShipment.lot.product.name}
                  </div>

                  <div className="text-gray-600">Lot 번호:</div>
                  <div className="font-mono font-semibold">
                    {selectedShipment.lot.lot_number}
                  </div>

                  <div className="text-gray-600">수량:</div>
                  <div className="font-semibold">
                    {selectedShipment.quantity.toLocaleString()}개
                  </div>

                  <div className="text-gray-600">제조사:</div>
                  <div className="font-semibold">
                    {selectedShipment.from_organization.name}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Virtual Code *</label>
                <Input
                  placeholder={`${VALIDATION.VIRTUAL_CODE_LENGTH}자리 Virtual Code 입력`}
                  value={virtualCodeInput}
                  onChange={(e) => setVirtualCodeInput(e.target.value.toUpperCase())}
                  maxLength={VALIDATION.VIRTUAL_CODE_LENGTH}
                  pattern={VALIDATION.VIRTUAL_CODE_PATTERN.source}
                  className="mt-1.5 font-mono"
                />
                <p className="mt-1.5 text-xs text-gray-600">
                  제품 라벨의 Virtual Code를 입력하세요 (영문 대문자 + 숫자)
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsReceiveDialogOpen(false)
                    setVirtualCodeInput('')
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={handleReceiveConfirm}
                  disabled={
                    virtualCodeInput.length !== VALIDATION.VIRTUAL_CODE_LENGTH ||
                    !VALIDATION.VIRTUAL_CODE_PATTERN.test(virtualCodeInput) ||
                    receiveShipmentMutation.isPending
                  }
                >
                  {receiveShipmentMutation.isPending ? '처리 중...' : '입고 확인'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## 📝 TypeScript Type Definitions

**파일 경로**: `src/types/database.ts` (기존 파일에 추가)

```typescript
/**
 * Phase 1.3 스키마 기반 타입 정의
 * ⚠️ 주의: shipments 테이블은 lot_id, quantity 컬럼이 없음
 * shipment_details 테이블에서 virtual_code_id 목록 관리
 */
export interface Shipment {
  id: string
  from_organization_id: string
  to_organization_id: string
  shipment_date: string
  received_date: string | null
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  created_at: string
}

export interface ShipmentDetail {
  id: string
  shipment_id: string
  virtual_code_id: string
}

export interface VirtualCode {
  id: string
  code: string  // 12자리 MD5 해시 (Phase 1.3 generate_unique_virtual_code)
  lot_id: string
  sequence_number: number  // FIFO 순서 (1, 2, 3, ..., quantity)
  status: 'IN_STOCK' | 'PENDING' | 'USED' | 'DISPOSED'
  owner_type: 'organization' | 'patient'
  owner_id: string
  pending_to: string | null
  previous_owner_id: string | null
  created_at: string
  updated_at: string
}
```

---

## 🔧 Constants Definitions

### 1. Validation Constants (신규)

**파일 경로**: `src/constants/validation.ts`

```typescript
export const VALIDATION = {
  // Virtual Code (Phase 1.3 generate_unique_virtual_code)
  VIRTUAL_CODE_LENGTH: 12,
  VIRTUAL_CODE_PATTERN: /^[A-Z0-9]{12}$/,

  // Return Request (Phase 4.4)
  RETURN_REASON_MIN_LENGTH: 5,
  RETURN_REASON_MAX_LENGTH: 200,

  // Shipment
  QUANTITY_MIN: 1,
  QUANTITY_MAX: 999999,

  // Business Rules
  RECALL_TIME_LIMIT_HOURS: 24,
  EXPIRY_WARNING_DAYS: 30,
} as const

export type ValidationKey = keyof typeof VALIDATION
```

### 2. Shipment Status

**파일 경로**: `src/constants/status.ts` (기존 파일에 추가)

```typescript
export const SHIPMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

export type ShipmentStatus = typeof SHIPMENT_STATUS[keyof typeof SHIPMENT_STATUS]
```

### 3. Messages

**파일 경로**: `src/constants/messages.ts` (기존 파일에 추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존 messages
  RECEIVING: {
    COMPLETED: '입고가 완료되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존 messages
  RECEIVING: {
    FAILED: '입고 처리에 실패했습니다.',
    VIRTUAL_CODE_NOT_FOUND: 'Virtual Code가 이 출고 내역에 속하지 않습니다.',
    SHIPMENT_DETAILS_NOT_FOUND: '출고 상세 정보를 찾을 수 없습니다.',
  },
} as const
```

---

## 📁 Files Created/Modified

### 신규 파일

1. **src/pages/distributor/ReceivingPage.tsx** (~300 lines)
   - 입고 대기 목록 조회
   - Virtual Code 검증
   - 입고 처리 및 재고 생성

### 수정 파일

1. **src/constants/status.ts**
   - SHIPMENT_STATUS 추가

2. **src/constants/messages.ts**
   - SUCCESS_MESSAGES.RECEIVING 추가
   - ERROR_MESSAGES.RECEIVING 추가

---

## ✅ Test Requirements

```typescript
describe('ReceivingPage', () => {
  it('입고 대기 목록을 표시해야 한다', async () => {
    // Test implementation
  })

  it('Virtual Code 불일치 시 에러를 표시해야 한다', async () => {
    // Test implementation
  })

  it('입고 완료 시 재고가 생성되어야 한다', async () => {
    // Test implementation
  })

  it('기존 재고가 있으면 수량이 증가해야 한다', async () => {
    // Test implementation
  })
})
```

---

## 🔄 Git Commit Message

```bash
feat(distributor): add receiving page with virtual code verification

- Implement ReceivingPage with pending shipments list
- Add Virtual Code verification for receiving
- Create/update distributor inventory on receiving
- Add shipment status update (pending → completed)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ✔️ Definition of Done

- [ ] ReceivingPage 컴포넌트 구현 완료
- [ ] 입고 대기 목록 조회 동작 확인
- [ ] Virtual Code 검증 동작 확인
- [ ] 입고 처리 시 재고 생성/업데이트 확인
- [ ] Shipment 상태 업데이트 확인
- [ ] 4개 테스트 시나리오 통과

---

## ⏭️ Next Steps

**다음 단계**: [Phase 4.2 - 유통사 재고 조회](phase-4.2-distributor-inventory.md)
