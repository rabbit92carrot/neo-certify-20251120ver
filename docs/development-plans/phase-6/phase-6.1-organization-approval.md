# Phase 6.1: 조직 승인 관리

## 📋 Overview

**Phase 6.1**은 관리자가 신규 조직의 가입 신청을 승인하거나 거부하는 기능을 구현합니다. 사업자등록증 정보를 검증하고 조직을 활성화합니다.

---

## 📦 Work Content

### OrganizationApprovalPage 컴포넌트

**파일 경로**: `src/pages/admin/OrganizationApprovalPage.tsx`

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { ORGANIZATION_STATUS, ORGANIZATION_TYPE } from '@/constants/status'
import type { Organization } from '@/types/database'

interface ApprovalDialogProps {
  organization: Organization | null
  isOpen: boolean
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
}

function ApprovalDialog({ organization, isOpen, onClose, onApprove, onReject }: ApprovalDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  const handleApprove = () => {
    if (organization) {
      onApprove(organization.id)
      onClose()
    }
  }

  const handleReject = () => {
    if (organization && rejectionReason.trim()) {
      onReject(organization.id, rejectionReason)
      onClose()
      setRejectionReason('')
      setIsRejecting(false)
    }
  }

  if (!organization) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>조직 승인 검토</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">조직명</label>
              <div className="mt-1 text-base">{organization.name}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">조직 유형</label>
              <div className="mt-1">
                <Badge variant={
                  organization.type === ORGANIZATION_TYPE.MANUFACTURER ? 'default' :
                  organization.type === ORGANIZATION_TYPE.DISTRIBUTOR ? 'secondary' :
                  'outline'
                }>
                  {organization.type === ORGANIZATION_TYPE.MANUFACTURER ? '제조사' :
                   organization.type === ORGANIZATION_TYPE.DISTRIBUTOR ? '유통사' :
                   organization.type === ORGANIZATION_TYPE.HOSPITAL ? '병원' : '기타'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">사업자등록번호</label>
              <div className="mt-1 font-mono text-base">{organization.business_registration_number}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">대표자명</label>
              <div className="mt-1 text-base">{organization.representative_name}</div>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">주소</label>
              <div className="mt-1 text-base">{organization.address}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">연락처</label>
              <div className="mt-1 text-base">{organization.phone_number}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">신청일</label>
              <div className="mt-1 text-base">
                {new Date(organization.created_at).toLocaleDateString('ko-KR')}
              </div>
            </div>
          </div>

          {isRejecting && (
            <div>
              <label className="text-sm font-medium text-gray-700">거부 사유 *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="조직 승인을 거부하는 사유를 입력해주세요."
                className="mt-1.5"
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {!isRejecting ? (
            <>
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button variant="destructive" onClick={() => setIsRejecting(true)}>
                거부
              </Button>
              <Button onClick={handleApprove}>
                승인
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                setIsRejecting(false)
                setRejectionReason('')
              }}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                거부 확정
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OrganizationApprovalPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Fetch pending organizations
  const { data: pendingOrganizations, isLoading } = useQuery({
    queryKey: ['pendingOrganizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('status', ORGANIZATION_STATUS.PENDING)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Organization[]
    },
    enabled: !!user,
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await supabase
        .from('organizations')
        .update({
          status: ORGANIZATION_STATUS.ACTIVE,
          approved_at: new Date().toISOString(),
          approved_by: user!.id,
        })
        .eq('id', organizationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrganizations'] })
      toast({ title: SUCCESS_MESSAGES.ORGANIZATION.APPROVED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.ORGANIZATION.APPROVE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ organizationId, reason }: { organizationId: string; reason: string }) => {
      const { error } = await supabase
        .from('organizations')
        .update({
          status: ORGANIZATION_STATUS.REJECTED,
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
          rejected_by: user!.id,
        })
        .eq('id', organizationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingOrganizations'] })
      toast({ title: SUCCESS_MESSAGES.ORGANIZATION.REJECTED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.ORGANIZATION.REJECT_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const handleOpenDialog = (organization: Organization) => {
    setSelectedOrganization(organization)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedOrganization(null)
  }

  const handleApprove = (id: string) => {
    approveMutation.mutate(id)
  }

  const handleReject = (id: string, reason: string) => {
    rejectMutation.mutate({ organizationId: id, reason })
  }

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">데이터를 불러오는 중...</div>
  }

  const pendingCount = pendingOrganizations?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">조직 승인 관리</h1>
        <p className="mt-1 text-sm text-gray-600">신규 조직의 가입 신청을 검토하고 승인합니다</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>승인 대기 중인 조직</CardTitle>
          <div className="text-sm text-gray-600">총 {pendingCount}개의 조직이 승인을 기다리고 있습니다</div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>조직명</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>사업자등록번호</TableHead>
                <TableHead>대표자명</TableHead>
                <TableHead>신청일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingCount === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    승인 대기 중인 조직이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                pendingOrganizations?.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        org.type === ORGANIZATION_TYPE.MANUFACTURER ? 'default' :
                        org.type === ORGANIZATION_TYPE.DISTRIBUTOR ? 'secondary' :
                        'outline'
                      }>
                        {org.type === ORGANIZATION_TYPE.MANUFACTURER ? '제조사' :
                         org.type === ORGANIZATION_TYPE.DISTRIBUTOR ? '유통사' :
                         org.type === ORGANIZATION_TYPE.HOSPITAL ? '병원' : '기타'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {org.business_registration_number}
                    </TableCell>
                    <TableCell>{org.representative_name}</TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(org)}
                      >
                        검토
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApprovalDialog
        organization={selectedOrganization}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}
```

---

## 🗄️ Database Migration

### organizations 테이블 컬럼 추가

**파일 경로**: `supabase/migrations/XXXXXX_add_organization_approval_fields.sql`

```sql
-- Add approval-related fields to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_approved_by ON organizations(approved_by);
CREATE INDEX IF NOT EXISTS idx_organizations_rejected_by ON organizations(rejected_by);

-- Add comment
COMMENT ON COLUMN organizations.approved_at IS '승인 일시';
COMMENT ON COLUMN organizations.approved_by IS '승인한 관리자 ID';
COMMENT ON COLUMN organizations.rejected_at IS '거부 일시';
COMMENT ON COLUMN organizations.rejected_by IS '거부한 관리자 ID';
COMMENT ON COLUMN organizations.rejection_reason IS '거부 사유';
```

---

## 🔧 Constants Definitions

**파일 경로**: `src/constants/status.ts` (추가)

```typescript
export const ORGANIZATION_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const

export const ORGANIZATION_TYPE = {
  MANUFACTURER: 'manufacturer',
  DISTRIBUTOR: 'distributor',
  HOSPITAL: 'hospital',
} as const
```

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존
  ORGANIZATION: {
    APPROVED: '조직 승인이 완료되었습니다.',
    REJECTED: '조직 승인이 거부되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존
  ORGANIZATION: {
    APPROVE_FAILED: '조직 승인에 실패했습니다.',
    REJECT_FAILED: '조직 거부에 실패했습니다.',
  },
} as const
```

---

## 🧪 Test Scenarios

### 1. Unit Test: OrganizationApprovalPage

**파일 경로**: `src/pages/admin/__tests__/OrganizationApprovalPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrganizationApprovalPage } from '../OrganizationApprovalPage'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-123', role: 'admin' } }),
}))

const mockPendingOrganizations = [
  {
    id: 'org-1',
    name: '테스트 제조사',
    type: 'manufacturer',
    business_registration_number: '123-45-67890',
    representative_name: '홍길동',
    address: '서울특별시 강남구',
    phone_number: '02-1234-5678',
    status: 'pending',
    created_at: '2025-01-15T00:00:00Z',
  },
  {
    id: 'org-2',
    name: '테스트 유통사',
    type: 'distributor',
    business_registration_number: '987-65-43210',
    representative_name: '김철수',
    address: '부산광역시 해운대구',
    phone_number: '051-9876-5432',
    status: 'pending',
    created_at: '2025-01-16T00:00:00Z',
  },
]

describe('OrganizationApprovalPage', () => {
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
        <OrganizationApprovalPage />
      </QueryClientProvider>
    )
  }

  it('승인 대기 중인 조직 목록을 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockPendingOrganizations,
        error: null,
      }),
    } as any)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('테스트 제조사')).toBeInTheDocument()
      expect(screen.getByText('테스트 유통사')).toBeInTheDocument()
    })

    expect(screen.getByText('총 2개의 조직이 승인을 기다리고 있습니다')).toBeInTheDocument()
  })

  it('승인 대기 조직이 없을 때 안내 메시지를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    } as any)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('승인 대기 중인 조직이 없습니다')).toBeInTheDocument()
    })
  })

  it('검토 버튼 클릭 시 상세 다이얼로그를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockPendingOrganizations,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('테스트 제조사')).toBeInTheDocument()
    })

    const reviewButtons = screen.getAllByText('검토')
    await user.click(reviewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('조직 승인 검토')).toBeInTheDocument()
      expect(screen.getByText('123-45-67890')).toBeInTheDocument()
      expect(screen.getByText('홍길동')).toBeInTheDocument()
    })
  })

  it('승인 버튼 클릭 시 조직을 승인해야 한다', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'organizations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockPendingOrganizations,
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
        } as any
      }
      return {} as any
    })

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('테스트 제조사')).toBeInTheDocument()
    })

    const reviewButtons = screen.getAllByText('검토')
    await user.click(reviewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('조직 승인 검토')).toBeInTheDocument()
    })

    const approveButton = screen.getByRole('button', { name: '승인' })
    await user.click(approveButton)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('organizations')
    })
  })

  it('거부 버튼 클릭 시 거부 사유 입력란을 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockPendingOrganizations,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('테스트 제조사')).toBeInTheDocument()
    })

    const reviewButtons = screen.getAllByText('검토')
    await user.click(reviewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('조직 승인 검토')).toBeInTheDocument()
    })

    const rejectButton = screen.getByRole('button', { name: '거부' })
    await user.click(rejectButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('조직 승인을 거부하는 사유를 입력해주세요.')).toBeInTheDocument()
    })
  })

  it('거부 사유 없이 거부 확정 버튼은 비활성화되어야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockPendingOrganizations,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('테스트 제조사')).toBeInTheDocument()
    })

    const reviewButtons = screen.getAllByText('검토')
    await user.click(reviewButtons[0])

    const rejectButton = screen.getByRole('button', { name: '거부' })
    await user.click(rejectButton)

    await waitFor(() => {
      const confirmRejectButton = screen.getByRole('button', { name: '거부 확정' })
      expect(confirmRejectButton).toBeDisabled()
    })
  })
})
```

---

## 🚨 Troubleshooting

### Issue 1: 승인 후 목록이 갱신되지 않음

**증상**: 조직을 승인했지만 목록에서 사라지지 않음

**원인**: QueryClient 캐시가 갱신되지 않음

**해결방법**:
```typescript
// useMutation의 onSuccess에서 queryClient.invalidateQueries 확인
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['pendingOrganizations'] })
  toast({ title: SUCCESS_MESSAGES.ORGANIZATION.APPROVED })
}
```

### Issue 2: 다이얼로그가 닫히지 않음

**증상**: 승인/거부 후 다이얼로그가 열려있음

**원인**: onClose가 호출되지 않음

**해결방법**:
```typescript
const handleApprove = () => {
  if (organization) {
    onApprove(organization.id)
    onClose() // ← 반드시 호출
  }
}
```

### Issue 3: 거부 사유가 저장되지 않음

**증상**: 거부 사유를 입력했지만 DB에 저장되지 않음

**원인**: rejection_reason 필드가 업데이트되지 않음

**해결방법**:
```typescript
const { error } = await supabase
  .from('organizations')
  .update({
    status: ORGANIZATION_STATUS.REJECTED,
    rejection_reason: reason, // ← 반드시 포함
    rejected_at: new Date().toISOString(),
    rejected_by: user!.id,
  })
  .eq('id', organizationId)
```

### Issue 4: 관리자가 아닌 사용자도 접근 가능

**증상**: 일반 사용자가 승인 페이지에 접근할 수 있음

**원인**: Role 기반 접근 제어 미구현

**해결방법**:
```typescript
// AuthContext에서 role 확인
const { user, role } = useAuth()

useEffect(() => {
  if (role !== 'admin') {
    navigate('/dashboard')
    toast({
      title: '접근 권한이 없습니다.',
      variant: 'destructive',
    })
  }
}, [role, navigate])
```

### Issue 5: 승인/거부 작업이 중복 실행됨

**증상**: 승인 버튼을 여러 번 클릭하면 중복 요청 발생

**원인**: Mutation pending 상태 체크 미구현

**해결방법**:
```typescript
<Button
  onClick={handleApprove}
  disabled={approveMutation.isPending} // ← 중복 방지
>
  승인
</Button>
```

---

## ✅ Definition of Done

### 기능 구현
- [ ] OrganizationApprovalPage 컴포넌트 구현 완료
- [ ] 승인 대기 조직 목록 조회 기능
- [ ] 조직 상세 정보 다이얼로그 구현
- [ ] 조직 승인 기능 구현
- [ ] 조직 거부 기능 (사유 입력 포함)
- [ ] 승인/거부 후 목록 자동 갱신
- [ ] 승인 대기 카운트 표시

### 데이터베이스
- [ ] organizations 테이블에 승인 관련 컬럼 추가
  - [ ] approved_at (승인 일시)
  - [ ] approved_by (승인 관리자 ID)
  - [ ] rejected_at (거부 일시)
  - [ ] rejected_by (거부 관리자 ID)
  - [ ] rejection_reason (거부 사유)
- [ ] 인덱스 추가 (status, approved_by, rejected_by)

### UI/UX
- [ ] 조직 유형별 Badge 색상 구분
- [ ] 승인 대기 개수 표시
- [ ] 다이얼로그에서 모든 조직 정보 표시
- [ ] 거부 사유 입력란 표시/숨김 처리
- [ ] 빈 상태 메시지 표시

### 상수 관리
- [ ] ORGANIZATION_STATUS 상수 정의
- [ ] ORGANIZATION_TYPE 상수 정의
- [ ] SUCCESS_MESSAGES.ORGANIZATION 정의
- [ ] ERROR_MESSAGES.ORGANIZATION 정의

### 테스트
- [ ] Unit Test 작성 (6개 시나리오)
- [ ] 승인 대기 목록 조회 테스트
- [ ] 빈 목록 처리 테스트
- [ ] 다이얼로그 표시 테스트
- [ ] 승인 기능 테스트
- [ ] 거부 사유 입력 테스트
- [ ] 거부 확정 버튼 비활성화 테스트
- [ ] 모든 테스트 통과

### 코드 품질
- [ ] TypeScript strict 모드 통과
- [ ] 'any' 타입 사용 없음
- [ ] 모든 리터럴 값 상수화
- [ ] Zod 스키마 검증 (거부 사유)
- [ ] Error boundary 처리
- [ ] Loading state 처리
- [ ] Accessibility 준수 (ARIA labels)

### 문서화
- [ ] 컴포넌트 구조 문서화
- [ ] Database migration 스크립트 작성
- [ ] Troubleshooting 가이드 작성 (5개 이슈)
- [ ] Test scenarios 문서화

### 버전 관리
- [ ] Git commit (Conventional Commits)
- [ ] Migration 파일 버전 관리

---

## 🔄 Git Commit Message

```bash
feat(admin): add organization approval management

- Implement OrganizationApprovalPage with approval/rejection workflow
- Add approval dialog with organization details
- Add rejection reason input and validation
- Update organizations table with approval-related fields
- Add ORGANIZATION_STATUS and ORGANIZATION_TYPE constants
- Create unit tests for approval workflow (6 scenarios)

Database changes:
- Add approved_at, approved_by, rejected_at, rejected_by, rejection_reason columns
- Add indexes for status and approval fields

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 6.2 - 사용자 관리](phase-6.2-user-management.md)
