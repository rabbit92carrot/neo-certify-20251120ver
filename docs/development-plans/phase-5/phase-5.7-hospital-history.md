# Phase 5.5: 병원 이력 조회

## 📋 Overview

**Phase 5.5**는 병원의 거래 이력 조회 기능을 구현합니다. 입고, 사용, 폐기 이력을 통합하여 조회합니다.

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

### HospitalHistoryPage 컴포넌트

**파일 경로**: `src/pages/hospital/HospitalHistoryPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

type TransactionType = 'receiving' | 'usage' | 'disposal'

interface Transaction {
  id: string
  type: TransactionType
  date: string
  lotNumber: string
  productName: string
  quantity: number
  details: string
}

export function HospitalHistoryPage() {
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

  // Fetch receivings
  const { data: receivings } = useQuery({
    queryKey: ['receivings', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, lot:lots(lot_number, product:products(name))')
        .eq('to_organization_id', userData!.organization_id)
        .eq('status', 'completed')
        .order('received_date', { ascending: false })

      if (error) throw error

      // 타입 정의 (any 제거)
      interface ShipmentData {
        id: string;
        received_date: string;
        lot: {
          lot_number: string;
          product: {
            name: string;
          };
        };
        quantity: number;
      }

      return data.map((s: ShipmentData) => ({
        id: s.id,
        type: 'receiving' as TransactionType,
        date: s.received_date,
        lotNumber: s.lot.lot_number,
        productName: s.lot.product.name,
        quantity: s.quantity,
        details: '입고',
      }))
    },
    enabled: !!userData?.organization_id,
  })

  // Fetch usages
  const { data: usages } = useQuery({
    queryKey: ['usages', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usages')
        .select('*, lot:lots(lot_number, product:products(name))')
        .eq('organization_id', userData!.organization_id)
        .order('used_at', { ascending: false })

      if (error) throw error

      // 타입 정의 (any 제거)
      interface UsageData {
        id: string;
        used_at: string;
        lot: {
          lot_number: string;
          product: {
            name: string;
          };
        };
        quantity: number;
        patient_id: string;
      }

      return data.map((u: UsageData) => ({
        id: u.id,
        type: 'usage' as TransactionType,
        date: u.used_at.split('T')[0],
        lotNumber: u.lot.lot_number,
        productName: u.lot.product.name,
        quantity: u.quantity,
        details: `환자: ${u.patient_id}`,
      }))
    },
    enabled: !!userData?.organization_id,
  })

  // Fetch disposals
  const { data: disposals } = useQuery({
    queryKey: ['disposals', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disposals')
        .select('*, lot:lots(lot_number, product:products(name))')
        .eq('organization_id', userData!.organization_id)
        .order('disposed_at', { ascending: false })

      if (error) throw error
      return data.map((d: DisposalWithLotAndProduct) => ({
        id: d.id,
        type: 'disposal' as TransactionType,
        date: d.disposed_at.split('T')[0],
        lotNumber: d.lot.lot_number,
        productName: d.lot.product.name,
        quantity: d.quantity,
        details: `폐기 (${d.reason})`,
      }))
    },
    enabled: !!userData?.organization_id,
  })

  const allTransactions: Transaction[] = [
    ...(receivings ?? []),
    ...(usages ?? []),
    ...(disposals ?? []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filteredTransactions =
    typeFilter === 'all' ? allTransactions : allTransactions.filter((t) => t.type === typeFilter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">거래 이력</h1>
        <p className="mt-1 text-sm text-gray-600">입고, 사용, 폐기 이력을 조회합니다</p>
      </div>

      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | 'all')}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="receiving">입고</SelectItem>
          <SelectItem value="usage">사용</SelectItem>
          <SelectItem value="disposal">폐기</SelectItem>
        </SelectContent>
      </Select>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>제품명</TableHead>
              <TableHead>Lot 번호</TableHead>
              <TableHead>수량</TableHead>
              <TableHead>상세</TableHead>
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
                          : txn.type === 'usage'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {txn.type === 'receiving' ? '입고' : txn.type === 'usage' ? '사용' : '폐기'}
                    </Badge>
                  </TableCell>
                  <TableCell>{txn.productName}</TableCell>
                  <TableCell className="font-mono text-sm">{txn.lotNumber}</TableCell>
                  <TableCell>{txn.quantity.toLocaleString()}개</TableCell>
                  <TableCell className="text-sm text-gray-600">{txn.details}</TableCell>
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
feat(hospital): add hospital history page

- Implement HospitalHistoryPage with receiving/usage/disposal records
- Add type filter (receiving/usage/disposal/all)
- Display patient ID in usage records
- Display disposal reason in disposal records

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 5.6 - 통합 테스트](phase-5.6-integration-tests.md)
