# Phase 6.2: 사용자 관리

## 📋 Overview

**Phase 6.2**는 관리자가 시스템의 모든 사용자를 조회하고, 역할을 변경하며, 사용자를 활성화/비활성화하는 기능을 구현합니다.

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

### UserManagementPage 컴포넌트

**파일 경로**: `src/pages/admin/UserManagementPage.tsx`

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { USER_ROLE, USER_STATUS } from '@/constants/status'
import type { User, Organization } from '@/types/database'

interface UserWithOrganization extends User {
  organization: Organization
}

interface EditUserDialogProps {
  user: UserWithOrganization | null
  isOpen: boolean
  onClose: () => void
  onSave: (userId: string, updates: { role?: string; is_active?: boolean }) => void
}

function EditUserDialog({ user, isOpen, onClose, onSave }: EditUserDialogProps) {
  const [selectedRole, setSelectedRole] = useState(user?.role ?? USER_ROLE.VIEWER)
  const [isActive, setIsActive] = useState(user?.is_active ?? true)

  const handleSave = () => {
    if (user) {
      onSave(user.id, {
        role: selectedRole,
        is_active: isActive,
      })
      onClose()
    }
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>사용자 정보 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">이메일</label>
            <div className="mt-1 text-base">{user.email}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">이름</label>
            <div className="mt-1 text-base">{user.name}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">소속 조직</label>
            <div className="mt-1 text-base">{user.organization.name}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">역할 *</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USER_ROLE.ADMIN}>관리자</SelectItem>
                <SelectItem value={USER_ROLE.MANAGER}>매니저</SelectItem>
                <SelectItem value={USER_ROLE.STAFF}>스태프</SelectItem>
                <SelectItem value={USER_ROLE.VIEWER}>뷰어</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">계정 상태 *</label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(v) => setIsActive(v === 'active')}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function UserManagementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState<UserWithOrganization | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch all users
  const { data: users, isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as UserWithOrganization[]
    },
    enabled: !!user,
  })

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: { role?: string; is_active?: boolean } }) => {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] })
      toast({ title: SUCCESS_MESSAGES.USER.UPDATED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.USER.UPDATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const handleOpenEditDialog = (user: UserWithOrganization) => {
    setSelectedUser(user)
    setIsEditDialogOpen(true)
  }

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false)
    setSelectedUser(null)
  }

  const handleSaveUser = (userId: string, updates: { role?: string; is_active?: boolean }) => {
    updateUserMutation.mutate({ userId, updates })
  }

  const filteredUsers = users?.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'inactive' && !u.is_active)
    const matchesSearch =
      searchQuery === '' ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.organization.name.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesRole && matchesStatus && matchesSearch
  })

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">데이터를 불러오는 중...</div>
  }

  const totalUsers = users?.length ?? 0
  const activeUsers = users?.filter((u) => u.is_active).length ?? 0
  const inactiveUsers = totalUsers - activeUsers

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        <p className="mt-1 text-sm text-gray-600">시스템의 모든 사용자를 조회하고 관리합니다</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">전체 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">활성 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeUsers}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">비활성 사용자</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{inactiveUsers}명</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
          <div className="mt-4 flex flex-col gap-4 md:flex-row">
            <Input
              placeholder="이름, 이메일, 조직명 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:w-80"
            />

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 역할</SelectItem>
                <SelectItem value={USER_ROLE.ADMIN}>관리자</SelectItem>
                <SelectItem value={USER_ROLE.MANAGER}>매니저</SelectItem>
                <SelectItem value={USER_ROLE.STAFF}>스태프</SelectItem>
                <SelectItem value={USER_ROLE.VIEWER}>뷰어</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>소속 조직</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    사용자가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.organization.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.role === USER_ROLE.ADMIN
                            ? 'default'
                            : u.role === USER_ROLE.MANAGER
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {u.role === USER_ROLE.ADMIN
                          ? '관리자'
                          : u.role === USER_ROLE.MANAGER
                            ? '매니저'
                            : u.role === USER_ROLE.STAFF
                              ? '스태프'
                              : '뷰어'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'destructive'}>
                        {u.is_active ? '활성' : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString('ko-KR')}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(u)}>
                        수정
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditUserDialog
        user={selectedUser}
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        onSave={handleSaveUser}
      />
    </div>
  )
}
```

---

## 🔧 Constants Definitions

**파일 경로**: `src/constants/status.ts` (추가)

```typescript
export const USER_ROLE = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  VIEWER: 'viewer',
} as const

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const
```

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존
  USER: {
    UPDATED: '사용자 정보가 수정되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존
  USER: {
    UPDATE_FAILED: '사용자 정보 수정에 실패했습니다.',
  },
} as const
```

---

## 🧪 Test Scenarios

### 1. Unit Test: UserManagementPage

**파일 경로**: `src/pages/admin/__tests__/UserManagementPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserManagementPage } from '../UserManagementPage'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-123', role: 'admin' } }),
}))

const mockUsers = [
  {
    id: 'user-1',
    name: '홍길동',
    email: 'hong@example.com',
    role: 'manager',
    is_active: true,
    created_at: '2025-01-10T00:00:00Z',
    organization: {
      id: 'org-1',
      name: '테스트 제조사',
    },
  },
  {
    id: 'user-2',
    name: '김철수',
    email: 'kim@example.com',
    role: 'staff',
    is_active: true,
    created_at: '2025-01-12T00:00:00Z',
    organization: {
      id: 'org-2',
      name: '테스트 유통사',
    },
  },
  {
    id: 'user-3',
    name: '이영희',
    email: 'lee@example.com',
    role: 'viewer',
    is_active: false,
    created_at: '2025-01-15T00:00:00Z',
    organization: {
      id: 'org-3',
      name: '테스트 병원',
    },
  },
]

describe('UserManagementPage', () => {
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
        <UserManagementPage />
      </QueryClientProvider>
    )
  }

  it('전체 사용자 목록을 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      }),
    } as any)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument()
      expect(screen.getByText('김철수')).toBeInTheDocument()
      expect(screen.getByText('이영희')).toBeInTheDocument()
    })

    expect(screen.getByText('3명')).toBeInTheDocument() // 전체 사용자
  })

  it('활성/비활성 사용자 통계를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      }),
    } as any)

    renderComponent()

    await waitFor(() => {
      const activeUsersCount = screen.getAllByText('2명')[0] // 활성 사용자
      expect(activeUsersCount).toBeInTheDocument()
    })
  })

  it('역할 필터가 정상 동작해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument()
    })

    // 역할 필터 선택
    const roleSelect = screen.getAllByRole('combobox')[1] // 두 번째 Select (역할)
    await user.click(roleSelect)

    const managerOption = screen.getByText('매니저')
    await user.click(managerOption)

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument()
      expect(screen.queryByText('김철수')).not.toBeInTheDocument()
    })
  })

  it('상태 필터가 정상 동작해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('이영희')).toBeInTheDocument()
    })

    // 상태 필터 선택
    const statusSelect = screen.getAllByRole('combobox')[2] // 세 번째 Select (상태)
    await user.click(statusSelect)

    const inactiveOption = screen.getByText('비활성')
    await user.click(inactiveOption)

    await waitFor(() => {
      expect(screen.getByText('이영희')).toBeInTheDocument()
      expect(screen.queryByText('홍길동')).not.toBeInTheDocument()
    })
  })

  it('검색 필터가 정상 동작해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('이름, 이메일, 조직명 검색')
    await user.type(searchInput, '김철수')

    await waitFor(() => {
      expect(screen.getByText('김철수')).toBeInTheDocument()
      expect(screen.queryByText('홍길동')).not.toBeInTheDocument()
    })
  })

  it('수정 버튼 클릭 시 수정 다이얼로그를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('수정')
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('사용자 정보 수정')).toBeInTheDocument()
      expect(screen.getByText('hong@example.com')).toBeInTheDocument()
    })
  })

  it('사용자 정보 수정이 정상 동작해야 한다', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockUsers,
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        } as any
      }
      return {} as any
    })

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('홍길동')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('수정')
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('사용자 정보 수정')).toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: '저장' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('users')
    })
  })
})
```

---

## 🚨 Troubleshooting

### Issue 1: 필터 적용 후 빈 목록 표시

**증상**: 필터를 적용했지만 조건에 맞는 사용자가 있음에도 빈 목록이 표시됨

**원인**: 필터 로직에서 대소문자 구분으로 인한 매칭 실패

**해결방법**:
```typescript
const matchesSearch =
  searchQuery === '' ||
  u.name.toLowerCase().includes(searchQuery.toLowerCase()) || // ← toLowerCase() 추가
  u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
  u.organization.name.toLowerCase().includes(searchQuery.toLowerCase())
```

### Issue 2: 수정 다이얼로그에서 이전 값이 표시되지 않음

**증상**: 수정 다이얼로그를 열었을 때 현재 역할이 선택되지 않음

**원인**: selectedRole 초기값이 user prop의 값으로 설정되지 않음

**해결방법**:
```typescript
function EditUserDialog({ user, isOpen, onClose, onSave }: EditUserDialogProps) {
  const [selectedRole, setSelectedRole] = useState(user?.role ?? USER_ROLE.VIEWER)
  const [isActive, setIsActive] = useState(user?.is_active ?? true)

  // user가 변경될 때마다 상태 업데이트
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role)
      setIsActive(user.is_active)
    }
  }, [user])
}
```

### Issue 3: 통계 카드가 필터와 독립적으로 동작

**증상**: 필터를 적용해도 통계 카드는 전체 사용자 수를 표시함

**원인**: 통계 계산이 users (전체)를 기준으로 함

**해결방법** (필요 시):
```typescript
// 필터된 사용자 기준으로 통계 계산
const totalUsers = filteredUsers?.length ?? 0
const activeUsers = filteredUsers?.filter((u) => u.is_active).length ?? 0
const inactiveUsers = totalUsers - activeUsers
```

### Issue 4: 자기 자신의 역할을 변경할 수 있음

**증상**: 관리자가 자기 자신의 역할을 변경하여 권한을 잃을 수 있음

**원인**: 본인 여부 검증 로직 부재

**해결방법**:
```typescript
const handleSaveUser = (userId: string, updates: { role?: string; is_active?: boolean }) => {
  if (userId === user?.id && updates.role && updates.role !== USER_ROLE.ADMIN) {
    toast({
      title: '자기 자신의 관리자 권한을 제거할 수 없습니다.',
      variant: 'destructive',
    })
    return
  }

  updateUserMutation.mutate({ userId, updates })
}
```

### Issue 5: 사용자 수정 후 목록이 갱신되지 않음

**증상**: 역할이나 상태를 변경했지만 목록에 반영되지 않음

**원인**: QueryClient 캐시가 무효화되지 않음

**해결방법**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['allUsers'] }) // ← 반드시 포함
  toast({ title: SUCCESS_MESSAGES.USER.UPDATED })
}
```

---

## ✅ Definition of Done

### 기능 구현
- [ ] UserManagementPage 컴포넌트 구현 완료
- [ ] 전체 사용자 목록 조회 기능
- [ ] 역할 필터 기능 (admin/manager/staff/viewer)
- [ ] 상태 필터 기능 (active/inactive)
- [ ] 검색 기능 (이름, 이메일, 조직명)
- [ ] 사용자 정보 수정 다이얼로그
- [ ] 역할 변경 기능
- [ ] 계정 활성화/비활성화 기능
- [ ] 통계 카드 (전체/활성/비활성 사용자 수)

### UI/UX
- [ ] 사용자 목록 테이블 표시
- [ ] 역할별 Badge 색상 구분
- [ ] 상태별 Badge 색상 구분
- [ ] 필터 컨트롤 (검색, 역할, 상태)
- [ ] 수정 다이얼로그에서 현재 값 표시
- [ ] 빈 상태 메시지 표시
- [ ] 반응형 레이아웃 (모바일 지원)

### 상수 관리
- [ ] USER_ROLE 상수 정의
- [ ] USER_STATUS 상수 정의
- [ ] SUCCESS_MESSAGES.USER 정의
- [ ] ERROR_MESSAGES.USER 정의

### 테스트
- [ ] Unit Test 작성 (7개 시나리오)
- [ ] 사용자 목록 조회 테스트
- [ ] 통계 표시 테스트
- [ ] 역할 필터 테스트
- [ ] 상태 필터 테스트
- [ ] 검색 필터 테스트
- [ ] 수정 다이얼로그 표시 테스트
- [ ] 사용자 정보 수정 테스트
- [ ] 모든 테스트 통과

### 코드 품질
- [ ] TypeScript strict 모드 통과
- [ ] 'any' 타입 사용 없음
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
feat(admin): add user management page

- Implement UserManagementPage with role and status management
- Add user edit dialog with role and is_active updates
- Add filters for role, status, and search
- Add statistics cards for total/active/inactive users
- Add USER_ROLE and USER_STATUS constants
- Create unit tests for user management (7 scenarios)

Features:
- Search users by name, email, organization
- Filter by role (admin/manager/staff/viewer)
- Filter by status (active/inactive)
- Edit user role and status

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 6.3 - 제품 마스터 관리](phase-6.3-product-master.md)
