# Post-MVP 1: 재고 자동 알림

## 📋 Overview

**Post-MVP 1**은 재고가 설정된 최소 수량 이하로 떨어졌을 때 자동으로 알림을 생성하는 기능을 구현합니다. 조직별로 재고 임계값을 설정하고 알림을 관리합니다.

---

## 📦 Work Content

### 1. InventoryAlertSettings 컴포넌트

**파일 경로**: `src/pages/settings/InventoryAlertSettings.tsx`

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

const alertSettingsSchema = z.object({
  low_stock_enabled: z.boolean(),
  low_stock_threshold: z.number().min(VALIDATION_RULES.INVENTORY_ALERT.THRESHOLD_MIN).max(VALIDATION_RULES.INVENTORY_ALERT.THRESHOLD_MAX),
  notify_email: z.boolean(),
  notify_in_app: z.boolean(),
})

type AlertSettingsFormData = z.infer<typeof alertSettingsSchema>

interface InventoryAlertSettings {
  id: string
  organization_id: string
  low_stock_enabled: boolean
  low_stock_threshold: number
  notify_email: boolean
  notify_in_app: boolean
  created_at: string
  updated_at: string
}

export function InventoryAlertSettings() {
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

  const { data: settings, isLoading } = useQuery<InventoryAlertSettings>({
    queryKey: ['inventoryAlertSettings', userData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_alert_settings')
        .select('*')
        .eq('organization_id', userData!.organization_id)
        .maybeSingle()

      if (error) throw error

      // Return default settings if not found
      if (!data) {
        return {
          id: '',
          organization_id: userData!.organization_id,
          low_stock_enabled: true,
          low_stock_threshold: VALIDATION_RULES.INVENTORY_ALERT.THRESHOLD_DEFAULT,
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

  const form = useForm<AlertSettingsFormData>({
    resolver: zodResolver(alertSettingsSchema),
    values: settings
      ? {
          low_stock_enabled: settings.low_stock_enabled,
          low_stock_threshold: settings.low_stock_threshold,
          notify_email: settings.notify_email,
          notify_in_app: settings.notify_in_app,
        }
      : undefined,
  })

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: AlertSettingsFormData) => {
      const payload = {
        organization_id: userData!.organization_id,
        ...data,
        updated_at: new Date().toISOString(),
      }

      if (settings?.id) {
        // Update existing settings
        const { error } = await supabase
          .from('inventory_alert_settings')
          .update(payload)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Insert new settings
        const { error } = await supabase.from('inventory_alert_settings').insert(payload)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryAlertSettings'] })
      toast({ title: SUCCESS_MESSAGES.INVENTORY_ALERT.SETTINGS_SAVED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.INVENTORY_ALERT.SETTINGS_SAVE_FAILED,
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
        <h1 className="text-2xl font-bold text-gray-900">재고 알림 설정</h1>
        <p className="mt-1 text-sm text-gray-600">재고 부족 시 자동 알림 설정을 관리합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>알림 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => saveSettingsMutation.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="low_stock_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">재고 부족 알림</FormLabel>
                      <FormDescription>재고가 설정된 임계값 이하로 떨어지면 알림을 받습니다</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="low_stock_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>재고 임계값 *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={VALIDATION_RULES.INVENTORY_ALERT.THRESHOLD_MIN}
                        max={VALIDATION_RULES.INVENTORY_ALERT.THRESHOLD_MAX}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      재고가 이 수량 이하로 떨어지면 알림을 받습니다 (기본값:{' '}
                      {VALIDATION_RULES.INVENTORY_ALERT.THRESHOLD_DEFAULT}개)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <div className="text-sm font-medium">알림 수신 방법</div>

                <FormField
                  control={form.control}
                  name="notify_in_app"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">앱 내 알림</FormLabel>
                        <FormDescription>시스템 내에서 알림을 확인합니다</FormDescription>
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
                        <FormLabel className="text-base">이메일 알림</FormLabel>
                        <FormDescription>등록된 이메일로 알림을 받습니다</FormDescription>
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

### 2. InventoryAlertsPage 컴포넌트

**파일 경로**: `src/pages/alerts/InventoryAlertsPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { ALERT_STATUS } from '@/constants/status'

interface InventoryAlert {
  id: string
  organization_id: string
  product_id: string
  lot_id: string
  current_quantity: number
  threshold: number
  status: string
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  product: {
    name: string
    model_name: string
  }
  lot: {
    lot_number: string
    expiry_date: string
  }
}

export function InventoryAlertsPage() {
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

  const { data: alerts, isLoading } = useQuery<InventoryAlert[]>({
    queryKey: ['inventoryAlerts', userData?.organization_id, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('inventory_alerts')
        .select('*, product:products(name, model_name), lot:lots(lot_number, expiry_date)')
        .eq('organization_id', userData!.organization_id)
        .order('created_at', { ascending: false })

      if (statusFilter === 'active') {
        query = query.eq('status', ALERT_STATUS.ACTIVE)
      } else if (statusFilter === 'resolved') {
        query = query.eq('status', ALERT_STATUS.RESOLVED)
      }

      const { data, error } = await query

      if (error) throw error
      return data as InventoryAlert[]
    },
    enabled: !!userData?.organization_id,
  })

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('inventory_alerts')
        .update({
          status: ALERT_STATUS.RESOLVED,
          resolved_at: new Date().toISOString(),
          resolved_by: user!.id,
        })
        .eq('id', alertId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryAlerts'] })
      toast({ title: SUCCESS_MESSAGES.INVENTORY_ALERT.RESOLVED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.INVENTORY_ALERT.RESOLVE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">알림을 불러오는 중...</div>
  }

  const activeAlertsCount = alerts?.filter((a) => a.status === ALERT_STATUS.ACTIVE).length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">재고 알림</h1>
        <p className="mt-1 text-sm text-gray-600">재고 부족 알림을 확인하고 관리합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>활성 알림</CardTitle>
          <div className="text-sm text-gray-600">{activeAlertsCount}개의 활성 알림</div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>알림 목록</CardTitle>
          <div className="mt-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="resolved">해결됨</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제품명</TableHead>
                <TableHead>Lot 번호</TableHead>
                <TableHead>현재 재고</TableHead>
                <TableHead>임계값</TableHead>
                <TableHead>사용기한</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>발생일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    알림이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                alerts?.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.product.name}</TableCell>
                    <TableCell className="font-mono text-sm">{alert.lot.lot_number}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-red-600">{alert.current_quantity}개</span>
                    </TableCell>
                    <TableCell>{alert.threshold}개</TableCell>
                    <TableCell>{alert.lot.expiry_date}</TableCell>
                    <TableCell>
                      <Badge variant={alert.status === ALERT_STATUS.ACTIVE ? 'destructive' : 'secondary'}>
                        {alert.status === ALERT_STATUS.ACTIVE ? '활성' : '해결됨'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(alert.created_at).toLocaleDateString('ko-KR')}</TableCell>
                    <TableCell>
                      {alert.status === ALERT_STATUS.ACTIVE && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveAlertMutation.mutate(alert.id)}
                          disabled={resolveAlertMutation.isPending}
                        >
                          해결
                        </Button>
                      )}
                    </TableCell>
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

## 🗄️ Database Migration

### 1. inventory_alert_settings 테이블

**파일 경로**: `supabase/migrations/XXXXXX_create_inventory_alert_settings.sql`

```sql
CREATE TABLE inventory_alert_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) UNIQUE,
  low_stock_enabled BOOLEAN NOT NULL DEFAULT true,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 1 AND low_stock_threshold <= 10000),
  notify_email BOOLEAN NOT NULL DEFAULT false,
  notify_in_app BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_alert_settings_org ON inventory_alert_settings(organization_id);

COMMENT ON TABLE inventory_alert_settings IS '조직별 재고 알림 설정';
COMMENT ON COLUMN inventory_alert_settings.low_stock_enabled IS '재고 부족 알림 활성화 여부';
COMMENT ON COLUMN inventory_alert_settings.low_stock_threshold IS '재고 임계값 (이하일 때 알림)';
COMMENT ON COLUMN inventory_alert_settings.notify_email IS '이메일 알림 활성화 여부';
COMMENT ON COLUMN inventory_alert_settings.notify_in_app IS '앱 내 알림 활성화 여부';
```

### 2. inventory_alerts 테이블

**파일 경로**: `supabase/migrations/XXXXXX_create_inventory_alerts.sql`

```sql
CREATE TABLE inventory_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  lot_id UUID NOT NULL REFERENCES lots(id),
  current_quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_alerts_org ON inventory_alerts(organization_id);
CREATE INDEX idx_inventory_alerts_status ON inventory_alerts(status);
CREATE INDEX idx_inventory_alerts_lot ON inventory_alerts(lot_id);

COMMENT ON TABLE inventory_alerts IS '재고 부족 알림 이력';
COMMENT ON COLUMN inventory_alerts.current_quantity IS '알림 발생 당시 재고 수량';
COMMENT ON COLUMN inventory_alerts.threshold IS '알림 발생 기준 임계값';
COMMENT ON COLUMN inventory_alerts.status IS '알림 상태: active, resolved';
```

### 3. Trigger: 재고 감소 시 자동 알림 생성

**파일 경로**: `supabase/migrations/XXXXXX_create_inventory_alert_trigger.sql`

```sql
CREATE OR REPLACE FUNCTION check_inventory_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_settings RECORD;
  v_lot RECORD;
  v_existing_alert UUID;
BEGIN
  -- Get alert settings for this organization
  SELECT * INTO v_settings
  FROM inventory_alert_settings
  WHERE organization_id = NEW.organization_id
    AND low_stock_enabled = true;

  -- If no settings or alerts disabled, skip
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get lot info
  SELECT * INTO v_lot FROM lots WHERE id = NEW.lot_id;

  -- Check if current quantity is below threshold
  IF NEW.current_quantity <= v_settings.low_stock_threshold THEN
    -- Check if there's already an active alert for this lot
    SELECT id INTO v_existing_alert
    FROM inventory_alerts
    WHERE lot_id = NEW.lot_id
      AND organization_id = NEW.organization_id
      AND status = 'active';

    -- Only create alert if no active alert exists
    IF NOT FOUND THEN
      INSERT INTO inventory_alerts (
        organization_id,
        product_id,
        lot_id,
        current_quantity,
        threshold
      ) VALUES (
        NEW.organization_id,
        v_lot.product_id,
        NEW.lot_id,
        NEW.current_quantity,
        v_settings.low_stock_threshold
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to inventory table
CREATE TRIGGER inventory_alert_trigger
AFTER UPDATE OF current_quantity ON inventory
FOR EACH ROW
WHEN (NEW.current_quantity < OLD.current_quantity)
EXECUTE FUNCTION check_inventory_alert();
```

---

## 🔧 Constants Definitions

**파일 경로**: `src/constants/validation.ts` (추가)

```typescript
export const VALIDATION_RULES = {
  // ... 기존
  INVENTORY_ALERT: {
    THRESHOLD_MIN: 1,
    THRESHOLD_MAX: 10000,
    THRESHOLD_DEFAULT: 10,
  },
} as const
```

**파일 경로**: `src/constants/status.ts` (추가)

```typescript
export const ALERT_STATUS = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
} as const
```

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존
  INVENTORY_ALERT: {
    SETTINGS_SAVED: '알림 설정이 저장되었습니다.',
    RESOLVED: '알림이 해결되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존
  INVENTORY_ALERT: {
    SETTINGS_SAVE_FAILED: '알림 설정 저장에 실패했습니다.',
    RESOLVE_FAILED: '알림 해결에 실패했습니다.',
  },
} as const
```

---

## 🧪 Test Scenarios

### 1. Unit Test: InventoryAlertSettings

**파일 경로**: `src/pages/settings/__tests__/InventoryAlertSettings.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InventoryAlertSettings } from '../InventoryAlertSettings'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}))

const mockSettings = {
  id: 'settings-1',
  organization_id: 'org-1',
  low_stock_enabled: true,
  low_stock_threshold: 10,
  notify_email: false,
  notify_in_app: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

describe('InventoryAlertSettings', () => {
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
        <InventoryAlertSettings />
      </QueryClientProvider>
    )
  }

  it('기존 설정을 불러와 표시해야 한다', async () => {
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
      if (table === 'inventory_alert_settings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
        } as any
      }
      return {} as any
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByLabelText('재고 임계값 *')).toHaveValue(10)
    })
  })

  it('설정 저장이 정상 동작해야 한다', async () => {
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
      if (table === 'inventory_alert_settings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockSettings,
            error: null,
          }),
          update: vi.fn().mockResolvedValue({ error: null }),
        } as any
      }
      return {} as any
    })

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByLabelText('재고 임계값 *')).toBeInTheDocument()
    })

    const thresholdInput = screen.getByLabelText('재고 임계값 *')
    await user.clear(thresholdInput)
    await user.type(thresholdInput, '20')

    const saveButton = screen.getByRole('button', { name: '설정 저장' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('inventory_alert_settings')
    })
  })
})
```

---

## 🚨 Troubleshooting

### Issue 1: 알림이 생성되지 않음

**증상**: 재고가 임계값 이하로 떨어졌지만 알림이 생성되지 않음

**원인**: Trigger가 제대로 실행되지 않음

**해결방법**:
```sql
-- Trigger 상태 확인
SELECT * FROM pg_trigger WHERE tgname = 'inventory_alert_trigger';

-- Trigger 재생성
DROP TRIGGER IF EXISTS inventory_alert_trigger ON inventory;
CREATE TRIGGER inventory_alert_trigger
AFTER UPDATE OF current_quantity ON inventory
FOR EACH ROW
WHEN (NEW.current_quantity < OLD.current_quantity)
EXECUTE FUNCTION check_inventory_alert();
```

### Issue 2: 중복 알림이 생성됨

**증상**: 같은 Lot에 대해 여러 개의 활성 알림이 생성됨

**원인**: 기존 활성 알림 확인 로직 오류

**해결방법**:
```sql
-- check_inventory_alert 함수 수정
SELECT id INTO v_existing_alert
FROM inventory_alerts
WHERE lot_id = NEW.lot_id
  AND organization_id = NEW.organization_id
  AND status = 'active'; -- ← 반드시 포함

IF NOT FOUND THEN
  -- 알림 생성
END IF;
```

### Issue 3: 설정 저장 후 적용되지 않음

**증상**: 임계값을 변경했지만 알림 생성에 반영되지 않음

**원인**: Trigger가 최신 설정을 읽지 않음

**해결방법**:
```sql
-- Trigger에서 설정을 매번 조회
SELECT * INTO v_settings
FROM inventory_alert_settings
WHERE organization_id = NEW.organization_id
  AND low_stock_enabled = true;
-- ↑ 캐싱하지 않고 매번 조회
```

### Issue 4: 알림 페이지 로딩이 느림

**증상**: 알림 목록 페이지가 느리게 로드됨

**원인**: JOIN 쿼리 최적화 필요

**해결방법**:
```sql
-- 인덱스 추가
CREATE INDEX idx_inventory_alerts_org_status ON inventory_alerts(organization_id, status);

-- 쿼리 최적화
SELECT a.*, p.name, p.model_name, l.lot_number, l.expiry_date
FROM inventory_alerts a
INNER JOIN products p ON a.product_id = p.id
INNER JOIN lots l ON a.lot_id = l.id
WHERE a.organization_id = $1 AND a.status = $2;
```

### Issue 5: 해결된 알림이 다시 활성화됨

**증상**: 해결된 알림이 재고 변동 시 다시 활성으로 변경됨

**원인**: Trigger가 해결된 알림을 확인하지 않음

**해결방법**:
```sql
-- Trigger 조건 수정
SELECT id INTO v_existing_alert
FROM inventory_alerts
WHERE lot_id = NEW.lot_id
  AND organization_id = NEW.organization_id
  AND status = 'active'; -- ← 활성 알림만 체크

-- 이미 해결된 알림은 무시하고 새 알림 생성
```

---

## ✅ Definition of Done

### 기능 구현
- [ ] InventoryAlertSettings 컴포넌트 구현 완료
- [ ] InventoryAlertsPage 컴포넌트 구현 완료
- [ ] 재고 임계값 설정 기능
- [ ] 알림 수신 방법 설정 (앱 내/이메일)
- [ ] 알림 목록 조회 기능
- [ ] 알림 해결 기능
- [ ] 상태 필터 (활성/해결됨/전체)

### 데이터베이스
- [ ] inventory_alert_settings 테이블 생성
- [ ] inventory_alerts 테이블 생성
- [ ] check_inventory_alert() 함수 생성
- [ ] inventory_alert_trigger 트리거 생성
- [ ] 인덱스 추가 (organization_id, status, lot_id)

### UI/UX
- [ ] 설정 폼 레이아웃
- [ ] Switch 컴포넌트로 토글 설정
- [ ] 알림 목록 테이블
- [ ] 활성 알림 카운트 표시
- [ ] 상태별 Badge 색상 구분
- [ ] 빈 상태 메시지 표시

### 상수 관리
- [ ] VALIDATION_RULES.INVENTORY_ALERT 정의
- [ ] ALERT_STATUS 상수 정의
- [ ] SUCCESS_MESSAGES.INVENTORY_ALERT 정의
- [ ] ERROR_MESSAGES.INVENTORY_ALERT 정의

### 테스트
- [ ] Unit Test 작성 (2개 시나리오)
- [ ] 설정 불러오기 테스트
- [ ] 설정 저장 테스트
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
- [ ] Trigger 로직 문서화
- [ ] Troubleshooting 가이드 작성 (5개 이슈)
- [ ] Test scenarios 문서화

### 버전 관리
- [ ] Git commit (Conventional Commits)
- [ ] Migration 파일 버전 관리

---

## 🔄 Git Commit Message

```bash
feat(business-logic): add inventory alert system

- Implement InventoryAlertSettings for threshold configuration
- Implement InventoryAlertsPage for alert management
- Create inventory_alert_settings table
- Create inventory_alerts table
- Add database trigger to auto-generate alerts when inventory drops
- Add alert resolution workflow
- Add status filter (active/resolved)
- Add ALERT_STATUS and INVENTORY_ALERT validation constants
- Create unit tests (2 scenarios)

Database changes:
- inventory_alert_settings table (per-organization settings)
- inventory_alerts table (alert history)
- check_inventory_alert() function and trigger

Features:
- Configurable low stock threshold
- Email and in-app notification preferences
- Auto-alert generation on inventory decrease
- Alert resolution tracking

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 7.2 - 사용기한 만료 경고](phase-7.2-expiry-warnings.md)
