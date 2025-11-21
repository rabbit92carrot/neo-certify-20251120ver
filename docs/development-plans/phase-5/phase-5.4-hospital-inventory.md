# Phase 5.2: 병원 재고 조회

## 📋 Overview

**Phase 5.2**는 병원의 재고 조회 기능을 구현합니다. 유통사로부터 입고받은 제품의 재고를 조회하고 사용기한을 관리합니다.

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

### HospitalInventoryPage 컴포넌트

**파일 경로**: `src/pages/hospital/HospitalInventoryPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Inventory, Lot, Product } from '@/types/database'

interface InventoryWithDetails extends Inventory {
  lot: Lot & { product: Product }
}

export function HospitalInventoryPage() {
  const { user } = useAuth()

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

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['hospitalInventory', userData?.organization_id],
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
        <p className="mt-1 text-sm text-gray-600">병원 재고 현황을 조회합니다</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <CardTitle className="text-base">사용기한 임박</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiringCount}개</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제품명</TableHead>
                <TableHead>Lot 번호</TableHead>
                <TableHead>사용기한</TableHead>
                <TableHead>현재 재고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center">
                    재고가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                inventory?.map((inv) => {
                  const daysUntilExpiry = differenceInDays(parseISO(inv.lot.expiry_date), new Date())
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.lot.product.name}</TableCell>
                      <TableCell className="font-mono text-sm">{inv.lot.lot_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {inv.lot.expiry_date}
                          {daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {daysUntilExpiry}일 남음
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{inv.current_quantity.toLocaleString()}개</TableCell>
                    </TableRow>
                  )
                })
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
feat(hospital): add hospital inventory page

- Implement HospitalInventoryPage with FEFO sorting
- Add expiry date warnings
- Display total quantity and expiring items

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 5.3 - 사용 등록](phase-5.3-usage.md)
