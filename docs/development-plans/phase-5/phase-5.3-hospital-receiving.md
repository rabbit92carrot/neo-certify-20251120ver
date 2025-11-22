# Phase 5.3: 병원 입고 이력 조회

## 📋 Overview

**Phase 5.3**은 병원이 과거 입고 내역을 조회하는 기능을 구현합니다.

**PRD 참조**: PRD Section 5.3에 따라 병원은 유통사/제조사로부터 출고 시 **즉시 소유권이 이전**되며 (Pending 없음), 입고 수락 액션이 필요하지 않습니다. 따라서 이 화면은 **읽기 전용**으로 과거 입고 내역만 조회합니다.

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

### HospitalReceivingHistoryPage 컴포넌트

**파일 경로**: `src/pages/hospital/HospitalReceivingHistoryPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SHIPMENT_STATUS } from '@/constants/status'
import type { Shipment, Lot, Product, Organization } from '@/types/database'

interface ShipmentWithDetails extends Shipment {
  lot: Lot & { product: Product }
  from_organization: Organization
}

export function HospitalReceivingHistoryPage() {
  const { user } = useAuth()
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | '90d' | '1y'>('30d')

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

  // Fetch completed shipments (received by this hospital)
  const { data: receivedShipments, isLoading } = useQuery({
    queryKey: ['receivedShipments', userData?.organization_id, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select(`
          *,
          lot:lots(*, product:products(*)),
          from_organization:organizations!shipments_from_organization_id_fkey(*)
        `)
        .eq('to_organization_id', userData!.organization_id)
        .eq('status', SHIPMENT_STATUS.COMPLETED) // 완료된 입고만 조회
        .order('received_date', { ascending: false })

      // Date filter
      if (dateFilter !== 'all') {
        const daysMap = {
          '30d': VALIDATION.DATE_FILTER.DAYS_30,
          '90d': VALIDATION.DATE_FILTER.DAYS_90,
          '1y': VALIDATION.DATE_FILTER.DAYS_YEAR
        }
        const days = daysMap[dateFilter]
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        query = query.gte('received_date', format(startDate, 'yyyy-MM-dd'))
      }

      const { data, error } = await query

      if (error) throw error
      return data as ShipmentWithDetails[]
    },
    enabled: !!userData?.organization_id,
  })

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">입고 이력을 불러오는 중...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">입고 이력 조회</h1>
          <p className="mt-1 text-sm text-gray-600">
            유통사/제조사로부터 입고된 제품 내역을 조회합니다 (읽기 전용)
          </p>
        </div>

        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">최근 30일</SelectItem>
            <SelectItem value="90d">최근 90일</SelectItem>
            <SelectItem value="1y">최근 1년</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>입고일</TableHead>
              <TableHead>발송일</TableHead>
              <TableHead>발송자</TableHead>
              <TableHead>제품명</TableHead>
              <TableHead>Lot 번호</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivedShipments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                  입고 내역이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              receivedShipments?.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-medium">
                    {shipment.received_date || '-'}
                  </TableCell>
                  <TableCell>{shipment.shipment_date}</TableCell>
                  <TableCell>{shipment.from_organization.name}</TableCell>
                  <TableCell>{shipment.lot.product.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {shipment.lot.lot_number}
                  </TableCell>
                  <TableCell>{shipment.quantity.toLocaleString()}개</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      입고 완료
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {receivedShipments && receivedShipments.length > 0 && (
        <div className="text-sm text-gray-500">
          총 {receivedShipments.length}건의 입고 내역
        </div>
      )}
    </div>
  )
}
```

---

## 🔄 Git Commit Message

```bash
feat(hospital): add receiving history page

- Implement HospitalReceivingHistoryPage for read-only history
- Add date filter (30d/90d/1y/all)
- Display completed shipments from distributors/manufacturers
- PRD Section 5.3: Hospital receiving is immediate (no pending)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 5.4 - 병원 재고 조회](phase-5.4-hospital-inventory.md)
