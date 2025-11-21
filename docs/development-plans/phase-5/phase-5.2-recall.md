# Phase 5.2: 회수 (Recall)

## 📋 Overview

**Phase 5.2**는 병원에서 시술 후 24시간 이내에 자율적으로 제품을 회수하는 기능을 구현합니다. 회수된 제품은 소유권이 다시 병원으로 돌아오고, 환자에게 회수 알림이 발송됩니다.

**핵심 비즈니스 규칙** (PRD Section 15.4):
- **기준 시점**: 환자에게 메시지 발송 처리된 시점 (= 시술 완료 시점)
- **제한 시간**: 24시간
- **범위**: 일부 수량만 회수 가능 (부분 회수 지원)
- **시술 기록**: 회수해도 원래 시술 기록은 유지, 가상 코드 상태만 변경

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

### 1. RecallPage 컴포넌트

**파일 경로**: `src/pages/hospital/RecallPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow, parseISO, differenceInHours } from 'date-fns'
import { ko } from 'date-fns/locale'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { RECALL_RULES } from '@/constants/business-logic'
import type { TreatmentRecord, TreatmentDetail, VirtualCode } from '@/types/database'

// 회수 가능한 시술 (24시간 이내)
interface RecallableTreatment extends TreatmentRecord {
  details: (TreatmentDetail & {
    virtual_code: VirtualCode & {
      product: { name: string }
      lot: { lot_number: string; expiry_date: string }
    }
  })[]
  remaining_hours: number
  is_recallable: boolean
}

export function RecallPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())

  // 사용자 조직 정보 조회
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

  // 최근 시술 목록 조회 (48시간 이내, 24시간 지난 것도 표시)
  const { data: recentTreatments = [] } = useQuery<RecallableTreatment[]>({
    queryKey: ['recentTreatments', userData?.organization_id],
    queryFn: async () => {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('treatment_records')
        .select(
          `
          *,
          details:treatment_details(
            *,
            virtual_code:virtual_codes(
              id,
              virtual_code,
              status,
              product:products(name),
              lot:lots(lot_number, expiry_date)
            )
          )
        `
        )
        .eq('hospital_id', userData!.organization_id)
        .gte('treated_at', fortyEightHoursAgo)
        .order('treated_at', { ascending: false })

      if (error) throw error

      // 회수 가능 여부 계산
      const now = Date.now()
      return data.map((treatment) => {
        const treatedAt = new Date(treatment.treated_at).getTime()
        const elapsedMs = now - treatedAt
        const elapsedHours = elapsedMs / (60 * 60 * 1000)
        const remainingHours = RECALL_RULES.WINDOW_HOURS - elapsedHours

        return {
          ...treatment,
          remaining_hours: Math.max(0, remainingHours),
          is_recallable: elapsedMs <= RECALL_RULES.WINDOW_MS,
        } as RecallableTreatment
      })
    },
    enabled: !!userData?.organization_id,
    refetchInterval: 60000, // 1분마다 남은 시간 업데이트
  })

  // 가상 코드 선택 토글
  const toggleCodeSelection = (codeId: string, treatmentIsRecallable: boolean) => {
    if (!treatmentIsRecallable) return // 24시간 지나면 선택 불가

    const newSelection = new Set(selectedCodes)
    if (newSelection.has(codeId)) {
      newSelection.delete(codeId)
    } else {
      newSelection.add(codeId)
    }
    setSelectedCodes(newSelection)
  }

  // 회수 Mutation
  const recallMutation = useMutation({
    mutationFn: async () => {
      if (selectedCodes.size === 0) {
        throw new Error('회수할 제품을 선택해주세요.')
      }

      // PostgreSQL 함수 호출: recall_transaction
      const { data, error } = await supabase.rpc('recall_transaction', {
        p_virtual_code_ids: Array.from(selectedCodes),
        p_hospital_id: userData!.organization_id,
        p_user_id: user!.id,
      })

      if (error) throw error
      return data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['recentTreatments'] })
      queryClient.invalidateQueries({ queryKey: ['hospitalProducts'] })
      queryClient.invalidateQueries({ queryKey: ['notificationMessages'] })

      toast({
        title: SUCCESS_MESSAGES.RECALL.COMPLETED,
        description: `${result.recalled_count}개 제품이 회수되었습니다.`,
      })

      setSelectedCodes(new Set())
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.RECALL.FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">회수 (Recall)</h1>
        <p className="mt-1 text-sm text-gray-600">
          시술 후 24시간 이내에 제품을 회수할 수 있습니다. 일부 수량만 선택하여 회수 가능합니다.
        </p>
      </div>

      {/* 안내 메시지 */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          회수 가능 기간은 시술 완료 시점부터 <strong>24시간</strong>입니다. 시간이 지나면 회수가
          불가능합니다.
        </AlertDescription>
      </Alert>

      {/* 최근 시술 목록 */}
      {recentTreatments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            최근 48시간 이내 시술 기록이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recentTreatments.map((treatment) => (
            <Card key={treatment.id} className={!treatment.is_recallable ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      시술 기록 #{treatment.id.slice(0, 8)}
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                      환자: {treatment.patient_phone} | 시술 시간:{' '}
                      {formatDistanceToNow(parseISO(treatment.treated_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    {treatment.is_recallable ? (
                      <Badge variant="default" className="bg-green-500">
                        <Clock className="mr-1 h-3 w-3" />
                        회수 가능 (남은 시간: {Math.floor(treatment.remaining_hours)}시간{' '}
                        {Math.floor((treatment.remaining_hours % 1) * 60)}분)
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        회수 불가 (24시간 경과)
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">선택</TableHead>
                      <TableHead>제품명</TableHead>
                      <TableHead>가상 코드</TableHead>
                      <TableHead>Lot 번호</TableHead>
                      <TableHead>사용기한</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treatment.details.map((detail) => (
                      <TableRow key={detail.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCodes.has(detail.virtual_code_id)}
                            onCheckedChange={() =>
                              toggleCodeSelection(detail.virtual_code_id, treatment.is_recallable)
                            }
                            disabled={
                              !treatment.is_recallable || detail.virtual_code.status !== 'USED'
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {detail.virtual_code.product.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {detail.virtual_code.virtual_code}
                        </TableCell>
                        <TableCell>{detail.virtual_code.lot.lot_number}</TableCell>
                        <TableCell>{detail.virtual_code.lot.expiry_date}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              detail.virtual_code.status === 'USED' ? 'default' : 'secondary'
                            }
                          >
                            {detail.virtual_code.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 회수 실행 버튼 */}
      {selectedCodes.size > 0 && (
        <Card className="bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">
                  선택된 제품: {selectedCodes.size}개
                </p>
                <p className="text-sm text-blue-700">
                  회수 후 제품은 병원 재고로 복귀하고, 환자에게 회수 알림이 발송됩니다.
                </p>
              </div>
              <Button
                onClick={() => recallMutation.mutate()}
                disabled={recallMutation.isPending}
                size="lg"
              >
                {recallMutation.isPending ? '회수 중...' : '회수 실행'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

### 2. PostgreSQL Function: recall_transaction

**파일 경로**: `supabase/migrations/[timestamp]_create_recall_transaction.sql`

```sql
CREATE OR REPLACE FUNCTION recall_transaction(
  p_virtual_code_ids UUID[],
  p_hospital_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_code_id UUID;
  v_treatment_record_id UUID;
  v_treated_at TIMESTAMPTZ;
  v_patient_phone TEXT;
  v_recalled_count INT := 0;
  v_time_limit INTERVAL := '24 hours';
BEGIN
  -- 각 가상 코드에 대해 회수 처리
  FOREACH v_code_id IN ARRAY p_virtual_code_ids
  LOOP
    -- 가상 코드 정보 조회
    SELECT
      td.treatment_record_id,
      tr.treated_at,
      tr.patient_phone
    INTO
      v_treatment_record_id,
      v_treated_at,
      v_patient_phone
    FROM virtual_codes vc
    JOIN treatment_details td ON vc.id = td.virtual_code_id
    JOIN treatment_records tr ON td.treatment_record_id = tr.id
    WHERE vc.id = v_code_id
      AND vc.status = 'USED'
      AND tr.hospital_id = p_hospital_id
    LIMIT 1;

    -- 시술 기록이 없거나 병원이 다르면 스킵
    IF NOT FOUND THEN
      RAISE EXCEPTION '유효하지 않은 가상 코드이거나 권한이 없습니다: %', v_code_id;
    END IF;

    -- 24시간 경과 확인
    IF (NOW() - v_treated_at) > v_time_limit THEN
      RAISE EXCEPTION '회수 가능 시간(24시간)이 경과했습니다.';
    END IF;

    -- 1. 가상 코드 상태 변경: USED → IN_STOCK
    UPDATE virtual_codes
    SET
      status = 'IN_STOCK',
      owner_id = p_hospital_id, -- 소유권 복귀
      updated_at = NOW()
    WHERE id = v_code_id;

    -- 2. 이력 기록
    INSERT INTO history (
      virtual_code_id,
      action,
      from_organization_id,
      to_organization_id,
      quantity,
      performed_by,
      performed_at
    ) VALUES (
      v_code_id,
      'RECALL',
      v_patient_phone, -- from: 환자
      p_hospital_id,   -- to: 병원
      1,
      p_user_id,
      NOW()
    );

    v_recalled_count := v_recalled_count + 1;
  END LOOP;

  -- 3. 회수 알림 메시지 생성 (환자에게 발송)
  INSERT INTO notification_messages (
    patient_phone,
    message_type,
    message_content,
    treatment_record_id,
    created_at
  ) VALUES (
    v_patient_phone,
    'RECALL',
    format(
      '[회수 알림] 병원에서 %s개 제품을 회수하였습니다. 궁금하신 사항은 병원으로 문의해주세요.',
      v_recalled_count
    ),
    v_treatment_record_id,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'recalled_count', v_recalled_count
  );
END;
$$ LANGUAGE plpgsql;
```

---

### 3. Constants 정의

**파일 경로**: `src/constants/business-logic.ts` (확인/추가)

```typescript
export const RECALL_RULES = {
  WINDOW_HOURS: 24,
  WINDOW_MS: 24 * 60 * 60 * 1000,

  /**
   * 회수 가능 여부 확인
   * @param treatmentDate ISO timestamp string (시술 완료 시점)
   * @returns true if recallable (24시간 이내)
   */
  isRecallable: (treatmentDate: string): boolean => {
    const treated = new Date(treatmentDate).getTime()
    const now = Date.now()
    const elapsed = now - treated
    return elapsed <= RECALL_RULES.WINDOW_MS
  },
} as const
```

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존
  RECALL: {
    COMPLETED: '회수가 완료되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존
  RECALL: {
    FAILED: '회수에 실패했습니다.',
    TIME_EXCEEDED: '회수 가능 시간(24시간)이 경과했습니다.',
    NO_SELECTION: '회수할 제품을 선택해주세요.',
  },
} as const
```

---

### 4. 라우팅 설정

**파일 경로**: `src/constants/routes.ts` (추가)

```typescript
export const ROUTES = {
  // ... 기존
  HOSPITAL: {
    TREATMENT: '/hospital/treatment',
    RECALL: '/hospital/recall', // ← 추가
    INVENTORY: '/hospital/inventory',
    HISTORY: '/hospital/history',
  },
} as const
```

**파일 경로**: `src/App.tsx` (라우트 추가)

```typescript
import { RecallPage } from '@/pages/hospital/RecallPage'

// ...
<Route path={ROUTES.HOSPITAL.RECALL} element={<RecallPage />} />
```

---

## ✅ Acceptance Criteria

### Functional Requirements
- [ ] 최근 48시간 이내 시술 기록을 조회할 수 있다
- [ ] 각 시술 기록의 회수 가능 여부를 표시한다 (24시간 기준)
- [ ] 남은 회수 가능 시간을 표시한다 (시간 + 분 단위)
- [ ] 회수 가능한 시술의 가상 코드를 개별 선택할 수 있다 (부분 회수)
- [ ] 24시간이 지난 시술은 선택할 수 없다
- [ ] 이미 회수되거나 상태가 USED가 아닌 코드는 선택할 수 없다
- [ ] 회수 실행 시 선택된 가상 코드의 상태가 IN_STOCK으로 변경된다
- [ ] 회수된 가상 코드의 소유권이 병원으로 복귀한다
- [ ] 회수 알림 메시지가 환자에게 생성된다 (notification_messages 테이블)
- [ ] 회수 이력이 history 테이블에 기록된다

### Technical Requirements
- [ ] `recall_transaction` PostgreSQL 함수 사용 (원자성 보장)
- [ ] 24시간 경과 확인은 서버 시간 기준 (NOW() 함수)
- [ ] 1분마다 자동으로 남은 시간 업데이트 (refetchInterval)
- [ ] 트랜잭션 중 하나라도 실패하면 전체 롤백
- [ ] 모든 상수는 `src/constants/`에서 import

### UI/UX Requirements
- [ ] 회수 가능한 시술은 녹색 배지 표시
- [ ] 회수 불가능한 시술은 회색 배지 + 투명도 낮춤
- [ ] 남은 시간을 "X시간 Y분" 형태로 표시
- [ ] 선택된 제품 개수를 하단 카드에 표시
- [ ] 회수 실행 버튼은 선택된 제품이 있을 때만 표시
- [ ] 회수 완료 후 선택 상태 초기화

---

## 🧪 Testing

### Unit Tests

**파일 경로**: `src/pages/hospital/__tests__/RecallPage.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecallPage } from '../RecallPage'
import { RECALL_RULES } from '@/constants/business-logic'

describe('RecallPage', () => {
  it('renders recall page with instructions', () => {
    render(<RecallPage />)
    expect(screen.getByText('회수 (Recall)')).toBeInTheDocument()
    expect(screen.getByText(/24시간 이내/)).toBeInTheDocument()
  })

  it('displays recallable treatments with green badge', async () => {
    // Mock: 23시간 전 시술
    // 녹색 배지 표시 확인
  })

  it('displays non-recallable treatments with gray badge', async () => {
    // Mock: 25시간 전 시술
    // 회색 배지 + disabled 확인
  })

  it('calculates remaining time correctly', () => {
    const treatedAt = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() // 20시간 전
    expect(RECALL_RULES.isRecallable(treatedAt)).toBe(true)
  })

  it('prevents selection of non-recallable codes', () => {
    // 24시간 지난 시술의 체크박스 disabled 확인
  })
})
```

### Integration Tests

**파일 경로**: `src/pages/hospital/__tests__/RecallPage.integration.test.tsx`

```typescript
describe('RecallPage Integration', () => {
  it('completes full recall workflow', async () => {
    // 1. 최근 시술 목록 조회
    // 2. 회수 가능한 시술 확인
    // 3. 가상 코드 선택
    // 4. 회수 실행
    // 5. recall_transaction 호출 확인
    // 6. 성공 토스트 확인
    // 7. 선택 상태 초기화 확인
  })

  it('shows error when 24 hours exceeded', async () => {
    // Mock: 서버에서 시간 경과 에러 반환
    // 에러 메시지 표시 확인
  })

  it('updates remaining time every minute', async () => {
    // refetchInterval 설정 확인
    // 1분 후 시간 업데이트 확인
  })
})
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `src/pages/hospital/RecallPage.tsx`
- `supabase/migrations/[timestamp]_create_recall_transaction.sql`
- `src/pages/hospital/__tests__/RecallPage.test.tsx`
- `src/pages/hospital/__tests__/RecallPage.integration.test.tsx`

**수정**:
- `src/constants/business-logic.ts` (RECALL_RULES 추가)
- `src/constants/messages.ts` (RECALL 메시지 추가)
- `src/constants/routes.ts` (HOSPITAL.RECALL 경로 추가)
- `src/App.tsx` (라우트 추가)
- `src/components/layout/HospitalNavigation.tsx` (메뉴 추가)

---

## 🔄 Git Commit Message

```bash
feat(hospital): add recall functionality with 24-hour time limit

- Implement RecallPage with recent treatment list
- Display remaining recallable time per treatment
- Support partial recall (select individual codes)
- Enforce 24-hour time limit from treatment timestamp
- Restore ownership to hospital on recall
- Generate recall notification message for patient
- Auto-refresh remaining time every minute

Follows PRD Section 15.4 recall rules.

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 5.3 - 반품 (Hospital Return)](phase-5.3-hospital-return.md)

---

## 📌 Notes

### PRD 준수 사항
- ✅ PRD Section 15.4 (회수 규칙) 완벽 구현
- ✅ 24시간 기준: 시술 완료 시점 (treated_at)
- ✅ 부분 회수 지원: 개별 가상 코드 선택 가능
- ✅ 시술 기록 유지: treatment_records 삭제하지 않음, 가상 코드 상태만 변경

### 기술적 근거
- **시간 계산**: 서버 시간(NOW()) 기준으로 정확히 24시간 검증
- **실시간 업데이트**: refetchInterval로 매 분마다 남은 시간 갱신
- **원자성 보장**: PostgreSQL 함수 내 트랜잭션으로 전체 성공/실패 보장
- **알림 발송**: notification_messages 테이블에 회수 알림 자동 생성

### Mock KakaoTalk 연동
- 회수 완료 시 `notification_messages` 테이블에 RECALL 타입 메시지 생성
- Phase 6.6 (Mock KakaoTalk) 페이지에서 환자 전화번호로 조회 가능
- 메시지 내용: "[회수 알림] 병원에서 N개 제품을 회수하였습니다."
