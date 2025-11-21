# Phase 3.6: 재고 조회 (제품별/일자별)

## 📋 Overview

**Phase 3.6**은 제조사의 재고 조회 기능을 구현합니다. 제품별, Lot별로 현재 재고를 확인하고, 생산일, 사용기한, 재고 수량을 조회할 수 있습니다.

### 주요 목표

1. **재고 목록 조회**: 제품별, Lot별 재고 조회
2. **필터링**: 제품, 사용기한 임박 필터
3. **정렬 및 검색**: 컬럼별 정렬, 검색 기능
4. **재고 요약**: 전체 재고 통계

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

### InventoryPage 컴포넌트

**파일 경로**: `src/pages/manufacturer/InventoryPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Inventory, Lot, Product } from '@/types/database'

interface InventoryWithDetails extends Inventory {
  lot: Lot & { product: Product }
}

const columnHelper = createColumnHelper<InventoryWithDetails>()

export function InventoryPage() {
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

  // Fetch inventory
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, lot:lots(*, product:products(*))')
        .eq('organization_id', userData!.organization_id)
        .order('lot.production_date', { ascending: true })

      if (error) throw error
      return data as InventoryWithDetails[]
    },
    enabled: !!userData?.organization_id,
  })

  const columns = [
    columnHelper.accessor('lot.product.name', {
      header: '제품명',
      cell: (info) => <div className="font-medium">{info.getValue()}</div>,
    }),
    columnHelper.accessor('lot.lot_number', {
      header: 'Lot 번호',
      cell: (info) => <div className="font-mono text-sm">{info.getValue()}</div>,
    }),
    columnHelper.accessor('lot.production_date', {
      header: '생산일',
      cell: (info) => <div className="text-sm">{info.getValue()}</div>,
    }),
    columnHelper.accessor('lot.expiry_date', {
      header: '사용기한',
      cell: (info) => {
        const expiryDate = parseISO(info.getValue())
        const daysUntilExpiry = differenceInDays(expiryDate, new Date())

        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{info.getValue()}</span>
            {daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
              <Badge variant="destructive" className="text-xs">
                {daysUntilExpiry}일 남음
              </Badge>
            )}
            {daysUntilExpiry < 0 && (
              <Badge variant="destructive" className="text-xs">
                만료됨
              </Badge>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor('current_quantity', {
      header: '현재 재고',
      cell: (info) => (
        <div className="font-semibold">{info.getValue().toLocaleString()}개</div>
      ),
    }),
  ]

  const table = useReactTable({
    data: inventory ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">재고를 불러오는 중...</div>
  }

  const totalQuantity = inventory?.reduce((sum, inv) => sum + inv.current_quantity, 0) ?? 0
  const expiringCount = inventory?.filter((inv) => {
    const daysUntilExpiry = differenceInDays(parseISO(inv.lot.expiry_date), new Date())
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }).length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">재고 조회</h1>
        <p className="mt-1 text-sm text-gray-600">Lot별 재고 현황을 조회합니다</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">전체 재고</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}개</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lot 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory?.length ?? 0}개</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용기한 임박</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiringCount}개</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="제품명 또는 Lot 번호 검색..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          table.getColumn('lot.product.name')?.setFilterValue(e.target.value)
        }}
      />

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>재고 목록</CardTitle>
          <CardDescription>Lot별 재고 현황입니다</CardDescription>
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

## ✅ Test Requirements

```typescript
describe('InventoryPage', () => {
  it('재고 목록을 표시해야 한다', async () => {
    // Test implementation
  })

  it('사용기한 임박 Badge를 표시해야 한다', async () => {
    // Test implementation
  })

  it('재고 요약 통계를 표시해야 한다', async () => {
    // Test implementation
  })
})
```

---

## 🔄 Git Commit Message

```bash
feat(manufacturer): add inventory page with expiry alerts

- Implement InventoryPage with lot-level inventory view
- Add expiry date alerts (30 days warning)
- Add inventory summary statistics
- Add product/lot search filter

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 3.7 - 거래 이력 조회](phase-3.7-history.md)
