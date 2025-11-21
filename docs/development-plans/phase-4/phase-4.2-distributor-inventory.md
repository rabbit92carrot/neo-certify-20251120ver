# Phase 4.2: 유통사 재고 조회

## 📋 Overview

**Phase 4.2**는 유통사의 재고 조회 기능을 구현합니다. 제조사 재고 조회(Phase 3.6)와 유사하지만 유통사 관점에서 입고받은 Lot의 재고를 조회합니다.

---

## 📦 Work Content

### DistributorInventoryPage 컴포넌트

**파일 경로**: `src/pages/distributor/DistributorInventoryPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { differenceInDays, parseISO } from 'date-fns'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Inventory, Lot, Product } from '@/types/database'

interface InventoryWithDetails extends Inventory {
  lot: Lot & { product: Product }
}

const columnHelper = createColumnHelper<InventoryWithDetails>()

export function DistributorInventoryPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

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

  // Fetch distributor inventory
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['distributorInventory', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, lot:lots(*, product:products(*))')
        .eq('organization_id', userData!.organization_id)
        .gt('current_quantity', 0)
        .order('lot.expiry_date', { ascending: true })

      if (error) throw error
      return data as InventoryWithDetails[]
    },
    enabled: !!userData?.organization_id,
  })

  const columns = [
    columnHelper.accessor('lot.product.name', {
      header: '제품명',
    }),
    columnHelper.accessor('lot.lot_number', {
      header: 'Lot 번호',
      cell: (info) => <div className="font-mono text-sm">{info.getValue()}</div>,
    }),
    columnHelper.accessor('lot.expiry_date', {
      header: '사용기한',
      cell: (info) => {
        const daysUntilExpiry = differenceInDays(parseISO(info.getValue()), new Date())
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{info.getValue()}</span>
            {daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
              <Badge variant="destructive" className="text-xs">
                {daysUntilExpiry}일 남음
              </Badge>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor('current_quantity', {
      header: '현재 재고',
      cell: (info) => <div className="font-semibold">{info.getValue().toLocaleString()}개</div>,
    }),
  ]

  const table = useReactTable({
    data: inventory ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">재고를 불러오는 중...</div>
  }

  const totalQuantity = inventory?.reduce((sum, inv) => sum + inv.current_quantity, 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">재고 조회</h1>
        <p className="mt-1 text-sm text-gray-600">유통사 재고 현황을 조회합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">전체 재고</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}개</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
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
                    재고가 없습니다
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
feat(distributor): add distributor inventory page

- Implement DistributorInventoryPage with lot-level view
- Add expiry date warnings
- Sort by expiry date (FEFO - First Expired First Out)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 4.3 - 병원 출고](phase-4.3-hospital-shipment.md)
