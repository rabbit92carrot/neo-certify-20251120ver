# Phase 5.4: 폐기 처리

## 📋 Overview

**Phase 5.4**는 병원에서 사용기한 만료 또는 파손된 제품을 폐기하는 기능을 구현합니다.

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

### DisposalPage 컴포넌트

**파일 경로**: `src/pages/hospital/DisposalPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'

type DisposalReason = 'expired' | 'damaged' | 'contaminated' | 'other'

export function DisposalPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [virtualCode, setVirtualCode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState<DisposalReason>('expired')

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

  const disposalMutation = useMutation({
    mutationFn: async () => {
      // Find lot
      const { data: lot, error: lotError } = await supabase
        .from('lots')
        .select('*')
        .eq('virtual_code', virtualCode)
        .single()

      if (lotError || !lot) throw new Error('유효하지 않은 Virtual Code입니다.')

      // Check inventory
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('lot_id', lot.id)
        .eq('organization_id', userData!.organization_id)
        .single()

      if (!inventory || inventory.current_quantity < quantity) {
        throw new Error('재고가 부족합니다.')
      }

      // Create disposal record
      await supabase.from('disposals').insert({
        lot_id: lot.id,
        organization_id: userData!.organization_id,
        quantity: quantity,
        reason: reason,
        disposed_by: user!.id,
        disposed_at: new Date().toISOString(),
      })

      // Decrement inventory
      await supabase.rpc('decrement_inventory', {
        p_lot_id: lot.id,
        p_organization_id: userData!.organization_id,
        p_quantity: quantity,
        p_user_id: user!.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast({ title: SUCCESS_MESSAGES.DISPOSAL.PROCESSED })
      setVirtualCode('')
      setQuantity(1)
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.DISPOSAL.PROCESS_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">폐기 처리</h1>
        <p className="mt-1 text-sm text-gray-600">사용기한 만료 또는 파손된 제품을 폐기합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>폐기 정보 입력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Virtual Code</label>
            <Input
              value={virtualCode}
              onChange={(e) => setVirtualCode(e.target.value)}
              placeholder="12자리 Virtual Code"
              maxLength={VALIDATION.VIRTUAL_CODE_LENGTH}
              className="mt-1.5"
            />
          </div>

          <div>
            <label className="text-sm font-medium">폐기 수량</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1.5"
            />
          </div>

          <div>
            <label className="text-sm font-medium">폐기 사유</label>
            <Select value={reason} onValueChange={(v) => setReason(v as DisposalReason)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expired">사용기한 만료</SelectItem>
                <SelectItem value="damaged">제품 파손</SelectItem>
                <SelectItem value="contaminated">오염</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => disposalMutation.mutate()}
            disabled={virtualCode.length !== 12 || disposalMutation.isPending}
            className="w-full"
          >
            {disposalMutation.isPending ? '처리 중...' : '폐기 처리'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### Database Migration: disposals table

```sql
CREATE TABLE disposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID NOT NULL REFERENCES lots(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reason TEXT NOT NULL CHECK (reason IN ('expired', 'damaged', 'contaminated', 'other')),
  disposed_by UUID NOT NULL REFERENCES users(id),
  disposed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 Git Commit Message

```bash
feat(hospital): add disposal page

- Implement DisposalPage with virtual code input
- Add disposal reason selection
- Create disposals table
- Decrement inventory on disposal

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 5.5 - 병원 이력 조회](phase-5.5-hospital-history.md)
