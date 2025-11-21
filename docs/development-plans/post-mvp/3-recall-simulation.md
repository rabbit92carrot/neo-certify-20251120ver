# Post-MVP 3: 리콜 시뮬레이션

## 📋 Overview

**Post-MVP 3**은 특정 제품 또는 Lot에 대한 리콜 시나리오를 시뮬레이션하는 기능을 구현합니다. 전체 공급망에서 영향을 받는 조직과 환자를 추적하고 리콜 보고서를 생성합니다.

---

## 📦 Work Content

### RecallSimulationPage 컴포넌트

**파일 경로**: `src/pages/admin/RecallSimulationPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Download } from 'lucide-react'
import { ERROR_MESSAGES } from '@/constants/messages'
import { ORGANIZATION_TYPE } from '@/constants/status'

interface RecallSimulationResult {
  lot: {
    id: string
    lot_number: string
    manufacture_date: string
    expiry_date: string
    product: {
      name: string
      udi_di: string
      model_name: string
    }
  }
  // Note: Virtual codes are stored separately (1 Lot → N Virtual Codes)
  // Use virtual_codes table query to find lot by virtual code
  affected_organizations: Array<{
    id: string
    name: string
    type: string
    current_inventory: number
    total_received: number
    total_shipped: number
  }>
  affected_patients: Array<{
    patient_id: string
    usage_date: string
    quantity: number
    hospital_name: string
  }>
  total_produced: number
  total_distributed: number
  total_in_inventory: number
  total_used: number
  total_disposed: number
}

export function RecallSimulationPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchInput, setSearchInput] = useState('')
  const [simulationResult, setSimulationResult] = useState<RecallSimulationResult | null>(null)

  const simulateMutation = useMutation({
    mutationFn: async (search: string) => {
      // Try to find lot by lot_number first
      let lot: any
      const { data: lotByNumber, error: lotNumberError } = await supabase
        .from('lots')
        .select('*, product:products(*)')
        .eq('lot_number', search)
        .single()

      if (lotByNumber) {
        lot = lotByNumber
      } else {
        // If not found by lot_number, search by virtual_code in virtual_codes table
        // Virtual codes are stored separately (1 Lot → N Virtual Codes architecture)
        const { data: virtualCode, error: vcError } = await supabase
          .from('virtual_codes')
          .select('lot_id, lot:lots(*, product:products(*))')
          .eq('code', search)
          .single()

        if (virtualCode && virtualCode.lot) {
          lot = virtualCode.lot
        }
      }

      if (!lot) {
        throw new Error('Lot을 찾을 수 없습니다. Lot 번호 또는 Virtual Code를 확인해주세요.')
      }

      // Find all shipments for this lot
      const { data: shipments } = await supabase
        .from('shipments')
        .select('*, to_organization:organizations(id, name, type), from_organization:organizations(id, name, type)')
        .eq('lot_id', lot.id)

      // Find all inventory records for this lot
      const { data: inventories } = await supabase
        .from('inventory')
        .select('*, organization:organizations(id, name, type)')
        .eq('lot_id', lot.id)

      // Find all usages for this lot
      const { data: usages } = await supabase
        .from('usages')
        .select('*, organization:organizations(name)')
        .eq('lot_id', lot.id)

      // Find all disposals for this lot
      const { data: disposals } = await supabase
        .from('disposals')
        .select('*')
        .eq('lot_id', lot.id)

      // Calculate statistics
      const totalProduced = lot.quantity
      const totalUsed = usages?.reduce((sum, u) => sum + u.quantity, 0) ?? 0
      const totalDisposed = disposals?.reduce((sum, d) => sum + d.quantity, 0) ?? 0
      const totalInInventory = inventories?.reduce((sum, inv) => sum + inv.current_quantity, 0) ?? 0

      // Group organizations
      const orgMap = new Map<string, any>()

      // Add from inventory
      inventories?.forEach((inv) => {
        if (!orgMap.has(inv.organization.id)) {
          orgMap.set(inv.organization.id, {
            id: inv.organization.id,
            name: inv.organization.name,
            type: inv.organization.type,
            current_inventory: 0,
            total_received: 0,
            total_shipped: 0,
          })
        }
        const org = orgMap.get(inv.organization.id)!
        org.current_inventory += inv.current_quantity
      })

      // Add from shipments (receivers)
      shipments?.forEach((s) => {
        if (s.to_organization) {
          if (!orgMap.has(s.to_organization.id)) {
            orgMap.set(s.to_organization.id, {
              id: s.to_organization.id,
              name: s.to_organization.name,
              type: s.to_organization.type,
              current_inventory: 0,
              total_received: 0,
              total_shipped: 0,
            })
          }
          const org = orgMap.get(s.to_organization.id)!
          org.total_received += s.quantity
        }

        if (s.from_organization) {
          if (!orgMap.has(s.from_organization.id)) {
            orgMap.set(s.from_organization.id, {
              id: s.from_organization.id,
              name: s.from_organization.name,
              type: s.from_organization.type,
              current_inventory: 0,
              total_received: 0,
              total_shipped: 0,
            })
          }
          const org = orgMap.get(s.from_organization.id)!
          org.total_shipped += s.quantity
        }
      })

      // Affected patients
      const affectedPatients =
        usages?.map((u) => ({
          patient_id: u.patient_id,
          usage_date: u.used_at.split('T')[0],
          quantity: u.quantity,
          hospital_name: u.organization.name,
        })) ?? []

      const result: RecallSimulationResult = {
        lot: {
          id: lot.id,
          lot_number: lot.lot_number,
          manufacture_date: lot.manufacture_date,
          expiry_date: lot.expiry_date,
          product: {
            name: lot.product.name,
            udi_di: lot.product.udi_di,
            model_name: lot.product.model_name,
          },
        },
        affected_organizations: Array.from(orgMap.values()).filter(
          (org) => org.current_inventory > 0 || org.total_received > 0
        ),
        affected_patients: affectedPatients,
        total_produced: totalProduced,
        total_distributed: shipments?.reduce((sum, s) => sum + s.quantity, 0) ?? 0,
        total_in_inventory: totalInInventory,
        total_used: totalUsed,
        total_disposed: totalDisposed,
      }

      return result
    },
    onSuccess: (result) => {
      setSimulationResult(result)
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.RECALL.SIMULATION_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const handleSimulate = () => {
    if (searchInput.trim()) {
      simulateMutation.mutate(searchInput.trim())
    }
  }

  const handleExportReport = () => {
    if (!simulationResult) return

    const reportData = {
      recall_date: new Date().toISOString(),
      lot: simulationResult.lot,
      statistics: {
        total_produced: simulationResult.total_produced,
        total_distributed: simulationResult.total_distributed,
        total_in_inventory: simulationResult.total_in_inventory,
        total_used: simulationResult.total_used,
        total_disposed: simulationResult.total_disposed,
      },
      affected_organizations: simulationResult.affected_organizations,
      affected_patients: simulationResult.affected_patients,
    }

    const jsonString = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recall-report-${simulationResult.lot.lot_number}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">리콜 시뮬레이션</h1>
        <p className="mt-1 text-sm text-gray-600">특정 Lot의 리콜 시나리오를 시뮬레이션합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lot 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Lot 번호 또는 Virtual Code 입력"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSimulate()
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSimulate} disabled={simulateMutation.isPending || !searchInput.trim()}>
              {simulateMutation.isPending ? '조회 중...' : '시뮬레이션 실행'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {simulationResult && (
        <>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>리콜 시뮬레이션 결과</AlertTitle>
            <AlertDescription>
              이 Lot에 대한 리콜이 발생할 경우 아래의 조직과 환자가 영향을 받습니다.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lot 정보</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExportReport}>
                  <Download className="mr-2 h-4 w-4" />
                  보고서 다운로드
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">제품명</div>
                  <div className="mt-1 text-base">{simulationResult.lot.product.name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">UDI-DI</div>
                  <div className="mt-1 font-mono text-base">{simulationResult.lot.product.udi_di}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Lot 번호</div>
                  <div className="mt-1 font-mono text-base">{simulationResult.lot.lot_number}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">제조일</div>
                  <div className="mt-1 text-base">{simulationResult.lot.manufacture_date}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">사용기한</div>
                  <div className="mt-1 text-base">{simulationResult.lot.expiry_date}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">생산 수량</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{simulationResult.total_produced.toLocaleString()}개</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">유통 수량</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{simulationResult.total_distributed.toLocaleString()}개</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">현재 재고</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {simulationResult.total_in_inventory.toLocaleString()}개
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">사용 수량</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {simulationResult.total_used.toLocaleString()}개
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">폐기 수량</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {simulationResult.total_disposed.toLocaleString()}개
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>영향 받는 조직 ({simulationResult.affected_organizations.length}개)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>조직명</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>현재 재고</TableHead>
                    <TableHead>총 입고</TableHead>
                    <TableHead>총 출고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulationResult.affected_organizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        영향 받는 조직이 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    simulationResult.affected_organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              org.type === ORGANIZATION_TYPE.MANUFACTURER
                                ? 'default'
                                : org.type === ORGANIZATION_TYPE.DISTRIBUTOR
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {org.type === ORGANIZATION_TYPE.MANUFACTURER
                              ? '제조사'
                              : org.type === ORGANIZATION_TYPE.DISTRIBUTOR
                                ? '유통사'
                                : '병원'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-yellow-600">
                          {org.current_inventory.toLocaleString()}개
                        </TableCell>
                        <TableCell>{org.total_received.toLocaleString()}개</TableCell>
                        <TableCell>{org.total_shipped.toLocaleString()}개</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>영향 받는 환자 ({simulationResult.affected_patients.length}명)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>환자 ID</TableHead>
                    <TableHead>병원명</TableHead>
                    <TableHead>사용일</TableHead>
                    <TableHead>사용 수량</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulationResult.affected_patients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        영향 받는 환자가 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    simulationResult.affected_patients.map((patient, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">{patient.patient_id}</TableCell>
                        <TableCell>{patient.hospital_name}</TableCell>
                        <TableCell>{patient.usage_date}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {patient.quantity.toLocaleString()}개
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
```

---

## 🔧 Constants Definitions

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const ERROR_MESSAGES = {
  // ... 기존
  RECALL: {
    SIMULATION_FAILED: '리콜 시뮬레이션에 실패했습니다.',
  },
} as const
```

---

## 🧪 Test Scenarios

### 1. Unit Test: RecallSimulationPage

**파일 경로**: `src/pages/admin/__tests__/RecallSimulationPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RecallSimulationPage } from '../RecallSimulationPage'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-123', role: 'admin' } }),
}))

const mockLot = {
  id: 'lot-1',
  lot_number: 'LOT-001',
  quantity: 100,
  manufacture_date: '2025-01-01',
  expiry_date: '2026-01-01',
  product: {
    name: '의료용 실',
    udi_di: '12345678901234',
    model_name: 'Thread-A100',
  },
}

// Note: Virtual codes are in separate table (1 Lot → N Virtual Codes)
const mockVirtualCode = {
  id: 'vc-1',
  lot_id: 'lot-1',
  code: 'ABC123456789',
  sequence_number: 1,
  status: 'IN_STOCK',
}

const mockShipments = [
  {
    id: 'shipment-1',
    lot_id: 'lot-1',
    quantity: 50,
    to_organization: {
      id: 'org-2',
      name: '유통사 A',
      type: 'distributor',
    },
    from_organization: {
      id: 'org-1',
      name: '제조사 A',
      type: 'manufacturer',
    },
  },
]

const mockUsages = [
  {
    id: 'usage-1',
    lot_id: 'lot-1',
    patient_id: 'P12345',
    quantity: 5,
    used_at: '2025-01-15T10:00:00Z',
    organization: {
      name: '병원 A',
    },
  },
]

describe('RecallSimulationPage', () => {
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
        <RecallSimulationPage />
      </QueryClientProvider>
    )
  }

  it('Lot 번호로 시뮬레이션을 실행해야 한다', async () => {
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'lots') {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockLot,
            error: null,
          }),
        } as any
      }
      if (table === 'shipments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockShipments,
            error: null,
          }),
        } as any
      }
      if (table === 'usages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockUsages,
            error: null,
          }),
        } as any
      }
      if (table === 'inventory' || table === 'disposals') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    renderComponent()
    const user = userEvent.setup()

    const searchInput = screen.getByPlaceholderText('Lot 번호 또는 Virtual Code 입력')
    await user.type(searchInput, 'LOT-001')

    const simulateButton = screen.getByRole('button', { name: '시뮬레이션 실행' })
    await user.click(simulateButton)

    await waitFor(() => {
      expect(screen.getByText('Lot 정보')).toBeInTheDocument()
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
      expect(screen.getByText('LOT-001')).toBeInTheDocument()
    })
  })

  it('영향 받는 조직과 환자를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'lots') {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockLot,
            error: null,
          }),
        } as any
      }
      if (table === 'shipments') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockShipments,
            error: null,
          }),
        } as any
      }
      if (table === 'usages') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: mockUsages,
            error: null,
          }),
        } as any
      }
      if (table === 'inventory' || table === 'disposals') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    renderComponent()
    const user = userEvent.setup()

    const searchInput = screen.getByPlaceholderText('Lot 번호 또는 Virtual Code 입력')
    await user.type(searchInput, 'LOT-001')

    const simulateButton = screen.getByRole('button', { name: '시뮬레이션 실행' })
    await user.click(simulateButton)

    await waitFor(() => {
      expect(screen.getByText('유통사 A')).toBeInTheDocument()
      expect(screen.getByText('P12345')).toBeInTheDocument()
      expect(screen.getByText('병원 A')).toBeInTheDocument()
    })
  })

  it('존재하지 않는 Lot 검색 시 에러를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    const searchInput = screen.getByPlaceholderText('Lot 번호 또는 Virtual Code 입력')
    await user.type(searchInput, 'INVALID-LOT')

    const simulateButton = screen.getByRole('button', { name: '시뮬레이션 실행' })
    await user.click(simulateButton)

    await waitFor(() => {
      expect(screen.queryByText('Lot 정보')).not.toBeInTheDocument()
    })
  })
})
```

---

## 🚨 Troubleshooting

### Issue 1: 환자 정보가 누락됨

**증상**: 리콜 보고서에 환자 정보가 표시되지 않음

**원인**: usages 테이블 JOIN 누락

**해결방법**:
```typescript
const { data: usages } = await supabase
  .from('usages')
  .select('*, organization:organizations(name)') // ← JOIN 추가
  .eq('lot_id', lot.id)
```

### Issue 2: 조직 통계가 부정확함

**증상**: 조직별 입고/출고 수량이 실제와 다름

**원인**: 조직 집계 로직 오류

**해결방법**:
```typescript
// 조직 Map 초기화 확인
if (!orgMap.has(inv.organization.id)) {
  orgMap.set(inv.organization.id, {
    id: inv.organization.id,
    name: inv.organization.name,
    type: inv.organization.type,
    current_inventory: 0, // ← 0으로 초기화
    total_received: 0,
    total_shipped: 0,
  })
}
```

### Issue 3: 보고서 다운로드가 실패함

**증상**: 보고서 다운로드 버튼 클릭 시 아무 반응 없음

**원인**: Blob 생성 오류

**해결방법**:
```typescript
const handleExportReport = () => {
  if (!simulationResult) {
    toast({
      title: '시뮬레이션 결과가 없습니다.',
      variant: 'destructive',
    })
    return
  }

  try {
    const jsonString = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    // ... 다운로드 로직
  } catch (error) {
    toast({
      title: '보고서 생성에 실패했습니다.',
      variant: 'destructive',
    })
  }
}
```

### Issue 4: 중복 조직이 표시됨

**증상**: 같은 조직이 여러 번 표시됨

**원인**: Map key 중복 체크 누락

**해결방법**:
```typescript
// Map을 사용하여 조직 ID 기준으로 중복 제거
const orgMap = new Map<string, any>()

// 조직 추가 전 중복 체크
if (!orgMap.has(org.id)) {
  orgMap.set(org.id, { ... })
} else {
  // 기존 조직 정보 업데이트
  const existing = orgMap.get(org.id)!
  existing.total_received += quantity
}
```

### Issue 5: Virtual Code 검색이 작동하지 않음

**증상**: Virtual Code로 검색 시 Lot을 찾지 못함

**원인**: OR 쿼리 구문 오류

**해결방법**:
```typescript
const { data: lot, error: lotError } = await supabase
  .from('lots')
  .select('*, product:products(*)')
  .or(`lot_number.eq.${search},virtual_code.eq.${search}`) // ← 올바른 OR 구문
  .single()
```

---

## ✅ Definition of Done

### 기능 구현
- [ ] RecallSimulationPage 컴포넌트 구현 완료
- [ ] Lot 번호/Virtual Code 검색 기능
- [ ] 전체 공급망 추적 기능
- [ ] 영향 받는 조직 목록 표시
- [ ] 영향 받는 환자 목록 표시
- [ ] 통계 요약 (생산/유통/재고/사용/폐기)
- [ ] 리콜 보고서 JSON 다운로드 기능

### UI/UX
- [ ] Lot 검색 입력란
- [ ] Lot 정보 카드
- [ ] 통계 카드 (5개)
- [ ] 영향 받는 조직 테이블
- [ ] 영향 받는 환자 테이블
- [ ] 리콜 경고 Alert
- [ ] 보고서 다운로드 버튼
- [ ] 빈 상태 메시지 표시

### 상수 관리
- [ ] ERROR_MESSAGES.RECALL 정의

### 테스트
- [ ] Unit Test 작성 (3개 시나리오)
- [ ] Lot 번호 검색 테스트
- [ ] 영향 받는 조직/환자 표시 테스트
- [ ] 잘못된 Lot 검색 에러 처리 테스트
- [ ] 모든 테스트 통과

### 코드 품질
- [ ] TypeScript strict 모드 통과
- [ ] 'any' 타입 사용 최소화
- [ ] 모든 리터럴 값 상수화
- [ ] Error boundary 처리
- [ ] Loading state 처리
- [ ] Accessibility 준수

### 문서화
- [ ] 컴포넌트 구조 문서화
- [ ] 리콜 보고서 스키마 문서화
- [ ] Troubleshooting 가이드 작성 (5개 이슈)
- [ ] Test scenarios 문서화

### 버전 관리
- [ ] Git commit (Conventional Commits)

---

## 🔄 Git Commit Message

```bash
feat(business-logic): add recall simulation system

- Implement RecallSimulationPage for product recall scenarios
- Add lot search by lot_number or virtual_code
- Add complete supply chain tracking (manufacturer → distributor → hospital → patient)
- Add affected organizations list with inventory/receiving/shipping statistics
- Add affected patients list with usage records
- Add recall report JSON export
- Add statistics summary (produced/distributed/in-stock/used/disposed)
- Create unit tests (3 scenarios)

Features:
- Search lot by lot_number or virtual_code
- Track entire supply chain for recall scenario
- List all organizations with current inventory
- List all patients who used the product
- Export comprehensive recall report in JSON format
- Calculate total quantities across all stages

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 7.4 - 데이터 백업 및 복원](phase-7.4-backup-restore.md)
