# Phase 5.3: 사용 등록 (환자 투여)

## 📋 Overview

**Phase 5.3**은 병원에서 환자에게 제품을 사용(투여)하는 기능을 구현합니다. Virtual Code 스캔으로 제품을 확인하고 환자 정보와 함께 사용 기록을 남깁니다.

---

## 📦 Work Content

### UsageRegistrationPage 컴포넌트

**파일 경로**: `src/pages/hospital/UsageRegistrationPage.tsx`

```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { VALIDATION_RULES } from '@/constants/validation'

const usageSchema = z.object({
  virtual_code: z.string().length(12, 'Virtual Code는 12자리여야 합니다.'),
  patient_id: z
    .string()
    .min(1, '환자 ID를 입력해주세요.')
    .max(VALIDATION_RULES.USAGE.PATIENT_ID_MAX_LENGTH, '환자 ID가 너무 깁니다.'),
  quantity: z.number().min(1, '수량은 1개 이상이어야 합니다.'),
})

type UsageFormData = z.infer<typeof usageSchema>

export function UsageRegistrationPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [lotInfo, setLotInfo] = useState<any>(null)

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

  const form = useForm<UsageFormData>({
    resolver: zodResolver(usageSchema),
    defaultValues: {
      virtual_code: '',
      patient_id: '',
      quantity: 1,
    },
  })

  const virtualCode = form.watch('virtual_code')

  // Verify virtual code and fetch lot info
  const { data: verifiedLot } = useQuery({
    queryKey: ['verifyLot', virtualCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lots')
        .select('*, product:products(*)')
        .eq('virtual_code', virtualCode)
        .single()

      if (error) throw error
      return data
    },
    enabled: virtualCode.length === 12,
  })

  // Register usage mutation
  const registerUsageMutation = useMutation({
    mutationFn: async (data: UsageFormData) => {
      if (!verifiedLot) {
        throw new Error('유효하지 않은 Virtual Code입니다.')
      }

      // Check inventory
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('lot_id', verifiedLot.id)
        .eq('organization_id', userData!.organization_id)
        .single()

      if (!inventory || inventory.current_quantity < data.quantity) {
        throw new Error('재고가 부족합니다.')
      }

      // Create usage record
      await supabase.from('usages').insert({
        lot_id: verifiedLot.id,
        organization_id: userData!.organization_id,
        patient_id: data.patient_id,
        quantity: data.quantity,
        used_by: user!.id,
        used_at: new Date().toISOString(),
      })

      // Decrement inventory
      await supabase.rpc('decrement_inventory', {
        p_lot_id: verifiedLot.id,
        p_organization_id: userData!.organization_id,
        p_quantity: data.quantity,
        p_user_id: user!.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['usages'] })
      toast({ title: SUCCESS_MESSAGES.USAGE.REGISTERED })
      form.reset()
      setLotInfo(null)
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.USAGE.REGISTER_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">사용 등록</h1>
        <p className="mt-1 text-sm text-gray-600">환자에게 제품을 사용(투여)하고 기록합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>사용 정보 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => registerUsageMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="virtual_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Virtual Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="12자리 Virtual Code" maxLength={12} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {verifiedLot && (
                <div className="rounded-lg border bg-blue-50 p-4">
                  <div className="text-sm font-semibold text-blue-900">제품 정보</div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>제품명: {verifiedLot.product.name}</div>
                    <div>Lot 번호: {verifiedLot.lot_number}</div>
                    <div>사용기한: {verifiedLot.expiry_date}</div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="patient_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>환자 ID *</FormLabel>
                    <FormControl>
                      <Input placeholder="환자 등록번호" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사용 수량 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={registerUsageMutation.isPending} className="w-full">
                {registerUsageMutation.isPending ? '등록 중...' : '사용 등록'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### Database Migration: usages table

```sql
CREATE TABLE usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID NOT NULL REFERENCES lots(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  patient_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  used_by UUID NOT NULL REFERENCES users(id),
  used_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usages_lot_id ON usages(lot_id);
CREATE INDEX idx_usages_organization_id ON usages(organization_id);
CREATE INDEX idx_usages_patient_id ON usages(patient_id);
```

---

## 🔧 Constants Definitions

**파일 경로**: `src/constants/validation.ts` (추가)

```typescript
export const VALIDATION_RULES = {
  // ... 기존
  USAGE: {
    PATIENT_ID_MAX_LENGTH: 50,
  },
} as const
```

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존
  USAGE: {
    REGISTERED: '사용 등록이 완료되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존
  USAGE: {
    REGISTER_FAILED: '사용 등록에 실패했습니다.',
  },
} as const
```

---

## 🔄 Git Commit Message

```bash
feat(hospital): add usage registration page

- Implement UsageRegistrationPage with virtual code verification
- Add patient ID and quantity input
- Create usages table for tracking patient usage
- Decrement inventory on usage registration

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 5.4 - 폐기 처리](phase-5.4-disposal.md)
