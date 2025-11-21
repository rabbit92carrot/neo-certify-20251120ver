# Post-MVP 4: 데이터 백업 및 복원

## 📋 Overview

**Post-MVP 4**는 시스템 데이터의 백업 및 복원 기능을 구현합니다. 관리자가 수동으로 백업을 생성하고, 필요 시 복원할 수 있는 기능을 제공합니다.

---

## 📦 Work Content

### BackupManagementPage 컴포넌트

**파일 경로**: `src/pages/admin/BackupManagementPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { BACKUP_STATUS } from '@/constants/status'

interface BackupRecord {
  id: string
  backup_name: string
  backup_size_kb: number
  table_counts: Record<string, number>
  status: string
  created_by: string
  created_at: string
  user: {
    name: string
    email: string
  }
}

interface RestoreConfirmDialogProps {
  backup: BackupRecord | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (backupId: string) => void
}

function RestoreConfirmDialog({ backup, isOpen, onClose, onConfirm }: RestoreConfirmDialogProps) {
  if (!backup) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            백업 복원 확인
          </DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertDescription>
            <strong>경고:</strong> 백업을 복원하면 현재 데이터가 모두 삭제되고 백업 시점의 데이터로 교체됩니다. 이
            작업은 되돌릴 수 없습니다.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-gray-500">백업 이름</div>
            <div className="mt-1 text-base">{backup.backup_name}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500">백업 일시</div>
            <div className="mt-1 text-base">{new Date(backup.created_at).toLocaleString('ko-KR')}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500">백업 크기</div>
            <div className="mt-1 text-base">{(backup.backup_size_kb / 1024).toFixed(2)} MB</div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500">포함된 데이터</div>
            <div className="mt-1 space-y-1 text-sm">
              {Object.entries(backup.table_counts).map(([table, count]) => (
                <div key={table}>
                  {table}: {count.toLocaleString()}건
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(backup.id)}>
            복원 실행
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function BackupManagementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null)
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false)

  const { data: backups, isLoading } = useQuery<BackupRecord[]>({
    queryKey: ['backups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backups')
        .select('*, user:users(name, email)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as BackupRecord[]
    },
    enabled: !!user,
  })

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      // Count records in each table
      const tables = ['organizations', 'users', 'products', 'lots', 'inventory', 'shipments', 'usages', 'disposals']
      const tableCounts: Record<string, number> = {}

      for (const table of tables) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
        tableCounts[table] = count ?? 0
      }

      // Create backup record (actual backup would be handled by Supabase/backend)
      const backupName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}`

      const { error } = await supabase.from('backups').insert({
        backup_name: backupName,
        backup_size_kb: JSON.stringify(tableCounts).length, // Placeholder
        table_counts: tableCounts,
        status: BACKUP_STATUS.COMPLETED,
        created_by: user!.id,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      toast({ title: SUCCESS_MESSAGES.BACKUP.CREATED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.BACKUP.CREATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const { error } = await supabase.from('backups').delete().eq('id', backupId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      toast({ title: SUCCESS_MESSAGES.BACKUP.DELETED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.BACKUP.DELETE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      // NOTE: Actual restore would require backend API to restore database snapshot
      // This is a placeholder for the UI flow

      toast({
        title: '백업 복원은 백엔드 API를 통해 구현되어야 합니다.',
        description: '현재는 UI 프로토타입만 제공됩니다.',
        variant: 'destructive',
      })

      throw new Error('Restore functionality requires backend implementation')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      toast({ title: SUCCESS_MESSAGES.BACKUP.RESTORED })
      setIsRestoreDialogOpen(false)
      setSelectedBackup(null)
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.BACKUP.RESTORE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const handleOpenRestoreDialog = (backup: BackupRecord) => {
    setSelectedBackup(backup)
    setIsRestoreDialogOpen(true)
  }

  const handleCloseRestoreDialog = () => {
    setIsRestoreDialogOpen(false)
    setSelectedBackup(null)
  }

  const handleConfirmRestore = (backupId: string) => {
    restoreBackupMutation.mutate(backupId)
  }

  const handleDownloadBackup = (backup: BackupRecord) => {
    // Create a JSON file with backup metadata
    const backupData = {
      backup_name: backup.backup_name,
      backup_date: backup.created_at,
      table_counts: backup.table_counts,
    }

    const jsonString = JSON.stringify(backupData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${backup.backup_name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">백업 목록을 불러오는 중...</div>
  }

  const totalBackupSize = backups?.reduce((sum, b) => sum + b.backup_size_kb, 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">백업 관리</h1>
        <p className="mt-1 text-sm text-gray-600">데이터베이스 백업을 생성하고 관리합니다</p>
      </div>

      <Alert>
        <AlertDescription>
          <strong>중요:</strong> 백업 및 복원 기능은 실제 환경에서 Supabase CLI 또는 백엔드 API를 통해 구현되어야
          합니다. 현재는 UI 프로토타입만 제공됩니다.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">전체 백업 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups?.length ?? 0}개</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">총 백업 크기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(totalBackupSize / 1024).toFixed(2)} MB</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>백업 목록</CardTitle>
            <Button onClick={() => createBackupMutation.mutate()} disabled={createBackupMutation.isPending}>
              {createBackupMutation.isPending ? '백업 생성 중...' : '새 백업 생성'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>백업 이름</TableHead>
                <TableHead>크기</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>생성자</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backups?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    백업이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                backups?.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">{backup.backup_name}</TableCell>
                    <TableCell>{(backup.backup_size_kb / 1024).toFixed(2)} MB</TableCell>
                    <TableCell>
                      <Badge variant={backup.status === BACKUP_STATUS.COMPLETED ? 'default' : 'destructive'}>
                        {backup.status === BACKUP_STATUS.COMPLETED ? '완료' : '실패'}
                      </Badge>
                    </TableCell>
                    <TableCell>{backup.user.name}</TableCell>
                    <TableCell>{new Date(backup.created_at).toLocaleString('ko-KR')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadBackup(backup)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRestoreDialog(backup)}
                          disabled={backup.status !== BACKUP_STATUS.COMPLETED}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBackupMutation.mutate(backup.id)}
                          disabled={deleteBackupMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RestoreConfirmDialog
        backup={selectedBackup}
        isOpen={isRestoreDialogOpen}
        onClose={handleCloseRestoreDialog}
        onConfirm={handleConfirmRestore}
      />
    </div>
  )
}
```

---

## 🗄️ Database Migration

### backups 테이블

**파일 경로**: `supabase/migrations/XXXXXX_create_backups.sql`

```sql
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_name TEXT NOT NULL,
  backup_size_kb INTEGER NOT NULL,
  table_counts JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backups_created_by ON backups(created_by);
CREATE INDEX idx_backups_created_at ON backups(created_at);
CREATE INDEX idx_backups_status ON backups(status);

COMMENT ON TABLE backups IS '데이터베이스 백업 이력';
COMMENT ON COLUMN backups.backup_name IS '백업 파일명';
COMMENT ON COLUMN backups.backup_size_kb IS '백업 파일 크기 (KB)';
COMMENT ON COLUMN backups.table_counts IS '테이블별 레코드 수 (JSON)';
COMMENT ON COLUMN backups.status IS '백업 상태: completed, failed';
```

---

## 🔧 Constants Definitions

**파일 경로**: `src/constants/status.ts` (추가)

```typescript
export const BACKUP_STATUS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const
```

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존
  BACKUP: {
    CREATED: '백업이 생성되었습니다.',
    DELETED: '백업이 삭제되었습니다.',
    RESTORED: '백업이 복원되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존
  BACKUP: {
    CREATE_FAILED: '백업 생성에 실패했습니다.',
    DELETE_FAILED: '백업 삭제에 실패했습니다.',
    RESTORE_FAILED: '백업 복원에 실패했습니다.',
  },
} as const
```

---

## 🧪 Test Scenarios

### 1. Unit Test: BackupManagementPage

**파일 경로**: `src/pages/admin/__tests__/BackupManagementPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tantml:react-query'
import { BackupManagementPage } from '../BackupManagementPage'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-123', role: 'admin' } }),
}))

const mockBackups = [
  {
    id: 'backup-1',
    backup_name: 'backup-2025-01-20',
    backup_size_kb: 1024,
    table_counts: {
      organizations: 10,
      users: 50,
      products: 100,
    },
    status: 'completed',
    created_by: 'admin-123',
    created_at: '2025-01-20T00:00:00Z',
    user: {
      name: '관리자',
      email: 'admin@example.com',
    },
  },
]

describe('BackupManagementPage', () => {
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
        <BackupManagementPage />
      </QueryClientProvider>
    )
  }

  it('백업 목록을 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockBackups,
        error: null,
      }),
    } as any)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('backup-2025-01-20')).toBeInTheDocument()
      expect(screen.getByText('1.00 MB')).toBeInTheDocument()
    })
  })

  it('새 백업 생성이 정상 동작해야 한다', async () => {
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'backups') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockBackups,
            error: null,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        } as any
      }
      // Count queries
      return {
        select: vi.fn().mockResolvedValue({ count: 10 }),
      } as any
    })

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '새 백업 생성' })).toBeInTheDocument()
    })

    const createButton = screen.getByRole('button', { name: '새 백업 생성' })
    await user.click(createButton)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('backups')
    })
  })
})
```

---

## 🚨 Troubleshooting

### Issue 1: 백업 파일 크기가 0으로 표시됨

**증상**: backup_size_kb가 항상 0

**원인**: 실제 백업 크기 계산 누락

**해결방법**:
```typescript
// 백업 생성 시 실제 데이터 크기 추정
const backupSizeEstimate = Object.values(tableCounts).reduce((sum, count) => {
  return sum + count * 1 // 평균 1KB per record (rough estimate)
}, 0)

await supabase.from('backups').insert({
  backup_size_kb: backupSizeEstimate,
  // ...
})
```

### Issue 2: 백업 다운로드 파일이 비어있음

**증상**: 다운로드한 JSON 파일에 데이터가 없음

**원인**: 백업 데이터 직렬화 오류

**해결방법**:
```typescript
const handleDownloadBackup = (backup: BackupRecord) => {
  const backupData = {
    backup_name: backup.backup_name,
    backup_date: backup.created_at,
    table_counts: backup.table_counts,
    created_by: backup.user.name,
  }

  const jsonString = JSON.stringify(backupData, null, 2)
  if (!jsonString || jsonString === '{}') {
    toast({
      title: '백업 데이터가 비어있습니다.',
      variant: 'destructive',
    })
    return
  }

  // ... 다운로드 로직
}
```

### Issue 3: 백업 삭제 후 목록이 갱신되지 않음

**증상**: 백업을 삭제했지만 목록에 여전히 표시됨

**원인**: QueryClient 캐시 무효화 누락

**해결방법**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['backups'] }) // ← 반드시 포함
  toast({ title: SUCCESS_MESSAGES.BACKUP.DELETED })
}
```

### Issue 4: 복원 다이얼로그가 닫히지 않음

**증상**: 복원 실행 후 다이얼로그가 열려있음

**원인**: 상태 초기화 누락

**해결방법**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['backups'] })
  toast({ title: SUCCESS_MESSAGES.BACKUP.RESTORED })
  setIsRestoreDialogOpen(false) // ← 다이얼로그 닫기
  setSelectedBackup(null) // ← 상태 초기화
}
```

### Issue 5: 실제 백업/복원 기능 부재

**증상**: 백업/복원 버튼을 눌러도 실제 데이터베이스에 영향 없음

**원인**: 프론트엔드 UI만 구현됨 (백엔드 API 필요)

**해결방법**:
```typescript
// 실제 환경에서는 백엔드 API 구현 필요
// Supabase CLI를 사용한 백업/복원 예시:

// 백업 생성 (서버 사이드)
// supabase db dump -f backup-2025-01-20.sql

// 복원 (서버 사이드)
// supabase db reset
// psql -f backup-2025-01-20.sql

// 프론트엔드에서는 백엔드 API 호출
const createBackupMutation = useMutation({
  mutationFn: async () => {
    const response = await fetch('/api/backups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    if (!response.ok) throw new Error('Backup failed')
    return response.json()
  },
})
```

---

## ✅ Definition of Done

### 기능 구현
- [ ] BackupManagementPage 컴포넌트 구현 완료
- [ ] 백업 목록 조회 기능
- [ ] 새 백업 생성 기능
- [ ] 백업 다운로드 기능
- [ ] 백업 삭제 기능
- [ ] 백업 복원 다이얼로그
- [ ] 복원 확인 경고 표시
- [ ] 백업 통계 표시 (개수, 총 크기)

### 데이터베이스
- [ ] backups 테이블 생성
- [ ] 인덱스 추가 (created_by, created_at, status)

### UI/UX
- [ ] 백업 목록 테이블
- [ ] 새 백업 생성 버튼
- [ ] 다운로드/복원/삭제 버튼
- [ ] 복원 확인 다이얼로그
- [ ] 경고 메시지 표시
- [ ] 상태별 Badge 색상 구분
- [ ] 빈 상태 메시지 표시

### 상수 관리
- [ ] BACKUP_STATUS 상수 정의
- [ ] SUCCESS_MESSAGES.BACKUP 정의
- [ ] ERROR_MESSAGES.BACKUP 정의

### 테스트
- [ ] Unit Test 작성 (2개 시나리오)
- [ ] 백업 목록 표시 테스트
- [ ] 백업 생성 테스트
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
- [ ] Database schema 문서화
- [ ] 실제 백업/복원 구현 가이드
- [ ] Troubleshooting 가이드 작성 (5개 이슈)
- [ ] Test scenarios 문서화

### 버전 관리
- [ ] Git commit (Conventional Commits)
- [ ] Migration 파일 버전 관리

---

## 🔄 Git Commit Message

```bash
feat(business-logic): add backup management system

- Implement BackupManagementPage for database backup management
- Add backup creation with table record counts
- Add backup download (metadata export)
- Add backup deletion
- Add backup restoration dialog with confirmation
- Create backups table for backup history
- Add BACKUP_STATUS constants
- Create unit tests (2 scenarios)

Features:
- List all backups with size and status
- Create new backup (metadata + table counts)
- Download backup metadata as JSON
- Delete backup records
- Restore confirmation dialog with warning

Note: Actual database backup/restore requires backend API implementation (Supabase CLI or custom API)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 📚 실제 백업/복원 구현 가이드

### Supabase CLI를 사용한 백업

```bash
# 전체 데이터베이스 백업
supabase db dump -f backup-$(date +%Y%m%d-%H%M%S).sql

# 특정 테이블만 백업
supabase db dump -f backup-products.sql --table products

# 스키마만 백업 (데이터 제외)
supabase db dump -f schema-only.sql --schema-only
```

### Supabase CLI를 사용한 복원

```bash
# 데이터베이스 리셋
supabase db reset

# SQL 파일에서 복원
psql postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres -f backup.sql

# 또는 Supabase CLI 사용
supabase db push --db-url postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

### 백엔드 API 구현 예시 (Node.js)

```typescript
// POST /api/backups
app.post('/api/backups', async (req, res) => {
  const { user_id } = req.body

  try {
    // Execute backup command
    const backupFile = `backup-${Date.now()}.sql`
    execSync(`supabase db dump -f ${backupFile}`)

    // Get file size
    const fileSize = fs.statSync(backupFile).size

    // Save backup record
    const { data, error } = await supabase
      .from('backups')
      .insert({
        backup_name: backupFile,
        backup_size_kb: Math.floor(fileSize / 1024),
        status: 'completed',
        created_by: user_id,
      })

    res.json({ success: true, backup: data })
  } catch (error) {
    res.status(500).json({ error: 'Backup failed' })
  }
})

// POST /api/backups/:id/restore
app.post('/api/backups/:id/restore', async (req, res) => {
  const { id } = req.params

  try {
    // Get backup info
    const { data: backup } = await supabase
      .from('backups')
      .select('*')
      .eq('id', id)
      .single()

    // Execute restore
    execSync(`supabase db reset`)
    execSync(`psql ... -f ${backup.backup_name}`)

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Restore failed' })
  }
})
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 7.5 - 통합 보고서](phase-7.5-integrated-reports.md)
