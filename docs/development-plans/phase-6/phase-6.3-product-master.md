# Phase 6.3: 제품 마스터 관리

## 📋 Overview

**Phase 6.3**은 관리자가 시스템의 모든 제품을 조회하고, 제품 승인을 관리하며, 제품 정보를 검증하는 기능을 구현합니다. UDI-DI 중복 검증 및 제품 활성화/비활성화 기능을 포함합니다.

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

### ProductMasterPage 컴포넌트

**파일 경로**: `src/pages/admin/ProductMasterPage.tsx`

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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/constants/messages'
import { PRODUCT_STATUS } from '@/constants/status'
import type { Product, Organization } from '@/types/database'

interface ProductWithOrganization extends Product {
  organization: Organization
}

interface ProductDetailDialogProps {
  product: ProductWithOrganization | null
  isOpen: boolean
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
  onToggleStatus: (id: string, newStatus: string) => void
}

function ProductDetailDialog({
  product,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onToggleStatus,
}: ProductDetailDialogProps) {
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = () => {
    if (product) {
      onApprove(product.id)
      onClose()
    }
  }

  const handleReject = () => {
    if (product && rejectionReason.trim()) {
      onReject(product.id, rejectionReason)
      onClose()
      setRejectionReason('')
      setIsRejecting(false)
    }
  }

  const handleToggleStatus = () => {
    if (product) {
      const newStatus =
        product.status === PRODUCT_STATUS.ACTIVE ? PRODUCT_STATUS.INACTIVE : PRODUCT_STATUS.ACTIVE
      onToggleStatus(product.id, newStatus)
      onClose()
    }
  }

  if (!product) return null

  const isPending = product.status === PRODUCT_STATUS.PENDING

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>제품 상세 정보</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">제품명</label>
              <div className="mt-1 text-base">{product.name}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">제조사</label>
              <div className="mt-1 text-base">{product.organization.name}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">UDI-DI</label>
              <div className="mt-1 font-mono text-base">{product.udi_di}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">모델명</label>
              <div className="mt-1 text-base">{product.model_name}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">상태</label>
              <div className="mt-1">
                <Badge
                  variant={
                    product.status === PRODUCT_STATUS.ACTIVE
                      ? 'default'
                      : product.status === PRODUCT_STATUS.PENDING
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {product.status === PRODUCT_STATUS.ACTIVE
                    ? '활성'
                    : product.status === PRODUCT_STATUS.PENDING
                      ? '승인 대기'
                      : product.status === PRODUCT_STATUS.REJECTED
                        ? '승인 거부'
                        : '비활성'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">등록일</label>
              <div className="mt-1 text-base">
                {new Date(product.created_at).toLocaleDateString('ko-KR')}
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">설명</label>
              <div className="mt-1 text-base">{product.description || '설명 없음'}</div>
            </div>

            {product.rejection_reason && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-red-600">거부 사유</label>
                <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                  {product.rejection_reason}
                </div>
              </div>
            )}
          </div>

          {isRejecting && (
            <div>
              <label className="text-sm font-medium text-gray-700">거부 사유 *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="제품 승인을 거부하는 사유를 입력해주세요."
                className="mt-1.5"
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {isPending ? (
            !isRejecting ? (
              <>
                <Button variant="outline" onClick={onClose}>
                  취소
                </Button>
                <Button variant="destructive" onClick={() => setIsRejecting(true)}>
                  거부
                </Button>
                <Button onClick={handleApprove}>승인</Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRejecting(false)
                    setRejectionReason('')
                  }}
                >
                  취소
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
                  거부 확정
                </Button>
              </>
            )
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                닫기
              </Button>
              <Button
                variant={product.status === PRODUCT_STATUS.ACTIVE ? 'destructive' : 'default'}
                onClick={handleToggleStatus}
              >
                {product.status === PRODUCT_STATUS.ACTIVE ? '비활성화' : '활성화'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ProductMasterPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedProduct, setSelectedProduct] = useState<ProductWithOrganization | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch all products
  const { data: products, isLoading } = useQuery({
    queryKey: ['allProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, organization:organizations(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ProductWithOrganization[]
    },
    enabled: !!user,
  })

  // Approve product mutation
  const approveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({
          status: PRODUCT_STATUS.ACTIVE,
          approved_at: new Date().toISOString(),
          approved_by: user!.id,
        })
        .eq('id', productId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProducts'] })
      toast({ title: SUCCESS_MESSAGES.PRODUCT.APPROVED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.PRODUCT.APPROVE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  // Reject product mutation
  const rejectProductMutation = useMutation({
    mutationFn: async ({ productId, reason }: { productId: string; reason: string }) => {
      const { error } = await supabase
        .from('products')
        .update({
          status: PRODUCT_STATUS.REJECTED,
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
          rejected_by: user!.id,
        })
        .eq('id', productId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProducts'] })
      toast({ title: SUCCESS_MESSAGES.PRODUCT.REJECTED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.PRODUCT.REJECT_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  // Toggle product status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ productId, newStatus }: { productId: string; newStatus: string }) => {
      const { error } = await supabase.from('products').update({ status: newStatus }).eq('id', productId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProducts'] })
      toast({ title: SUCCESS_MESSAGES.PRODUCT.STATUS_UPDATED })
    },
    onError: (error) => {
      toast({
        title: ERROR_MESSAGES.PRODUCT.STATUS_UPDATE_FAILED,
        description: error instanceof Error ? error.message : ERROR_MESSAGES.GENERAL.UNEXPECTED,
        variant: 'destructive',
      })
    },
  })

  const handleOpenDialog = (product: ProductWithOrganization) => {
    setSelectedProduct(product)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedProduct(null)
  }

  const handleApprove = (id: string) => {
    approveProductMutation.mutate(id)
  }

  const handleReject = (id: string, reason: string) => {
    rejectProductMutation.mutate({ productId: id, reason })
  }

  const handleToggleStatus = (id: string, newStatus: string) => {
    toggleStatusMutation.mutate({ productId: id, newStatus })
  }

  const filteredProducts = products?.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.udi_di.includes(searchQuery) ||
      p.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.organization.name.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center">데이터를 불러오는 중...</div>
  }

  const totalProducts = products?.length ?? 0
  const activeProducts = products?.filter((p) => p.status === PRODUCT_STATUS.ACTIVE).length ?? 0
  const pendingProducts = products?.filter((p) => p.status === PRODUCT_STATUS.PENDING).length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">제품 마스터 관리</h1>
        <p className="mt-1 text-sm text-gray-600">시스템의 모든 제품을 조회하고 승인합니다</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">전체 제품</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}개</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">활성 제품</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeProducts}개</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">승인 대기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingProducts}개</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>제품 목록</CardTitle>
          <div className="mt-4 flex flex-col gap-4 md:flex-row">
            <Input
              placeholder="제품명, UDI-DI, 모델명, 제조사 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:w-96"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="all">전체 상태</option>
              <option value={PRODUCT_STATUS.ACTIVE}>활성</option>
              <option value={PRODUCT_STATUS.PENDING}>승인 대기</option>
              <option value={PRODUCT_STATUS.INACTIVE}>비활성</option>
              <option value={PRODUCT_STATUS.REJECTED}>승인 거부</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제품명</TableHead>
                <TableHead>UDI-DI</TableHead>
                <TableHead>모델명</TableHead>
                <TableHead>제조사</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    제품이 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-sm">{p.udi_di}</TableCell>
                    <TableCell>{p.model_name}</TableCell>
                    <TableCell>{p.organization.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === PRODUCT_STATUS.ACTIVE
                            ? 'default'
                            : p.status === PRODUCT_STATUS.PENDING
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {p.status === PRODUCT_STATUS.ACTIVE
                          ? '활성'
                          : p.status === PRODUCT_STATUS.PENDING
                            ? '승인 대기'
                            : p.status === PRODUCT_STATUS.REJECTED
                              ? '승인 거부'
                              : '비활성'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString('ko-KR')}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(p)}>
                        상세
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductDetailDialog
        product={selectedProduct}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onApprove={handleApprove}
        onReject={handleReject}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  )
}
```

---

## 🗄️ Database Migration

### products 테이블 컬럼 추가

**파일 경로**: `supabase/migrations/XXXXXX_add_product_approval_fields.sql`

```sql
-- Add approval-related fields to products table
-- Note: CHECK constraints use string literals (PostgreSQL requirement)
-- Application code MUST use PRODUCT_STATUS constants from src/constants/status.ts
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_approved_by ON products(approved_by);
CREATE INDEX IF NOT EXISTS idx_products_rejected_by ON products(rejected_by);

-- Add comment
COMMENT ON COLUMN products.status IS '제품 상태: ACTIVE, INACTIVE, PENDING, REJECTED';
COMMENT ON COLUMN products.approved_at IS '승인 일시';
COMMENT ON COLUMN products.approved_by IS '승인한 관리자 ID';
COMMENT ON COLUMN products.rejected_at IS '거부 일시';
COMMENT ON COLUMN products.rejected_by IS '거부한 관리자 ID';
COMMENT ON COLUMN products.rejection_reason IS '거부 사유';
```

---

## 🔧 Constants Definitions

**파일 경로**: `src/constants/status.ts` (추가)

```typescript
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const
```

**파일 경로**: `src/constants/messages.ts` (추가)

```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존
  PRODUCT: {
    // ... 기존
    APPROVED: '제품 승인이 완료되었습니다.',
    REJECTED: '제품 승인이 거부되었습니다.',
    STATUS_UPDATED: '제품 상태가 변경되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존
  PRODUCT: {
    // ... 기존
    APPROVE_FAILED: '제품 승인에 실패했습니다.',
    REJECT_FAILED: '제품 거부에 실패했습니다.',
    STATUS_UPDATE_FAILED: '제품 상태 변경에 실패했습니다.',
  },
} as const
```

---

## 🧪 Test Scenarios

### 1. Unit Test: ProductMasterPage

**파일 경로**: `src/pages/admin/__tests__/ProductMasterPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProductMasterPage } from '../ProductMasterPage'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-123', role: 'admin' } }),
}))

const mockProducts = [
  {
    id: 'product-1',
    name: '의료용 실',
    udi_di: '12345678901234',
    model_name: 'Thread-A100',
    description: 'PDO 단일 실',
    status: 'ACTIVE',
    created_at: '2025-01-10T00:00:00Z',
    organization: {
      id: 'org-1',
      name: '테스트 제조사',
    },
  },
  {
    id: 'product-2',
    name: '의료용 바늘',
    udi_di: '98765432109876',
    model_name: 'Needle-B200',
    description: '안전 바늘',
    status: 'PENDING',
    created_at: '2025-01-15T00:00:00Z',
    organization: {
      id: 'org-2',
      name: '테스트 제조사2',
    },
  },
  {
    id: 'product-3',
    name: '의료용 가위',
    udi_di: '11223344556677',
    model_name: 'Scissor-C300',
    description: '수술용 가위',
    status: 'INACTIVE',
    created_at: '2025-01-20T00:00:00Z',
    organization: {
      id: 'org-3',
      name: '테스트 제조사3',
    },
  },
]

describe('ProductMasterPage', () => {
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
        <ProductMasterPage />
      </QueryClientProvider>
    )
  }

  it('전체 제품 목록을 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      }),
    } as any)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
      expect(screen.getByText('의료용 바늘')).toBeInTheDocument()
      expect(screen.getByText('의료용 가위')).toBeInTheDocument()
    })

    expect(screen.getByText('3개')).toBeInTheDocument() // 전체 제품
  })

  it('제품 통계를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      }),
    } as any)

    renderComponent()

    await waitFor(() => {
      const activeCount = screen.getAllByText('1개')[0] // 활성 제품
      const pendingCount = screen.getAllByText('1개')[1] // 승인 대기
      expect(activeCount).toBeInTheDocument()
      expect(pendingCount).toBeInTheDocument()
    })
  })

  it('상태 필터가 정상 동작해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    const statusSelect = screen.getByRole('combobox')
    await user.selectOptions(statusSelect, PRODUCT_STATUS.PENDING)

    await waitFor(() => {
      expect(screen.getByText('의료용 바늘')).toBeInTheDocument()
      expect(screen.queryByText('의료용 실')).not.toBeInTheDocument()
    })
  })

  it('검색 필터가 정상 동작해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('제품명, UDI-DI, 모델명, 제조사 검색')
    await user.type(searchInput, 'Thread')

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
      expect(screen.queryByText('의료용 바늘')).not.toBeInTheDocument()
    })
  })

  it('상세 버튼 클릭 시 상세 다이얼로그를 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    const detailButtons = screen.getAllByText('상세')
    await user.click(detailButtons[0])

    await waitFor(() => {
      expect(screen.getByText('제품 상세 정보')).toBeInTheDocument()
      expect(screen.getByText('12345678901234')).toBeInTheDocument()
    })
  })

  it('승인 대기 제품에 대해 승인/거부 버튼을 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('의료용 바늘')).toBeInTheDocument()
    })

    const detailButtons = screen.getAllByText('상세')
    await user.click(detailButtons[1]) // 두 번째 제품 (pending)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '승인' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '거부' })).toBeInTheDocument()
    })
  })

  it('활성 제품에 대해 비활성화 버튼을 표시해야 한다', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      }),
    } as any)

    renderComponent()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('의료용 실')).toBeInTheDocument()
    })

    const detailButtons = screen.getAllByText('상세')
    await user.click(detailButtons[0]) // 첫 번째 제품 (active)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '비활성화' })).toBeInTheDocument()
    })
  })
})
```

---

## 🚨 Troubleshooting

### Issue 1: UDI-DI 중복 제품이 승인됨

**증상**: 같은 UDI-DI를 가진 제품이 여러 개 승인됨

**원인**: 승인 시 UDI-DI 중복 검증 누락

**해결방법**:
```typescript
const approveProductMutation = useMutation({
  mutationFn: async (productId: string) => {
    const product = products?.find((p) => p.id === productId)

    // UDI-DI 중복 검사
    const { data: duplicates } = await supabase
      .from('products')
      .select('id')
      .eq('udi_di', product!.udi_di)
      .eq('status', PRODUCT_STATUS.ACTIVE)
      .neq('id', productId)

    if (duplicates && duplicates.length > 0) {
      throw new Error('이미 활성화된 동일한 UDI-DI 제품이 존재합니다.')
    }

    const { error } = await supabase
      .from('products')
      .update({
        status: PRODUCT_STATUS.ACTIVE,
        approved_at: new Date().toISOString(),
        approved_by: user!.id,
      })
      .eq('id', productId)

    if (error) throw error
  },
})
```

### Issue 2: 거부 사유 없이 거부 가능

**증상**: 거부 사유를 입력하지 않고도 제품이 거부됨

**원인**: 거부 사유 필수 검증 누락

**해결방법**:
```typescript
<Button
  variant="destructive"
  onClick={handleReject}
  disabled={!rejectionReason.trim()} // ← 필수 검증
>
  거부 확정
</Button>
```

### Issue 3: 제품 상태 변경 후 목록이 갱신되지 않음

**증상**: 제품을 활성화/비활성화했지만 목록에 반영되지 않음

**원인**: QueryClient 캐시 무효화 누락

**해결방법**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['allProducts'] }) // ← 반드시 포함
  toast({ title: SUCCESS_MESSAGES.PRODUCT.STATUS_UPDATED })
}
```

### Issue 4: 제조사가 아닌 조직의 제품도 표시됨

**증상**: 유통사나 병원의 잘못된 제품 레코드가 목록에 표시됨

**원인**: 조직 유형 필터 누락

**해결방법**:
```typescript
const { data, error } = await supabase
  .from('products')
  .select('*, organization:organizations!inner(*)')
  .eq('organization.type', ORGANIZATION_TYPE.MANUFACTURER) // ← 제조사만 필터링
  .order('created_at', { ascending: false })
```

### Issue 5: 다이얼로그가 열릴 때 이전 데이터가 표시됨

**증상**: 다른 제품을 선택했지만 이전 제품의 정보가 표시됨

**원인**: 상태 초기화 타이밍 문제

**해결방법**:
```typescript
const handleOpenDialog = (product: ProductWithOrganization) => {
  setSelectedProduct(product)
  setIsDialogOpen(true)
}

const handleCloseDialog = () => {
  setIsDialogOpen(false)
  // 다이얼로그가 완전히 닫힌 후 상태 초기화
  setTimeout(() => setSelectedProduct(null), 200)
}
```

---

## ✅ Definition of Done

### 기능 구현
- [ ] ProductMasterPage 컴포넌트 구현 완료
- [ ] 전체 제품 목록 조회 기능
- [ ] 제품 상세 정보 다이얼로그
- [ ] 제품 승인 기능
- [ ] 제품 거부 기능 (사유 입력 포함)
- [ ] 제품 활성화/비활성화 기능
- [ ] 상태 필터 기능 (active/pending/inactive/rejected)
- [ ] 검색 기능 (제품명, UDI-DI, 모델명, 제조사)
- [ ] 통계 카드 (전체/활성/승인 대기 제품 수)

### 데이터베이스
- [ ] products 테이블에 승인 관련 컬럼 추가
  - [ ] status (제품 상태)
  - [ ] approved_at (승인 일시)
  - [ ] approved_by (승인 관리자 ID)
  - [ ] rejected_at (거부 일시)
  - [ ] rejected_by (거부 관리자 ID)
  - [ ] rejection_reason (거부 사유)
- [ ] 인덱스 추가 (status, approved_by, rejected_by)

### UI/UX
- [ ] 제품 상태별 Badge 색상 구분
- [ ] 승인 대기 제품에 승인/거부 버튼 표시
- [ ] 활성/비활성 제품에 토글 버튼 표시
- [ ] 거부 사유 입력란 표시/숨김 처리
- [ ] 거부 사유 표시 (rejected 제품)
- [ ] 빈 상태 메시지 표시
- [ ] 반응형 레이아웃 (모바일 지원)

### 상수 관리
- [ ] PRODUCT_STATUS 상수 정의 (active/inactive/pending/rejected)
- [ ] SUCCESS_MESSAGES.PRODUCT 정의 (approved, rejected, status_updated)
- [ ] ERROR_MESSAGES.PRODUCT 정의 (approve_failed, reject_failed, status_update_failed)

### 테스트
- [ ] Unit Test 작성 (6개 시나리오)
- [ ] 제품 목록 조회 테스트
- [ ] 통계 표시 테스트
- [ ] 상태 필터 테스트
- [ ] 검색 필터 테스트
- [ ] 상세 다이얼로그 표시 테스트
- [ ] 승인/거부 버튼 조건부 표시 테스트
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
- [ ] Database migration 스크립트 작성
- [ ] Troubleshooting 가이드 작성 (5개 이슈)
- [ ] Test scenarios 문서화

### 버전 관리
- [ ] Git commit (Conventional Commits)
- [ ] Migration 파일 버전 관리

---

## 🔄 Git Commit Message

```bash
feat(admin): add product master management

- Implement ProductMasterPage with product approval workflow
- Add product detail dialog with approval/rejection
- Add product activation/deactivation toggle
- Add status filter (active/pending/inactive/rejected)
- Add search filter (name, UDI-DI, model, manufacturer)
- Update products table with approval-related fields
- Add PRODUCT_STATUS constants (pending, rejected)
- Create unit tests for product master management (6 scenarios)

Database changes:
- Add status, approved_at, approved_by, rejected_at, rejected_by, rejection_reason columns
- Add indexes for status and approval fields

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ⏭️ Next Steps

**다음 단계**: [Phase 6.4 - 시스템 모니터링](phase-6.4-system-monitoring.md)
