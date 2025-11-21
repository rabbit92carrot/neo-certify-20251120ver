# Phase 5.1: 병원 입고 관리

## 📋 Overview

**Phase 5.1**은 병원이 유통사로부터 제품을 입고받는 기능을 구현합니다. Phase 4.1(유통사 입고)과 유사한 패턴으로 Virtual Code 검증을 통해 입고 처리합니다.

---

## 📦 Work Content

### HospitalReceivingPage 컴포넌트

**파일 경로**: `src/pages/hospital/HospitalReceivingPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { SHIPMENT_STATUS } from '@/constants/status'
import type { Shipment, Lot, Product, Organization } from '@/types/database'

interface ShipmentWithDetails extends Shipment {
  lot: Lot & { product: Product }
  from_organization: Organization
}

export function HospitalReceivingPage() {
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

  // Fetch pending shipments (sent to this hospital)
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
      // Verify virtual code
      if (virtualCodeInput !== shipment.lot.virtual_code) {
        throw new Error('Virtual Code가 일치하지 않습니다.')
      }

      // Update shipment status
      await supabase
        .from('shipments')
        .update({
          status: SHIPMENT_STATUS.COMPLETED,
          received_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', shipment.id)

      // Create or update hospital inventory
      const { data: existingInventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('lot_id', shipment.lot_id)
        .eq('organization_id', userData!.organization_id)
        .maybeSingle()

      if (existingInventory) {
        await supabase
          .from('inventory')
          .update({
            current_quantity: existingInventory.current_quantity + shipment.quantity,
            last_updated_by: user!.id,
          })
          .eq('id', existingInventory.id)
      } else {
        await supabase.from('inventory').insert({
          lot_id: shipment.lot_id,
          organization_id: userData!.organization_id,
          current_quantity: shipment.quantity,
          last_updated_by: user!.id,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingShipments'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast({ title: SUCCESS_MESSAGES.RECEIVING.COMPLETED })
      setIsReceiveDialogOpen(false)
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

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">입고 대기 목록을 불러오는 중...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">입고 관리</h1>
        <p className="mt-1 text-sm text-gray-600">유통사로부터 발송된 제품을 입고 처리합니다</p>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>발송일</TableHead>
              <TableHead>유통사</TableHead>
              <TableHead>제품명</TableHead>
              <TableHead>Lot 번호</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingShipments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  입고 대기 중인 출고 내역이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              pendingShipments?.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell>{shipment.shipment_date}</TableCell>
                  <TableCell>{shipment.from_organization.name}</TableCell>
                  <TableCell>{shipment.lot.product.name}</TableCell>
                  <TableCell className="font-mono text-sm">{shipment.lot.lot_number}</TableCell>
                  <TableCell>{shipment.quantity.toLocaleString()}개</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedShipment(shipment)
                        setIsReceiveDialogOpen(true)
                      }}
                    >
                      입고 처리
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Receive Dialog - Similar to Phase 4.1 */}
      <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>입고 확인</DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Virtual Code *</label>
                <Input
                  placeholder="12자리 Virtual Code 입력"
                  value={virtualCodeInput}
                  onChange={(e) => setVirtualCodeInput(e.target.value)}
                  maxLength={12}
                  className="mt-1.5"
                />
              </div>
              <Button
                onClick={() => receiveShipmentMutation.mutate(selectedShipment)}
                disabled={virtualCodeInput.length !== 12}
                className="w-full"
              >
                입고 확인
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## 🔄 Git Commit Message

```bash
feat(hospital): add hospital receiving page

- Implement HospitalReceivingPage with virtual code verification
- Add pending shipments list from distributors
- Create/update hospital inventory on receiving

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 5.2 - 병원 재고 조회](phase-5.2-hospital-inventory.md)
