# Phase 6.4: 시스템 모니터링

## 📋 Overview

**Phase 6.4**는 관리자가 시스템의 주요 지표를 모니터링하는 대시보드를 구현합니다. 조직별 재고 통계, 거래량, 사용자 활동 등을 시각화합니다.

---

## 📦 Work Content

### SystemMonitoringPage 컴포넌트

**파일 경로**: `src/pages/admin/SystemMonitoringPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ORGANIZATION_TYPE } from '@/constants/status'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

interface SystemStats {
  totalOrganizations: number
  activeOrganizations: number
  totalUsers: number
  activeUsers: number
  totalProducts: number
  activeProducts: number
  totalLots: number
  totalTransactions: number
}

interface OrganizationInventory {
  organization_id: string
  organization_name: string
  organization_type: string
  total_quantity: number
  lot_count: number
}

interface TransactionVolume {
  date: string
  receiving_count: number
  shipment_count: number
  usage_count: number
  disposal_count: number
}

export function SystemMonitoringPage() {
  const { user } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  // Fetch system statistics
  const { data: systemStats, isLoading: isLoadingStats } = useQuery<SystemStats>({
    queryKey: ['systemStats'],
    queryFn: async () => {
      // Count organizations
      const { count: totalOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })

      const { count: activeOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Count users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Count products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      const { count: activeProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Count lots
      const { count: totalLots } = await supabase
        .from('lots')
        .select('*', { count: 'exact', head: true })

      // Count transactions (shipments)
      const { count: totalTransactions } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })

      return {
        totalOrganizations: totalOrgs ?? 0,
        activeOrganizations: activeOrgs ?? 0,
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        totalProducts: totalProducts ?? 0,
        activeProducts: activeProducts ?? 0,
        totalLots: totalLots ?? 0,
        totalTransactions: totalTransactions ?? 0,
      }
    },
    enabled: !!user,
  })

  // Fetch inventory by organization
  const { data: inventoryByOrg, isLoading: isLoadingInventory } = useQuery<OrganizationInventory[]>({
    queryKey: ['inventoryByOrganization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('organization_id, current_quantity, organization:organizations(name, type)')

      if (error) throw error

      // Group by organization
      const groupedMap = new Map<string, OrganizationInventory>()

      data.forEach((inv: any) => {
        const orgId = inv.organization_id
        if (!groupedMap.has(orgId)) {
          groupedMap.set(orgId, {
            organization_id: orgId,
            organization_name: inv.organization.name,
            organization_type: inv.organization.type,
            total_quantity: 0,
            lot_count: 0,
          })
        }

        const orgData = groupedMap.get(orgId)!
        orgData.total_quantity += inv.current_quantity
        orgData.lot_count += 1
      })

      return Array.from(groupedMap.values()).sort((a, b) => b.total_quantity - a.total_quantity)
    },
    enabled: !!user,
  })

  // Fetch transaction volume by date
  const { data: transactionVolume, isLoading: isLoadingVolume } = useQuery<TransactionVolume[]>({
    queryKey: ['transactionVolume', selectedMonth],
    queryFn: async () => {
      const startDate = startOfMonth(new Date(selectedMonth))
      const endDate = endOfMonth(new Date(selectedMonth))

      // Receiving (shipments with status 'completed')
      const { data: receivings } = await supabase
        .from('shipments')
        .select('received_date')
        .eq('status', 'completed')
        .gte('received_date', format(startDate, 'yyyy-MM-dd'))
        .lte('received_date', format(endDate, 'yyyy-MM-dd'))

      // Shipments (all shipments created in this month)
      const { data: shipments } = await supabase
        .from('shipments')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Usages
      const { data: usages } = await supabase
        .from('usages')
        .select('used_at')
        .gte('used_at', startDate.toISOString())
        .lte('used_at', endDate.toISOString())

      // Disposals
      const { data: disposals } = await supabase
        .from('disposals')
        .select('disposed_at')
        .gte('disposed_at', startDate.toISOString())
        .lte('disposed_at', endDate.toISOString())

      // Group by date
      const volumeMap = new Map<string, TransactionVolume>()

      receivings?.forEach((r: any) => {
        const date = r.received_date
        if (!volumeMap.has(date)) {
          volumeMap.set(date, {
            date,
            receiving_count: 0,
            shipment_count: 0,
            usage_count: 0,
            disposal_count: 0,
          })
        }
        volumeMap.get(date)!.receiving_count += 1
      })

      shipments?.forEach((s: any) => {
        const date = s.created_at.split('T')[0]
        if (!volumeMap.has(date)) {
          volumeMap.set(date, {
            date,
            receiving_count: 0,
            shipment_count: 0,
            usage_count: 0,
            disposal_count: 0,
          })
        }
        volumeMap.get(date)!.shipment_count += 1
      })

      usages?.forEach((u: any) => {
        const date = u.used_at.split('T')[0]
        if (!volumeMap.has(date)) {
          volumeMap.set(date, {
            date,
            receiving_count: 0,
            shipment_count: 0,
            usage_count: 0,
            disposal_count: 0,
          })
        }
        volumeMap.get(date)!.usage_count += 1
      })

      disposals?.forEach((d: any) => {
        const date = d.disposed_at.split('T')[0]
        if (!volumeMap.has(date)) {
          volumeMap.set(date, {
            date,
            receiving_count: 0,
            shipment_count: 0,
            usage_count: 0,
            disposal_count: 0,
          })
        }
        volumeMap.get(date)!.disposal_count += 1
      })

      return Array.from(volumeMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    },
    enabled: !!user,
  })

  const isLoading = isLoadingStats || isLoadingInventory || isLoadingVolume

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">데이터를 불러오는 중...</div>
  }

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i)
    return format(date, 'yyyy-MM')
  })

  const totalTransactionVolume = transactionVolume?.reduce(
    (sum, v) => sum + v.receiving_count + v.shipment_count + v.usage_count + v.disposal_count,
    0
  ) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">시스템 모니터링</h1>
        <p className="mt-1 text-sm text-gray-600">시스템의 주요 지표를 확인합니다</p>
      </div>

      {/* System Statistics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">전체 통계</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">조직</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.totalOrganizations ?? 0}개</div>
              <div className="mt-1 text-sm text-gray-600">활성: {systemStats?.activeOrganizations ?? 0}개</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">사용자</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.totalUsers ?? 0}명</div>
              <div className="mt-1 text-sm text-gray-600">활성: {systemStats?.activeUsers ?? 0}명</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">제품</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.totalProducts ?? 0}개</div>
              <div className="mt-1 text-sm text-gray-600">활성: {systemStats?.activeProducts ?? 0}개</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Lot / 거래</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats?.totalLots ?? 0}개</div>
              <div className="mt-1 text-sm text-gray-600">거래: {systemStats?.totalTransactions ?? 0}건</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory by Organization */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">조직별 재고 현황</h2>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>조직명</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>Lot 수</TableHead>
                  <TableHead>총 재고 수량</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryByOrg?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      재고 데이터가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryByOrg?.map((inv) => (
                    <TableRow key={inv.organization_id}>
                      <TableCell className="font-medium">{inv.organization_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            inv.organization_type === ORGANIZATION_TYPE.MANUFACTURER
                              ? 'default'
                              : inv.organization_type === ORGANIZATION_TYPE.DISTRIBUTOR
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {inv.organization_type === ORGANIZATION_TYPE.MANUFACTURER
                            ? '제조사'
                            : inv.organization_type === ORGANIZATION_TYPE.DISTRIBUTOR
                              ? '유통사'
                              : '병원'}
                        </Badge>
                      </TableCell>
                      <TableCell>{inv.lot_count.toLocaleString()}개</TableCell>
                      <TableCell className="font-semibold">{inv.total_quantity.toLocaleString()}개</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Volume */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">거래량 추이</h2>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month} value={month}>
                  {format(new Date(month), 'yyyy년 MM월')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>월별 거래 내역</CardTitle>
            <div className="text-sm text-gray-600">총 {totalTransactionVolume}건의 거래</div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>입고</TableHead>
                  <TableHead>출고</TableHead>
                  <TableHead>사용</TableHead>
                  <TableHead>폐기</TableHead>
                  <TableHead>합계</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionVolume?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      거래 데이터가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  transactionVolume?.map((vol) => {
                    const total =
                      vol.receiving_count + vol.shipment_count + vol.usage_count + vol.disposal_count
                    return (
                      <TableRow key={vol.date}>
                        <TableCell>{vol.date}</TableCell>
                        <TableCell className="text-blue-600">{vol.receiving_count}건</TableCell>
                        <TableCell className="text-green-600">{vol.shipment_count}건</TableCell>
                        <TableCell className="text-purple-600">{vol.usage_count}건</TableCell>
                        <TableCell className="text-red-600">{vol.disposal_count}건</TableCell>
                        <TableCell className="font-semibold">{total}건</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## 🔧 Constants Definitions

**모든 상수는 기존에 정의된 `ORGANIZATION_TYPE`을 사용하므로 추가 정의가 필요하지 않습니다.**

---

## 🧪 Test Scenarios

### 1. Unit Test: SystemMonitoringPage

**파일 경로**: `src/pages/admin/__tests__/SystemMonitoringPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SystemMonitoringPage } from '../SystemMonitoringPage'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-123', role: 'admin' } }),
}))

describe('SystemMonitoringPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SystemMonitoringPage />
      </QueryClientProvider>
    )
  }

  it('시스템 전체 통계를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 10 }),
        } as any
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 25 }),
        } as any
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 50 }),
        } as any
      }
      if (table === 'lots') {
        return {
          select: vi.fn().mockResolvedValue({ count: 100 }),
        } as any
      }
      if (table === 'shipments') {
        return {
          select: vi.fn().mockResolvedValue({ count: 200 }),
        } as any
      }
      return {} as any
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('10개')).toBeInTheDocument() // 조직
      expect(screen.getByText('25명')).toBeInTheDocument() // 사용자
      expect(screen.getByText('50개')).toBeInTheDocument() // 제품
      expect(screen.getByText('100개')).toBeInTheDocument() // Lot
    })
  })

  it('조직별 재고 현황을 표시해야 한다', async () => {
    const mockInventory = [
      {
        organization_id: 'org-1',
        current_quantity: 100,
        organization: {
          name: '테스트 제조사',
          type: 'manufacturer',
        },
      },
      {
        organization_id: 'org-1',
        current_quantity: 50,
        organization: {
          name: '테스트 제조사',
          type: 'manufacturer',
        },
      },
    ]

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'inventory') {
        return {
          select: vi.fn().mockResolvedValue({
            data: mockInventory,
            error: null,
          }),
        } as any
      }
      // ... 기타 테이블 mock
      return {
        select: vi.fn().mockResolvedValue({ count: 0 }),
      } as any
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('테스트 제조사')).toBeInTheDocument()
      expect(screen.getByText('150개')).toBeInTheDocument() // 100 + 50
    })
  })

  it('거래량 추이를 표시해야 한다', async () => {
    const mockShipments = [
      { created_at: '2025-01-15T10:00:00Z', received_date: '2025-01-15' },
      { created_at: '2025-01-16T10:00:00Z', received_date: '2025-01-16' },
    ]

    const mockUsages = [{ used_at: '2025-01-15T10:00:00Z' }]

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'shipments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: mockShipments,
            error: null,
          }),
        } as any
      }
      if (table === 'usages') {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: mockUsages,
            error: null,
          }),
        } as any
      }
      if (table === 'disposals') {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      // Default mock for stats
      return {
        select: vi.fn().mockResolvedValue({ count: 0 }),
      } as any
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('2025-01-15')).toBeInTheDocument()
      expect(screen.getByText('2025-01-16')).toBeInTheDocument()
    })
  })

  it('월 선택 시 거래량이 갱신되어야 한다', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    })) as any

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('거래량 추이')).toBeInTheDocument()
    })

    const monthSelect = screen.getAllByRole('combobox')[0]
    await user.click(monthSelect)

    // 이전 월 선택
    const previousMonth = screen.getByText(/2024년/)
    await user.click(previousMonth)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalled()
    })
  })

  it('데이터가 없을 때 안내 메시지를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    })) as any

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('재고 데이터가 없습니다')).toBeInTheDocument()
      expect(screen.getByText('거래 데이터가 없습니다')).toBeInTheDocument()
    })
  })
})
```

---

## 🚨 Troubleshooting

### Issue 1: 통계가 실시간으로 갱신되지 않음

**증상**: 새로운 조직이나 사용자가 생성되었지만 통계에 반영되지 않음

**원인**: QueryClient 캐시 갱신 필요

**해결방법**:
```typescript
// 다른 페이지에서 데이터 변경 후
queryClient.invalidateQueries({ queryKey: ['systemStats'] })
queryClient.invalidateQueries({ queryKey: ['inventoryByOrganization'] })
```

또는 자동 갱신 설정:
```typescript
const { data: systemStats } = useQuery({
  queryKey: ['systemStats'],
  queryFn: async () => { /* ... */ },
  refetchInterval: 60000, // 60초마다 자동 갱신
})
```

### Issue 2: 조직별 재고 합계가 부정확함

**증상**: 같은 조직의 여러 Lot 재고가 제대로 합산되지 않음

**원인**: 그룹화 로직 오류

**해결방법**:
```typescript
// 조직별 그룹화 확인
const groupedMap = new Map<string, OrganizationInventory>()

data.forEach((inv: any) => {
  const orgId = inv.organization_id
  if (!groupedMap.has(orgId)) {
    groupedMap.set(orgId, {
      organization_id: orgId,
      organization_name: inv.organization.name,
      organization_type: inv.organization.type,
      total_quantity: 0,
      lot_count: 0,
    })
  }

  const orgData = groupedMap.get(orgId)!
  orgData.total_quantity += inv.current_quantity // ← 누적 합산
  orgData.lot_count += 1
})
```

### Issue 3: 거래량 날짜 필터가 작동하지 않음

**증상**: 선택한 월과 무관하게 전체 데이터가 표시됨

**원인**: 날짜 필터링 쿼리 오류

**해결방법**:
```typescript
const startDate = startOfMonth(new Date(selectedMonth))
const endDate = endOfMonth(new Date(selectedMonth))

// 날짜 형식 확인
const { data: shipments } = await supabase
  .from('shipments')
  .select('created_at')
  .gte('created_at', startDate.toISOString()) // ISO 형식 사용
  .lte('created_at', endDate.toISOString())
```

### Issue 4: 거래량 합계가 0으로 표시됨

**증상**: 거래 데이터가 있지만 합계가 0으로 표시됨

**원인**: reduce 초기값 누락

**해결방법**:
```typescript
const totalTransactionVolume = transactionVolume?.reduce(
  (sum, v) => sum + v.receiving_count + v.shipment_count + v.usage_count + v.disposal_count,
  0 // ← 초기값 0 반드시 포함
) ?? 0
```

### Issue 5: 로딩 상태가 무한 지속됨

**증상**: "데이터를 불러오는 중..." 메시지가 계속 표시됨

**원인**: 쿼리 에러가 발생했지만 처리되지 않음

**해결방법**:
```typescript
const { data: systemStats, isLoading, isError, error } = useQuery({
  queryKey: ['systemStats'],
  queryFn: async () => { /* ... */ },
})

if (isError) {
  return <div className="text-red-600">오류 발생: {error.message}</div>
}

if (isLoading) {
  return <div className="flex h-96 items-center justify-center">데이터를 불러오는 중...</div>
}
```

---

## ✅ Definition of Done

### 기능 구현
- [ ] SystemMonitoringPage 컴포넌트 구현 완료
- [ ] 전체 통계 카드 (조직/사용자/제품/Lot/거래)
- [ ] 조직별 재고 현황 테이블
- [ ] 거래량 추이 테이블 (월별 필터)
- [ ] 월 선택 드롭다운 (최근 6개월)
- [ ] 거래 유형별 색상 구분 (입고/출고/사용/폐기)
- [ ] 자동 데이터 갱신 (선택적)

### 데이터 집계
- [ ] 조직 수 통계 (전체/활성)
- [ ] 사용자 수 통계 (전체/활성)
- [ ] 제품 수 통계 (전체/활성)
- [ ] Lot 수 및 거래 수 통계
- [ ] 조직별 재고 그룹화 및 합산
- [ ] 날짜별 거래량 그룹화

### UI/UX
- [ ] 통계 카드 레이아웃 (4열 그리드)
- [ ] 조직 유형별 Badge 색상 구분
- [ ] 거래 유형별 텍스트 색상 구분
- [ ] 빈 상태 메시지 표시
- [ ] 반응형 레이아웃 (모바일 지원)
- [ ] 로딩 상태 표시

### 테스트
- [ ] Unit Test 작성 (5개 시나리오)
- [ ] 시스템 통계 표시 테스트
- [ ] 조직별 재고 현황 테스트
- [ ] 거래량 추이 테스트
- [ ] 월 선택 필터 테스트
- [ ] 빈 데이터 처리 테스트
- [ ] 모든 테스트 통과

### 코드 품질
- [ ] TypeScript strict 모드 통과
- [ ] 'any' 타입 사용 최소화 (필요한 경우만)
- [ ] 모든 리터럴 값 상수화
- [ ] Error boundary 처리
- [ ] Loading state 처리
- [ ] Accessibility 준수 (ARIA labels)

### 문서화
- [ ] 컴포넌트 구조 문서화
- [ ] Troubleshooting 가이드 작성 (5개 이슈)
- [ ] Test scenarios 문서화

### 버전 관리
- [ ] Git commit (Conventional Commits)

---

## 🔄 Git Commit Message

```bash
feat(admin): add system monitoring dashboard

- Implement SystemMonitoringPage with key system metrics
- Add organization/user/product/lot/transaction statistics
- Add inventory breakdown by organization
- Add transaction volume by date with monthly filter
- Add color-coded badges for organization types
- Add color-coded text for transaction types (receiving/shipment/usage/disposal)
- Create unit tests for monitoring dashboard (5 scenarios)

Features:
- Real-time system statistics (organizations, users, products, lots, transactions)
- Inventory grouped by organization with lot count
- Transaction volume with monthly filter (last 6 months)
- Responsive layout with mobile support

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 6.5 - 통합 테스트](phase-6.5-integration-tests.md)
