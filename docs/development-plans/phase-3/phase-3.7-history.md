# Phase 3.7: 거래 이력 조회

## 📋 Overview

**Phase 3.7**은 제조사의 거래 이력 조회 기능을 구현합니다. Lot 생산 이력, 출고 이력을 날짜별로 조회하고 필터링할 수 있습니다.

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

## 🔧 Required Constants

이 Phase에서 사용하는 모든 constants를 아래에 정의합니다.

### src/constants/transactions.ts (신규)
```typescript
export const TRANSACTION_TYPE = {
  PRODUCTION: 'production',
  SHIPMENT: 'shipment',
  ALL: 'all',
} as const

export const TRANSACTION_TYPE_LABELS = {
  production: '생산',
  shipment: '출고',
  all: '전체',
} as const
```

### src/constants/messages.ts
```typescript
export const TRANSACTION_MESSAGES = {
  NO_HISTORY: '거래 이력이 없습니다',
} as const
```

---

## 📦 Work Content

### TransactionHistoryPage 컴포넌트

**파일 경로**: `src/pages/manufacturer/TransactionHistoryPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Lot, Shipment, Product } from '@/types/database'

type TransactionType = 'production' | 'shipment'

interface Transaction {
  id: string
  type: TransactionType
  date: string
  lot: Lot & { product: Product }
  quantity: number
}

const columnHelper = createColumnHelper<Transaction>()

export function TransactionHistoryPage() {
  const { user } = useAuth()
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all')

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

  // Fetch lots (production records)
  const { data: lots } = useQuery({
    queryKey: ['lots', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lots')
        .select('*, product:products!inner(*)')
        .eq('product.organization_id', userData!.organization_id)
        .order('manufacture_date', { ascending: false })

      if (error) throw error
      return data as (Lot & { product: Product })[]
    },
    enabled: !!userData?.organization_id,
  })

  // Fetch shipments
  const { data: shipments } = useQuery({
    queryKey: ['shipments', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, lot:lots(*, product:products(*))')
        .eq('from_organization_id', userData!.organization_id)
        .order('shipment_date', { ascending: false })

      if (error) throw error
      return data as (Shipment & { lot: Lot & { product: Product } })[]
    },
    enabled: !!userData?.organization_id,
  })

  // Combine transactions
  const transactions: Transaction[] = [
    ...(lots?.map((lot) => ({
      id: lot.id,
      type: 'production' as TransactionType,
      date: lot.manufacture_date,
      lot,
      quantity: lot.quantity,
    })) ?? []),
    ...(shipments?.map((shipment) => ({
      id: shipment.id,
      type: 'shipment' as TransactionType,
      date: shipment.shipment_date,
      lot: shipment.lot,
      quantity: shipment.quantity,
    })) ?? []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filteredTransactions =
    typeFilter === 'all'
      ? transactions
      : transactions.filter((t) => t.type === typeFilter)

  const columns = [
    columnHelper.accessor('date', {
      header: '날짜',
      cell: (info) => <div className="font-medium">{info.getValue()}</div>,
    }),
    columnHelper.accessor('type', {
      header: '유형',
      cell: (info) => (
        <Badge variant={info.getValue() === 'production' ? 'default' : 'secondary'}>
          {info.getValue() === 'production' ? '생산' : '출고'}
        </Badge>
      ),
    }),
    columnHelper.accessor('lot.product.name', {
      header: '제품명',
      cell: (info) => <div>{info.getValue()}</div>,
    }),
    columnHelper.accessor('lot.lot_number', {
      header: 'Lot 번호',
      cell: (info) => <div className="font-mono text-sm">{info.getValue()}</div>,
    }),
    columnHelper.accessor('quantity', {
      header: '수량',
      cell: (info) => <div className="font-semibold">{info.getValue().toLocaleString()}개</div>,
    }),
  ]

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">거래 이력</h1>
        <p className="mt-1 text-sm text-gray-600">
          생산 및 출고 이력을 조회합니다
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="production">생산</SelectItem>
            <SelectItem value="shipment">출고</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>이력 목록</CardTitle>
          <CardDescription>생산 및 출고 내역입니다</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    거래 이력이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 🔄 Git Commit Message

```bash
feat(manufacturer): add transaction history page

- Implement TransactionHistoryPage with production/shipment records
- Add type filter (production/shipment/all)
- Combine lots and shipments into unified transaction view
- Sort by date descending

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 3.8 - 통합 테스트](phase-3.8-integration-tests.md)
