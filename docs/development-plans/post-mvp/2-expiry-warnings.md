# Post-MVP 2: 사용기한 만료 경고

## 📋 Overview

**Post-MVP 2**는 제품의 사용기한이 임박했을 때 자동으로 경고를 생성하고, 조직에 알림을 보내는 기능을 구현합니다. 사용기한 경고 설정 및 경고 이력 관리를 포함합니다.

---

## 📦 Work Content

### 1. ExpiryWarningSettings 컴포넌트

**파일 경로**: `src/pages/settings/ExpiryWarningSettings.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { VALIDATION_RULES } from '@/constants/validation'

const expiryWarningSchema = z.object({
  expiry_warning_enabled: z.boolean(),
  warning_days_before: z.number().min(VALIDATION_RULES.EXPIRY_WARNING.DAYS_MIN).max(VALIDATION_RULES.EXPIRY_WARNING.DAYS_MAX),
  notify_email: z.boolean(),
  notify_in_app: z.boolean(),
})

type ExpiryWarningFormData = z.infer<typeof expiryWarningSchema>

interface ExpiryWarningSettings {
  id: string
  organization_id: string
  expiry_warning_enabled: boolean
  warning_days_before: number
  notify_email: boolean
  notify_in_app: boolean
  created_at: string
  updated_at: string
}

export function ExpiryWarningSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

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

  const { data: settings, isLoading } = useQuery<ExpiryWarningSettings>({
    queryKey: ['expiryWarningSettings', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expiry_warning_settings')
        .select('*')
        .eq('organization_id', userData!.organization_id)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        return {
          id: '',
          organization_id: userData!.organization_id,
          expiry_warning_enabled: true,
          warning_days_before: VALIDATION_RULES.EXPIRY_WARNING.DAYS_DEFAULT,
          notify_email: false,
          notify_in_app: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }

      return data
    },
    enabled: !!userData?.organization_id,
  })

  const form = useForm<ExpiryWarningFormData>({
    resolver: zodResolver(expiryWarningSchema),
    values: settings
      ? {
          expiry_warning_enabled: settings.expiry_warning_enabled,
          warning_days_before: settings.warning_days_before,
          notify_email: settings.notify_email,
          notify_in_app: settings.notify_in_app,
        }
      : undefined,
  })

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: ExpiryWarningFormData) => {
      const payload = {
        organization_id: userData!.organization_id,
        ...data,
        updated_at: new Date().toISOString(),
      }

      if (settings?.id) {
        const { error } = await supabase
          .from('expiry_warning_settings')
          .update(payload)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('expiry_warning_settings').insert(payload)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiryWarningSettings'] })
      toast({ title: SUCCESS_MESSAGES.EXPIRY_WARNING.SETTINGS_SAVED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.EXPIRY_WARNING.SETTINGS_SAVE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">설정을 불러오는 중...</div>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">사용기한 경고 설정</h1>
        <p className="mt-1 text-sm text-gray-600">제품 사용기한 만료 임박 시 자동 경고 설정을 관리합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>경고 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveSettingsMutation.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="expiry_warning_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">사용기한 경고</FormLabel>
                      <FormDescription>사용기한이 임박한 제품에 대해 경고를 받습니다</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warning_days_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>경고 기준 일수 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={VALIDATION_RULES.EXPIRY_WARNING.DAYS_MIN}
                        max={VALIDATION_RULES.EXPIRY_WARNING.DAYS_MAX}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      사용기한이 이 일수 이내로 남았을 때 경고를 받습니다 (기본값:{' '}
                      {VALIDATION_RULES.EXPIRY_WARNING.DAYS_DEFAULT}일)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="text-sm font-medium">경고 수신 방법</div>

                <FormField
                  control={form.control}
                  name="notify_in_app"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">앱 내 경고</FormLabel>
                        <FormDescription>시스템 내에서 경고를 확인합니다</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notify_email"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">이메일 경고</FormLabel>
                        <FormDescription>등록된 이메일로 경고를 받습니다</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={saveSettingsMutation.isPending} className="w-full">
                {saveSettingsMutation.isPending ? '저장 중...' : '설정 저장'}
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

### 2. ExpiryWarningsPage 컴포넌트

**파일 경로**: `src/pages/warnings/ExpiryWarningsPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { WARNING_STATUS } from '@/constants/status'

interface ExpiryWarning {
  id: string
  organization_id: string
  product_id: string
  lot_id: string
  expiry_date: string
  days_until_expiry: number
  warning_threshold: number
  status: string
  acknowledged_at: string | null
  acknowledged_by: string | null
  created_at: string
  product: {
    name: string
    model_name: string
  }
  lot: {
    lot_number: string
  }
  inventory: {
    current_quantity: number
  }
}

export function ExpiryWarningsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('active')

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

  const { data: warnings, isLoading } = useQuery<ExpiryWarning[]>({
    queryKey: ['expiryWarnings', userData?.organization_id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('expiry_warnings')
        .select(`
          *,
          product:products(name, model_name),
          lot:lots(lot_number),
          inventory:inventory!inner(current_quantity)
        `)
        .eq('organization_id', userData!.organization_id)
        .order('days_until_expiry', { ascending: true })

      if (statusFilter === 'active') {
        query = query.eq('status', WARNING_STATUS.ACTIVE)
      } else if (statusFilter === 'acknowledged') {
        query = query.eq('status', WARNING_STATUS.ACKNOWLEDGED)
      }

      const { data, error } = await query

      if (error) throw error
      return data as unknown as ExpiryWarning[]
    },
    enabled: !!userData?.organization_id,
  })

  const acknowledgeWarningMutation = useMutation({
    mutationFn: async (warningId: string) => {
      const { error } = await supabase
        .from('expiry_warnings')
        .update({
          status: WARNING_STATUS.ACKNOWLEDGED,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user!.id,
        })
        .eq('id', warningId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiryWarnings'] })
      toast({ title: SUCCESS_MESSAGES.EXPIRY_WARNING.ACKNOWLEDGED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.EXPIRY_WARNING.ACKNOWLEDGE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">경고를 불러오는 중...</div>
  }

  const activeWarningsCount = warnings?.filter((w) => w.status === WARNING_STATUS.ACTIVE).length ?? 0
  const criticalWarningsCount =
    warnings?.filter((w) => w.status === WARNING_STATUS.ACTIVE && w.days_until_expiry <= 7).length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">사용기한 경고</h1>
        <p className="mt-1 text-sm text-gray-600">사용기한 만료 임박 제품을 확인하고 관리합니다</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">활성 경고</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{activeWarningsCount}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">긴급 경고 (7일 이내)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalWarningsCount}건</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>경고 목록</CardTitle>
          <div className="mt-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="acknowledged">확인됨</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제품명</TableHead>
                <TableHead>Lot 번호</TableHead>
                <TableHead>사용기한</TableHead>
                <TableHead>남은 일수</TableHead>
                <TableHead>재고</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>발생일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warnings?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    경고가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                warnings?.map((warning) => {
                  const isCritical = warning.days_until_expiry <= 7
                  return (
                    <TableRow key={warning.id} className={isCritical ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">{warning.product.name}</TableCell>
                      <TableCell className="font-mono text-sm">{warning.lot.lot_number}</TableCell>
                      <TableCell>{warning.expiry_date}</TableCell>
                      <TableCell>
                        <Badge variant={isCritical ? 'destructive' : 'secondary'}>
                          {warning.days_until_expiry}일 남음
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{warning.inventory.current_quantity}개</TableCell>
                      <TableCell>
                        <Badge variant={warning.status === WARNING_STATUS.ACTIVE ? 'default' : 'outline'}>
                          {warning.status === WARNING_STATUS.ACTIVE ? '활성' : '확인됨'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(warning.created_at).toLocaleDateString('ko-KR')}</TableCell>
                      <TableCell>
                        {warning.status === WARNING_STATUS.ACTIVE && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acknowledgeWarningMutation.mutate(warning.id)}
                            disabled={acknowledgeWarningMutation.isPending}
                          >
                            확인
                          </Button>
                        )}
                      </TableCell>
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

## 🗄️ Database Migration

### 1. expiry_warning_settings 테이블

**파일 경로**: `supabase/migrations/XXXXXX_create_expiry_warning_settings.sql`

```sql
CREATE TABLE expiry_warning_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) UNIQUE,
  expiry_warning_enabled BOOLEAN NOT NULL DEFAULT true,
  warning_days_before INTEGER NOT NULL DEFAULT 30 CHECK (warning_days_before >= 1 AND warning_days_before <= 365),
  notify_email BOOLEAN NOT NULL DEFAULT false,
  notify_in_app BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expiry_warning_settings_org ON expiry_warning_settings(organization_id);

COMMENT ON TABLE expiry_warning_settings IS '조직별 사용기한 경고 설정';
COMMENT ON COLUMN expiry_warning_settings.warning_days_before IS '사용기한 몇 일 전에 경고할지 (기본: 30일)';
```

### 2. expiry_warnings 테이블

**파일 경로**: `supabase/migrations/XXXXXX_create_expiry_warnings.sql`

```sql
CREATE TABLE expiry_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  lot_id UUID NOT NULL REFERENCES lots(id),
  expiry_date DATE NOT NULL,
  days_until_expiry INTEGER NOT NULL,
  warning_threshold INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expiry_warnings_org ON expiry_warnings(organization_id);
CREATE INDEX idx_expiry_warnings_status ON expiry_warnings(status);
CREATE INDEX idx_expiry_warnings_lot ON expiry_warnings(lot_id);
CREATE INDEX idx_expiry_warnings_days ON expiry_warnings(days_until_expiry);

COMMENT ON TABLE expiry_warnings IS '사용기한 만료 경고 이력';
COMMENT ON COLUMN expiry_warnings.days_until_expiry IS '경고 발생 당시 남은 일수';
COMMENT ON COLUMN expiry_warnings.warning_threshold IS '경고 발생 기준 (N일 전)';
```

### 3. Scheduled Job: 매일 사용기한 경고 체크

**파일 경로**: `supabase/migrations/XXXXXX_create_expiry_warning_job.sql`

```sql
-- Function to generate expiry warnings
CREATE OR REPLACE FUNCTION generate_expiry_warnings()
RETURNS void AS $$
DECLARE
  v_settings RECORD;
  v_inventory RECORD;
  v_lot RECORD;
  v_days_until_expiry INTEGER;
  v_existing_warning UUID;
BEGIN
  -- Loop through all organizations with warning enabled
  FOR v_settings IN
    SELECT * FROM expiry_warning_settings WHERE expiry_warning_enabled = true
  LOOP
    -- Loop through inventory for this organization
    FOR v_inventory IN
      SELECT * FROM inventory
      WHERE organization_id = v_settings.organization_id
        AND current_quantity > 0
    LOOP
      -- Get lot info
      SELECT * INTO v_lot FROM lots WHERE id = v_inventory.lot_id;

      -- Calculate days until expiry
      v_days_until_expiry := v_lot.expiry_date::date - CURRENT_DATE;

      -- Check if warning is needed
      IF v_days_until_expiry <= v_settings.warning_days_before AND v_days_until_expiry >= 0 THEN
        -- Check if there's already an active warning for this lot
        SELECT id INTO v_existing_warning
        FROM expiry_warnings
        WHERE lot_id = v_inventory.lot_id
          AND organization_id = v_settings.organization_id
          AND status = 'active';

        -- Only create warning if no active warning exists
        IF NOT FOUND THEN
          INSERT INTO expiry_warnings (
            organization_id,
            product_id,
            lot_id,
            expiry_date,
            days_until_expiry,
            warning_threshold
          ) VALUES (
            v_settings.organization_id,
            v_lot.product_id,
            v_inventory.lot_id,
            v_lot.expiry_date,
            v_days_until_expiry,
            v_settings.warning_days_before
          );
        ELSE
          -- Update existing warning with current days_until_expiry
          UPDATE expiry_warnings
          SET days_until_expiry = v_days_until_expiry
          WHERE id = v_existing_warning;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Note: Scheduled jobs require pg_cron extension or external cron job
-- Example with pg_cron (if available):
-- SELECT cron.schedule('generate-expiry-warnings', '0 2 * * *', 'SELECT generate_expiry_warnings()');
```

---

## 🔧 Constants Definitions

**파일 경로**: `src/constants/validation.ts` (추가)

```typescript
export const VALIDATION_RULES = {
  // ... 기존
  EXPIRY_WARNING: {
    DAYS_MIN: 1,
    DAYS_MAX: 365,
    DAYS_DEFAULT: 30,
  },
} as const
```

**파일 경로**: `src/constants/status.ts` (추가)

```typescript
export const WARNING_STATUS = {
  ACTIVE: 'active',
  ACKNOWLEDGED: 'acknowledged',
} as const
```

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존
  EXPIRY_WARNING: {
    SETTINGS_SAVED: '경고 설정이 저장되었습니다.',
    ACKNOWLEDGED: '경고가 확인되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존
  EXPIRY_WARNING: {
    SETTINGS_SAVE_FAILED: '경고 설정 저장에 실패했습니다.',
    ACKNOWLEDGE_FAILED: '경고 확인에 실패했습니다.',
  },
} as const
```

---

## 🧪 Test Scenarios

### 1. Unit Test: ExpiryWarningsPage

**파일 경로**: `src/pages/warnings/__tests__/ExpiryWarningsPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ExpiryWarningsPage } from '../ExpiryWarningsPage'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}))

const mockWarnings = [
  {
    id: 'warning-1',
    organization_id: 'org-1',
    product_id: 'product-1',
    lot_id: 'lot-1',
    expiry_date: '2025-02-15',
    days_until_expiry: 5,
    warning_threshold: 30,
    status: 'ACTIVE',
    acknowledged_at: null,
    acknowledged_by: null,
    created_at: '2025-01-20T00:00:00Z',
    product: {
      name: '의료용 실',
      model_name: 'Thread-A100',
    },
    lot: {
      lot_number: 'LOT-001',
    },
    inventory: {
      current_quantity: 50,
    },
  },
]

describe('ExpiryWarningsPage', () => {
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
        <ExpiryWarningsPage />
      </QueryClientProvider>
    )
  }

  it('경고 목록을 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        } as any
      }
      if (table === 'expiry_warnings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockWarnings,
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
      expect(screen.getByText('5일 남음')).toBeInTheDocument()
    })
  })

  it('긴급 경고가 빨간색으로 표시되어야 한다', async () => {
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { organization_id: 'org-1' },
            error: null,
          }),
        } as any
      }
      if (table === 'expiry_warnings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockWarnings,
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    renderComponent()

    await waitFor(() => {
      const badge = screen.getByText('5일 남음')
      expect(badge).toHaveClass('bg-red-600') // destructive variant
    })
  })
})
```

---

## 🚨 Troubleshooting

### Issue 1: 경고가 생성되지 않음

**증상**: 사용기한이 임박했지만 경고가 생성되지 않음

**원인**: Scheduled job이 실행되지 않음

**해결방법**:
```sql
-- 수동으로 함수 실행하여 테스트
SELECT generate_expiry_warnings();

-- pg_cron 확인 (있는 경우)
SELECT * FROM cron.job;
```

### Issue 2: 만료된 제품에도 경고가 생성됨

**증상**: 이미 만료된 제품(expiry_date < CURRENT_DATE)에도 경고 생성

**원인**: 날짜 조건 누락

**해결방법**:
```sql
-- generate_expiry_warnings 함수 수정
IF v_days_until_expiry <= v_settings.warning_days_before AND v_days_until_expiry >= 0 THEN
  -- ↑ v_days_until_expiry >= 0 조건 추가
END IF;
```

### Issue 3: 중복 경고 생성됨

**증상**: 같은 Lot에 대해 여러 개의 활성 경고 생성

**원인**: 기존 경고 확인 로직 오류

**해결방법**:
```sql
SELECT id INTO v_existing_warning
FROM expiry_warnings
WHERE lot_id = v_inventory.lot_id
  AND organization_id = v_settings.organization_id
  AND status = 'active'; -- ← 반드시 포함
```

### Issue 4: 경고 통계가 부정확함

**증상**: 활성 경고 카운트가 실제와 다름

**원인**: 필터 조건과 통계 조건 불일치

**해결방법**:
```typescript
const activeWarningsCount = warnings?.filter((w) => w.status === WARNING_STATUS.ACTIVE).length ?? 0

// 또는 서버에서 count 쿼리
const { count } = await supabase
  .from('expiry_warnings')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', organizationId)
  .eq('status', 'active')
```

### Issue 5: Scheduled job 성능 문제

**증상**: generate_expiry_warnings 함수 실행 시간이 너무 오래 걸림

**원인**: 대량의 inventory 레코드 처리

**해결방법**:
```sql
-- 인덱스 추가
CREATE INDEX idx_inventory_org_quantity ON inventory(organization_id, current_quantity) WHERE current_quantity > 0;

-- 배치 처리로 개선
CREATE OR REPLACE FUNCTION generate_expiry_warnings_batch(batch_size INTEGER DEFAULT 100)
RETURNS void AS $$
-- 배치 단위로 처리
$$;
```

---

## ✅ Definition of Done

### 기능 구현
- [ ] ExpiryWarningSettings 컴포넌트 구현 완료
- [ ] ExpiryWarningsPage 컴포넌트 구현 완료
- [ ] 경고 기준 일수 설정 기능
- [ ] 경고 수신 방법 설정 (앱 내/이메일)
- [ ] 경고 목록 조회 기능
- [ ] 경고 확인 기능
- [ ] 상태 필터 (활성/확인됨/전체)
- [ ] 긴급 경고 강조 표시 (7일 이내)

### 데이터베이스
- [ ] expiry_warning_settings 테이블 생성
- [ ] expiry_warnings 테이블 생성
- [ ] generate_expiry_warnings() 함수 생성
- [ ] Scheduled job 설정 (pg_cron 또는 외부)
- [ ] 인덱스 추가 (organization_id, status, days_until_expiry)

### UI/UX
- [ ] 설정 폼 레이아웃
- [ ] Switch 컴포넌트로 토글 설정
- [ ] 경고 목록 테이블
- [ ] 활성/긴급 경고 카운트 표시
- [ ] 긴급 경고 행 배경색 강조
- [ ] 상태별 Badge 색상 구분
- [ ] 빈 상태 메시지 표시

### 상수 관리
- [ ] VALIDATION_RULES.EXPIRY_WARNING 정의
- [ ] WARNING_STATUS 상수 정의
- [ ] SUCCESS_MESSAGES.EXPIRY_WARNING 정의
- [ ] ERROR_MESSAGES.EXPIRY_WARNING 정의

### 테스트
- [ ] Unit Test 작성 (2개 시나리오)
- [ ] 경고 목록 표시 테스트
- [ ] 긴급 경고 강조 테스트
- [ ] 모든 테스트 통과

### 코드 품질
- [ ] TypeScript strict 모드 통과
- [ ] 'any' 타입 사용 최소화
- [ ] 모든 리터럴 값 상수화
- [ ] Zod 스키마 검증
- [ ] Error boundary 처리
- [ ] Loading state 처리
- [ ] Accessibility 준수

### 문서화
- [ ] 컴포넌트 구조 문서화
- [ ] Database schema 문서화
- [ ] Scheduled job 문서화
- [ ] Troubleshooting 가이드 작성 (5개 이슈)
- [ ] Test scenarios 문서화

### 버전 관리
- [ ] Git commit (Conventional Commits)
- [ ] Migration 파일 버전 관리

---

## 🔄 Git Commit Message

```bash
feat(business-logic): add expiry warning system

- Implement ExpiryWarningSettings for warning days configuration
- Implement ExpiryWarningsPage for expiry warning management
- Create expiry_warning_settings table
- Create expiry_warnings table
- Add scheduled job to generate daily expiry warnings
- Add warning acknowledgment workflow
- Add critical warning highlight (7 days or less)
- Add WARNING_STATUS and EXPIRY_WARNING validation constants
- Create unit tests (2 scenarios)

Database changes:
- expiry_warning_settings table (per-organization settings)
- expiry_warnings table (warning history)
- generate_expiry_warnings() scheduled function

Features:
- Configurable warning threshold (days before expiry)
- Email and in-app notification preferences
- Auto-warning generation via scheduled job
- Warning acknowledgment tracking
- Critical warning highlighting

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 7.3 - 리콜 시뮬레이션](phase-7.3-recall-simulation.md)
