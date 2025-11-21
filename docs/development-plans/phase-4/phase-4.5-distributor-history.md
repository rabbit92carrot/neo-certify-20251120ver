# Phase 4.5: 거래 이력 조회

## 📋 Overview

**Phase 4.5**는 유통사의 거래 이력 조회 기능을 구현합니다. Phase 1.3의 `history` 테이블을 기반으로 입고, 출고, 반품 이력을 통합 조회합니다.

**PRD 참조**: Section 8 - 이력 추적 및 조회

**Phase 1.3 아키텍처**:
- `history` 테이블: Virtual Code 단위 이력 추적
- `action_type`: RECEIVE, SHIPMENT, RETURN, DISPOSE, TREATMENT
- `from_owner_id`, `to_owner_id`: 거래 당사자 추적

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

### DistributorHistoryPage 컴포넌트

**파일 경로**: `src/pages/distributor/DistributorHistoryPage.tsx`

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ACTION_TYPE, ACTION_TYPE_LABELS, HISTORY_FILTER_OPTIONS } from '@/constants/history'
import type { HistoryRecord } from '@/types/database'

/**
 * Phase 1.3 history 테이블 기반 거래 이력
 *
 * ⚠️ 중요: shipments, return_requests 테이블 직접 조회 금지
 * history 테이블의 action_type으로 구분
 */
interface TransactionHistory extends HistoryRecord {
  virtual_code: {
    code: string
    lot: {
      lot_number: string
      product: {
        name: string
      }
    }
  }
  from_organization?: {
    name: string
  }
  to_organization?: {
    name: string
  }
}

type ActionTypeFilter = keyof typeof ACTION_TYPE | 'ALL'

export function DistributorHistoryPage() {
  const { user } = useAuth()
  const [actionFilter, setActionFilter] = useState<ActionTypeFilter>('ALL')

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

  /**
   * Phase 1.3 history 테이블 조회
   *
   * 조회 조건:
   * - from_owner_id = 현재 조직 (출고, 반품 송신)
   * - to_owner_id = 현재 조직 (입고, 반품 수신)
   */
  const { data: historyRecords, isLoading } = useQuery({
    queryKey: ['distributorHistory', userData?.organization_id, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('history')
        .select(`
          *,
          virtual_code:virtual_codes(
            code,
            lot:lots(
              lot_number,
              product:products(name)
            )
          ),
          from_organization:organizations!history_from_owner_id_fkey(name),
          to_organization:organizations!history_to_owner_id_fkey(name)
        `)
        .or(`from_owner_id.eq.${userData!.organization_id},to_owner_id.eq.${userData!.organization_id}`)
        .order('created_at', { ascending: false })

      // Action type filter
      if (actionFilter !== 'ALL') {
        query = query.eq('action_type', ACTION_TYPE[actionFilter])
      }

      const { data, error } = await query

      if (error) throw error
      return data as TransactionHistory[]
    },
    enabled: !!userData?.organization_id,
  })

  /**
   * 거래 방향 결정
   * - RECEIVE, SHIPMENT: to_owner_id 기준
   * - RETURN, DISPOSE: from_owner_id 기준
   */
  const getTransactionDirection = (record: TransactionHistory): 'incoming' | 'outgoing' => {
    if (record.action_type === ACTION_TYPE.RECEIVE) {
      return record.to_owner_id === userData?.organization_id ? 'incoming' : 'outgoing'
    }
    if (record.action_type === ACTION_TYPE.SHIPMENT) {
      return record.from_owner_id === userData?.organization_id ? 'outgoing' : 'incoming'
    }
    if (record.action_type === ACTION_TYPE.RETURN) {
      return record.to_owner_id === userData?.organization_id ? 'incoming' : 'outgoing'
    }
    return 'outgoing' // DISPOSE
  }

  const getCounterparty = (record: TransactionHistory): string => {
    const direction = getTransactionDirection(record)
    if (direction === 'incoming') {
      return record.from_organization?.name ?? '-'
    } else {
      return record.to_organization?.name ?? '-'
    }
  }

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">거래 이력을 불러오는 중...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">거래 이력</h1>
        <p className="mt-1 text-sm text-gray-600">
          Virtual Code 단위로 입고, 출고, 반품, 폐기 이력을 조회합니다 (Phase 1.3 history 테이블 기반)
        </p>
      </div>

      {/* Action Type Filter */}
      <Select
        value={actionFilter}
        onValueChange={(v) => setActionFilter(v as ActionTypeFilter)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{HISTORY_FILTER_OPTIONS.ALL}</SelectItem>
          <SelectItem value="RECEIVE">{HISTORY_FILTER_OPTIONS.RECEIVE}</SelectItem>
          <SelectItem value="SHIPMENT">{HISTORY_FILTER_OPTIONS.SHIPMENT}</SelectItem>
          <SelectItem value="RETURN">{HISTORY_FILTER_OPTIONS.RETURN}</SelectItem>
          <SelectItem value="DISPOSE">{HISTORY_FILTER_OPTIONS.DISPOSE}</SelectItem>
        </SelectContent>
      </Select>

      {/* History Table */}
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>액션</TableHead>
              <TableHead>Virtual Code</TableHead>
              <TableHead>제품명</TableHead>
              <TableHead>Lot 번호</TableHead>
              <TableHead>방향</TableHead>
              <TableHead>거래처</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!historyRecords || historyRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                  거래 이력이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              historyRecords.map((record) => {
                const direction = getTransactionDirection(record)
                const counterparty = getCounterparty(record)

                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {format(new Date(record.created_at), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.action_type === ACTION_TYPE.RECEIVE
                            ? 'default'
                            : record.action_type === ACTION_TYPE.SHIPMENT
                              ? 'secondary'
                              : record.action_type === ACTION_TYPE.RETURN
                                ? 'outline'
                                : 'destructive'
                        }
                      >
                        {ACTION_TYPE_LABELS[record.action_type as keyof typeof ACTION_TYPE_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {record.virtual_code.code}
                    </TableCell>
                    <TableCell>{record.virtual_code.lot.product.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.virtual_code.lot.lot_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant={direction === 'incoming' ? 'default' : 'secondary'}>
                        {direction === 'incoming' ? '입고' : '출고'}
                      </Badge>
                    </TableCell>
                    <TableCell>{counterparty}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {historyRecords && historyRecords.length > 0 && (
        <div className="text-sm text-gray-500">
          총 {historyRecords.length}건의 거래 이력 (Virtual Code 단위)
        </div>
      )}
    </div>
  )
}
```

---

## 📝 TypeScript Type Definitions

**파일 경로**: `src/types/database.ts` (기존 파일에 추가)

```typescript
/**
 * Phase 1.3 history 테이블 타입
 */
export interface HistoryRecord {
  id: string
  virtual_code_id: string
  action_type: 'RECEIVE' | 'SHIPMENT' | 'RETURN' | 'DISPOSE' | 'TREATMENT'
  from_owner_type: 'organization' | 'patient' | null
  from_owner_id: string | null
  to_owner_type: 'organization' | 'patient' | null
  to_owner_id: string | null
  created_at: string
}
```

---

## 🔧 Constants Definitions

### 1. Action Type Constants (신규)

**파일 경로**: `src/constants/history.ts`

```typescript
/**
 * Phase 1.3 history 테이블 action_type
 */
export const ACTION_TYPE = {
  RECEIVE: 'RECEIVE',
  SHIPMENT: 'SHIPMENT',
  RETURN: 'RETURN',
  DISPOSE: 'DISPOSE',
  TREATMENT: 'TREATMENT',
} as const

export type ActionType = typeof ACTION_TYPE[keyof typeof ACTION_TYPE]

export const ACTION_TYPE_LABELS = {
  RECEIVE: '입고',
  SHIPMENT: '출고',
  RETURN: '반품',
  DISPOSE: '폐기',
  TREATMENT: '투여',
} as const

export const HISTORY_FILTER_OPTIONS = {
  ALL: '전체',
  RECEIVE: '입고',
  SHIPMENT: '출고',
  RETURN: '반품',
  DISPOSE: '폐기',
} as const

export const TRANSACTION_DIRECTION = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
} as const

export const TRANSACTION_DIRECTION_LABELS = {
  incoming: '입고',
  outgoing: '출고',
} as const
```

---

## 📁 Files Created/Modified

### 신규 파일

1. **src/constants/history.ts** (~50 lines)
   - ACTION_TYPE, ACTION_TYPE_LABELS
   - HISTORY_FILTER_OPTIONS
   - TRANSACTION_DIRECTION

### 수정 파일

1. **src/types/database.ts**
   - HistoryRecord 인터페이스 추가

2. **src/pages/distributor/DistributorHistoryPage.tsx** (~200 lines)
   - Phase 1.3 history 테이블 기반 구현
   - Virtual Code 단위 이력 조회
   - Action type 필터링

---

## ✅ Test Requirements

```typescript
describe('DistributorHistoryPage', () => {
  it('Phase 1.3 history 테이블을 사용해야 한다', async () => {
    // Verify query uses 'history' table
    // Verify action_type filtering works
  })

  it('입고 이력이 표시되어야 한다', async () => {
    // Create RECEIVE history record
    // Verify it appears in the list
    // Verify direction = 'incoming'
  })

  it('출고 이력이 표시되어야 한다', async () => {
    // Create SHIPMENT history record
    // Verify it appears in the list
    // Verify direction = 'outgoing'
  })

  it('반품 이력이 표시되어야 한다', async () => {
    // Create RETURN history record
    // Verify it appears in the list
  })

  it('Virtual Code 단위로 이력이 표시되어야 한다', async () => {
    // Create 3 Virtual Code history records for same shipment
    // Verify 3 separate rows appear
  })

  it('Action type 필터가 동작해야 한다', async () => {
    // Filter by RECEIVE
    // Verify only RECEIVE records shown
  })
})
```

---

## 🔄 Git Commit Message

```bash
feat(distributor): add distributor history page (Phase 1.3 based)

- Implement DistributorHistoryPage using Phase 1.3 history table
- Add Virtual Code-level transaction tracking
- Add action_type filter (RECEIVE/SHIPMENT/RETURN/DISPOSE)
- Create ACTION_TYPE constants (src/constants/history.ts)
- Remove incorrect shipments/returns table references

Breaking changes:
- Now uses history table instead of shipments/returns
- Virtual Code-level tracking (not Lot-level)
- Action types from Phase 1.3 schema

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⚠️ 중요 변경 사항

### 이전 버전과의 차이

1. **테이블 변경**:
   - ❌ `shipments` 테이블 직접 조회 (lot_id 컬럼 없음)
   - ❌ `returns` 테이블 (존재하지 않음)
   - ✅ `history` 테이블 사용 (Phase 1.3 스키마)

2. **추적 단위**:
   - ❌ Lot 단위 (`quantity` 집계)
   - ✅ Virtual Code 단위 (1 record = 1 Virtual Code)

3. **Action Type**:
   - ❌ `'receiving' | 'shipment' | 'return'` (커스텀 타입)
   - ✅ `ACTION_TYPE` 상수 (Phase 1.3 정의)

4. **거래처 표시**:
   - ❌ 하드코딩된 '반품' 문자열
   - ✅ `from_organization.name` / `to_organization.name` (동적)

---

## ✔️ Definition of Done

- [ ] DistributorHistoryPage 컴포넌트 구현 완료
- [ ] Phase 1.3 history 테이블 사용 확인
- [ ] ACTION_TYPE constants 정의 완료
- [ ] Virtual Code 단위 이력 조회 동작 확인
- [ ] Action type 필터 동작 확인
- [ ] 거래 방향(incoming/outgoing) 표시 확인
- [ ] 5개 테스트 시나리오 통과

---

## ⏭️ Next Steps

**다음 단계**: [Phase 4.6 - 통합 테스트](phase-4.6-integration-tests.md)
