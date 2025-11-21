# Phase 4.5: 거래 이력 조회

## 📋 Overview

**Phase 4.5**는 유통사의 거래 이력 조회 기능을 구현합니다. 입고, 출고, 반품 이력을 통합하여 조회합니다.

---

## 📦 Work Content

### DistributorHistoryPage 컴포넌트

**파일 경로**: `src/pages/distributor/DistributorHistoryPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

type TransactionType = 'receiving' | 'shipment' | 'return'

interface Transaction {
  id: string
  type: TransactionType
  date: string
  lotNumber: string
  productName: string
  quantity: number
  counterparty: string
}

export function DistributorHistoryPage() {
  const { user } = useAuth()
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')

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

  // Fetch receivings (incoming shipments)
  const { data: receivings } = useQuery({
    queryKey: ['receivings', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          lot:lots(lot_number, product:products(name)),
          from_organization:organizations!shipments_from_organization_id_fkey(name)
        `)
        .eq('to_organization_id', userData!.organization_id)
        .eq('status', 'completed')
        .order('received_date', { ascending: false })

      if (error) throw error
      return data.map((s: any) => ({
        id: s.id,
        type: 'receiving' as TransactionType,
        date: s.received_date,
        lotNumber: s.lot.lot_number,
        productName: s.lot.product.name,
        quantity: s.quantity,
        counterparty: s.from_organization.name,
      }))
    },
    enabled: !!userData?.organization_id,
  })

  // Fetch shipments (outgoing)
  const { data: shipments } = useQuery({
    queryKey: ['shipments', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          lot:lots(lot_number, product:products(name)),
          to_organization:organizations!shipments_to_organization_id_fkey(name)
        `)
        .eq('from_organization_id', userData!.organization_id)
        .order('shipment_date', { ascending: false })

      if (error) throw error
      return data.map((s: any) => ({
        id: s.id,
        type: 'shipment' as TransactionType,
        date: s.shipment_date,
        lotNumber: s.lot.lot_number,
        productName: s.lot.product.name,
        quantity: s.quantity,
        counterparty: s.to_organization?.name ?? '-',
      }))
    },
    enabled: !!userData?.organization_id,
  })

  // Fetch returns
  const { data: returns } = useQuery({
    queryKey: ['returns', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('returns')
        .select('*, lot:lots(lot_number, product:products(name))')
        .eq('organization_id', userData!.organization_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data.map((r: any) => ({
        id: r.id,
        type: 'return' as TransactionType,
        date: r.created_at.split('T')[0],
        lotNumber: r.lot.lot_number,
        productName: r.lot.product.name,
        quantity: r.quantity,
        counterparty: '반품',
      }))
    },
    enabled: !!userData?.organization_id,
  })

  const allTransactions: Transaction[] = [
    ...(receivings ?? []),
    ...(shipments ?? []),
    ...(returns ?? []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filteredTransactions =
    typeFilter === 'all' ? allTransactions : allTransactions.filter((t) => t.type === typeFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">거래 이력</h1>
        <p className="mt-1 text-sm text-gray-600">입고, 출고, 반품 이력을 조회합니다</p>
      </div>

      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | 'all')}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="receiving">입고</SelectItem>
          <SelectItem value="shipment">출고</SelectItem>
          <SelectItem value="return">반품</SelectItem>
        </SelectContent>
      </Select>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>제품명</TableHead>
              <TableHead>Lot 번호</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>거래처</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  거래 이력이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell>{txn.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        txn.type === 'receiving'
                          ? 'default'
                          : txn.type === 'shipment'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {txn.type === 'receiving' ? '입고' : txn.type === 'shipment' ? '출고' : '반품'}
                    </Badge>
                  </TableCell>
                  <TableCell>{txn.productName}</TableCell>
                  <TableCell className="font-mono text-sm">{txn.lotNumber}</TableCell>
                  <TableCell>{txn.quantity.toLocaleString()}개</TableCell>
                  <TableCell>{txn.counterparty}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
```

---

## 🔄 Git Commit Message

```bash
feat(distributor): add distributor history page

- Implement DistributorHistoryPage with receiving/shipment/return records
- Add type filter (receiving/shipment/return/all)
- Combine all transaction types into unified view

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 4.6 - 통합 테스트](phase-4.6-integration-tests.md)
