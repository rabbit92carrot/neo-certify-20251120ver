# Phase 2.3: 회원가입 UI

## 📋 개요

**목표**: 조직 등록 로직 포함 회원가입 페이지 구현
**선행 조건**: Phase 2.2 (로그인 UI) 완료
**예상 소요 시간**: 5-6시간

이 Phase에서는 다단계 회원가입 프로세스를 구현합니다. 역할 선택, 사업자등록번호 조회, 조직 정보 입력, 사업자등록증 업로드, 회원 정보 입력의 5단계로 구성됩니다.

---

## 🎯 개발 원칙 준수 체크리스트

- [x] **SSOT**: ORGANIZATION_TYPE, FILE_SIZE_LIMITS 상수 사용
- [x] **No Magic Numbers**: 파일 크기, 단계 수 상수화
- [x] **No 'any' Type**: Zod 스키마로 타입 추론
- [x] **Clean Code**: 단계별 컴포넌트 분리, 명확한 함수명
- [ ] **테스트 작성**: RegisterPage 컴포넌트 테스트
- [ ] **Git commit**: Conventional Commits 형식
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 📦 작업 내용

### 1. 회원가입 페이지 (메인 컴포넌트)

**src/pages/auth/RegisterPage.tsx**:
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { RoleSelection } from './components/RoleSelection'
import { BusinessNumberCheck } from './components/BusinessNumberCheck'
import { OrganizationForm } from './components/OrganizationForm'
import { UserInfoForm } from './components/UserInfoForm'
import { RegistrationComplete } from './components/RegistrationComplete'
import type { OrganizationType } from '@/types/auth'
import type { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

const REGISTRATION_STEPS = {
  ROLE_SELECTION: 1,
  BUSINESS_NUMBER: 2,
  ORGANIZATION_INFO: 3,
  USER_INFO: 4,
  COMPLETE: 5,
} as const

export function RegisterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // 단계 관리
  const [currentStep, setCurrentStep] = useState(REGISTRATION_STEPS.ROLE_SELECTION)

  // 회원가입 데이터
  const [selectedRole, setSelectedRole] = useState<OrganizationType | null>(null)
  const [businessNumber, setBusinessNumber] = useState('')
  const [existingOrganization, setExistingOrganization] = useState<Organization | null>(null)
  const [newOrganizationId, setNewOrganizationId] = useState<string | null>(null)

  // 단계 1: 역할 선택
  const handleRoleSelect = (role: OrganizationType) => {
    setSelectedRole(role)
    setCurrentStep(REGISTRATION_STEPS.BUSINESS_NUMBER)
  }

  // 단계 2: 사업자등록번호 확인
  const handleBusinessNumberSubmit = (
    businessNumber: string,
    organization: Organization | null
  ) => {
    setBusinessNumber(businessNumber)
    setExistingOrganization(organization)

    if (organization) {
      // 기존 조직 존재 → 사용자 정보 입력으로
      setCurrentStep(REGISTRATION_STEPS.USER_INFO)
    } else {
      // 신규 조직 → 조직 정보 입력으로
      setCurrentStep(REGISTRATION_STEPS.ORGANIZATION_INFO)
    }
  }

  // 단계 3: 조직 정보 입력 (신규 조직만)
  const handleOrganizationSubmit = (organizationId: string) => {
    setNewOrganizationId(organizationId)
    setCurrentStep(REGISTRATION_STEPS.USER_INFO)
  }

  // 단계 4: 사용자 정보 입력
  const handleUserInfoSubmit = () => {
    setCurrentStep(REGISTRATION_STEPS.COMPLETE)
  }

  // 이전 단계로
  const handleBack = () => {
    if (currentStep > REGISTRATION_STEPS.ROLE_SELECTION) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">네오인증서</h1>
          <p className="mt-2 text-sm text-gray-600">회원가입</p>
        </div>

        {/* 진행 상태 표시 */}
        {currentStep < REGISTRATION_STEPS.COMPLETE && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {Array.from({ length: 4 }, (_, i) => i + 1).map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      step <= currentStep
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`h-1 w-full ${
                        step < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-600">
              <span>역할 선택</span>
              <span>사업자 확인</span>
              <span>조직 정보</span>
              <span>회원 정보</span>
            </div>
          </div>
        )}

        {/* 단계별 컴포넌트 */}
        <div className="rounded-lg bg-white px-8 py-10 shadow">
          {currentStep === REGISTRATION_STEPS.ROLE_SELECTION && (
            <RoleSelection onSelect={handleRoleSelect} />
          )}

          {currentStep === REGISTRATION_STEPS.BUSINESS_NUMBER && (
            <BusinessNumberCheck
              role={selectedRole!}
              onSubmit={handleBusinessNumberSubmit}
              onBack={handleBack}
            />
          )}

          {currentStep === REGISTRATION_STEPS.ORGANIZATION_INFO && (
            <OrganizationForm
              role={selectedRole!}
              businessNumber={businessNumber}
              onSubmit={handleOrganizationSubmit}
              onBack={handleBack}
            />
          )}

          {currentStep === REGISTRATION_STEPS.USER_INFO && (
            <UserInfoForm
              organizationId={existingOrganization?.id || newOrganizationId!}
              onSubmit={handleUserInfoSubmit}
              onBack={handleBack}
            />
          )}

          {currentStep === REGISTRATION_STEPS.COMPLETE && (
            <RegistrationComplete />
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### 2. 단계 1: 역할 선택 컴포넌트

**src/pages/auth/components/RoleSelection.tsx**:
```typescript
import { ORGANIZATION_TYPE } from '@/constants/status'
import type { OrganizationType } from '@/types/auth'

interface RoleSelectionProps {
  onSelect: (role: OrganizationType) => void
}

export function RoleSelection({ onSelect }: RoleSelectionProps) {
  const roles = [
    {
      type: ORGANIZATION_TYPE.MANUFACTURER,
      title: '제조사',
      description: 'PDO threads 제조 및 생산 관리',
      icon: '🏭',
    },
    {
      type: ORGANIZATION_TYPE.DISTRIBUTOR,
      title: '유통사',
      description: '제품 유통 및 재고 관리',
      icon: '🚚',
    },
    {
      type: ORGANIZATION_TYPE.HOSPITAL,
      title: '병원',
      description: '시술 등록 및 환자 인증 발급',
      icon: '🏥',
    },
  ]

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        역할을 선택해주세요
      </h2>

      <div className="space-y-4">
        {roles.map((role) => (
          <button
            key={role.type}
            onClick={() => onSelect(role.type as OrganizationType)}
            className="w-full rounded-lg border-2 border-gray-200 p-6 text-left transition-colors hover:border-blue-500 hover:bg-blue-50"
          >
            <div className="flex items-center">
              <div className="text-4xl">{role.icon}</div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {role.title}
                </h3>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

### 3. 단계 2: 사업자등록번호 확인 컴포넌트

**src/pages/auth/components/BusinessNumberCheck.tsx**:
```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { VALIDATION_RULES } from '@/constants/validation'
import type { OrganizationType } from '@/types/auth'
import type { Database } from '@/types/database'

type Organization = Database['public']['Tables']['organizations']['Row']

const businessNumberSchema = z.object({
  businessNumber: z
    .string()
    .min(1, '사업자등록번호를 입력해주세요.')
    .regex(
      VALIDATION_RULES.BUSINESS_NUMBER.PATTERN,
      '올바른 사업자등록번호 형식이 아닙니다. (000-00-00000)'
    ),
})

type BusinessNumberFormData = z.infer<typeof businessNumberSchema>

interface BusinessNumberCheckProps {
  role: OrganizationType
  onSubmit: (businessNumber: string, organization: Organization | null) => void
  onBack: () => void
}

export function BusinessNumberCheck({
  role,
  onSubmit,
  onBack,
}: BusinessNumberCheckProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [existingOrg, setExistingOrg] = useState<Organization | null>(null)

  const form = useForm<BusinessNumberFormData>({
    resolver: zodResolver(businessNumberSchema),
    defaultValues: {
      businessNumber: '',
    },
  })

  const handleSubmit = async (data: BusinessNumberFormData) => {
    setIsLoading(true)

    try {
      // 사업자등록번호로 조직 조회
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('business_number', data.businessNumber)
        .eq('type', role)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116: No rows returned (정상 - 신규 조직)
        throw error
      }

      if (organization) {
        // 기존 조직 존재
        setExistingOrg(organization)
        toast({
          title: '조직 확인 완료',
          description: `${organization.name}에 소속됩니다.`,
        })
      } else {
        // 신규 조직
        toast({
          title: '신규 조직 등록',
          description: '조직 정보를 입력해주세요.',
        })
      }

      onSubmit(data.businessNumber, organization)
    } catch (error) {
      toast({
        title: '조회 실패',
        description: error instanceof Error ? error.message : '사업자등록번호 조회 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        사업자등록번호를 입력해주세요
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="businessNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>사업자등록번호</FormLabel>
                <FormControl>
                  <Input
                    placeholder="000-00-00000"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  하이픈(-)을 포함하여 입력해주세요.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1"
            >
              이전
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? '확인 중...' : '다음'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

---

### 4. 단계 3: 조직 정보 입력 컴포넌트

**src/pages/auth/components/OrganizationForm.tsx**:
```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/constants/messages'
import { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES } from '@/constants/validation'
import type { OrganizationType } from '@/types/auth'

const organizationSchema = z.object({
  name: z.string().min(1, '조직명을 입력해주세요.'),
  representativeName: z.string().min(1, '대표자명을 입력해주세요.'),
  representativeContact: z
    .string()
    .min(1, '연락처를 입력해주세요.')
    .regex(/^010-\d{4}-\d{4}$/, '올바른 연락처 형식이 아닙니다. (010-0000-0000)'),
  address: z.string().min(1, '주소를 입력해주세요.'),
  businessLicense: z
    .instanceof(FileList)
    .refine((files) => files.length > 0, '사업자등록증을 업로드해주세요.')
    .refine(
      (files) => files[0]?.size <= FILE_SIZE_LIMITS.BUSINESS_LICENSE,
      `파일 크기는 ${FILE_SIZE_LIMITS.BUSINESS_LICENSE / 1024 / 1024}MB 이하여야 합니다.`
    )
    .refine(
      (files) => ALLOWED_FILE_TYPES.BUSINESS_LICENSE.includes(files[0]?.type),
      '지원하지 않는 파일 형식입니다. (PDF, JPG, PNG만 가능)'
    ),
})

type OrganizationFormData = z.infer<typeof organizationSchema>

interface OrganizationFormProps {
  role: OrganizationType
  businessNumber: string
  onSubmit: (organizationId: string) => void
  onBack: () => void
}

export function OrganizationForm({
  role,
  businessNumber,
  onSubmit,
  onBack,
}: OrganizationFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      representativeName: '',
      representativeContact: '',
      address: '',
    },
  })

  const handleSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true)

    try {
      // 1. 사업자등록증 업로드
      const file = data.businessLicense[0]
      const fileName = `${Date.now()}_${file.name}`
      const tempOrgId = crypto.randomUUID()

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-licenses')
        .upload(`${tempOrgId}/${fileName}`, file)

      if (uploadError) throw uploadError

      // 2. 조직 생성
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          type: role,
          business_number: businessNumber,
          business_license_file: uploadData.path,
          name: data.name,
          representative_name: data.representativeName,
          representative_contact: data.representativeContact,
          address: data.address,
          status: 'PENDING_APPROVAL',
        })
        .select()
        .single()

      if (orgError) throw orgError

      toast({
        title: SUCCESS_MESSAGES.ORGANIZATION.CREATED,
        description: '관리자 승인 후 이용 가능합니다.',
      })

      onSubmit(organization.id)
    } catch (error) {
      toast({
        title: '조직 등록 실패',
        description: error instanceof Error ? error.message : ERROR_MESSAGES.ORGANIZATION.CREATE_FAILED,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        조직 정보를 입력해주세요
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* 조직명 */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>조직명</FormLabel>
                <FormControl>
                  <Input
                    placeholder="(주)네오닥터"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 대표자명 */}
          <FormField
            control={form.control}
            name="representativeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>대표자명</FormLabel>
                <FormControl>
                  <Input
                    placeholder="홍길동"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 대표 연락처 */}
          <FormField
            control={form.control}
            name="representativeContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>대표 연락처</FormLabel>
                <FormControl>
                  <Input
                    placeholder="010-0000-0000"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 주소 */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>주소</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="서울특별시 강남구..."
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 사업자등록증 */}
          <FormField
            control={form.control}
            name="businessLicense"
            render={({ field: { value, onChange, ...field } }) => (
              <FormItem>
                <FormLabel>사업자등록증</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={isLoading}
                    onChange={(e) => onChange(e.target.files)}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1"
            >
              이전
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? '등록 중...' : '다음'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

---

### 5. 단계 4: 사용자 정보 입력 컴포넌트

**src/pages/auth/components/UserInfoForm.tsx**:
```typescript
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { VALIDATION_RULES } from '@/constants/validation'
import { ERROR_MESSAGES } from '@/constants/messages'

const userInfoSchema = z
  .object({
    email: z.string().min(1, '이메일을 입력해주세요.').email('올바른 이메일 형식이 아닙니다.'),
    password: z
      .string()
      .min(
        VALIDATION_RULES.PASSWORD.MIN_LENGTH,
        `비밀번호는 최소 ${VALIDATION_RULES.PASSWORD.MIN_LENGTH}자 이상이어야 합니다.`
      ),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
    name: z.string().min(1, '이름을 입력해주세요.'),
    contact: z
      .string()
      .min(1, '연락처를 입력해주세요.')
      .regex(/^010-\d{4}-\d{4}$/, '올바른 연락처 형식이 아닙니다. (010-0000-0000)'),
    department: z.string().optional(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  })

type UserInfoFormData = z.infer<typeof userInfoSchema>

interface UserInfoFormProps {
  organizationId: string
  onSubmit: () => void
  onBack: () => void
}

export function UserInfoForm({
  organizationId,
  onSubmit,
  onBack,
}: UserInfoFormProps) {
  const { signUp } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<UserInfoFormData>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      email: '',
      password: '',
      passwordConfirm: '',
      name: '',
      contact: '',
      department: '',
    },
  })

  const handleSubmit = async (data: UserInfoFormData) => {
    setIsLoading(true)

    try {
      // 1. Auth 사용자 생성
      const authUser = await signUp(data.email, data.password)

      // 2. Users 테이블에 프로필 저장
      const { error: profileError } = await supabase.from('users').insert({
        id: authUser.id,
        email: data.email,
        name: data.name,
        contact: data.contact,
        department: data.department || null,
        organization_id: organizationId,
      })

      if (profileError) throw profileError

      toast({
        title: '회원가입 완료',
        description: '관리자 승인 후 로그인 가능합니다.',
      })

      onSubmit()
    } catch (error) {
      toast({
        title: '회원가입 실패',
        description: error instanceof Error ? error.message : ERROR_MESSAGES.AUTH.SIGNUP_FAILED,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        회원 정보를 입력해주세요
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* 이메일 */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="email"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 비밀번호 */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 비밀번호 확인 */}
          <FormField
            control={form.control}
            name="passwordConfirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호 확인</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••"
                    autoComplete="new-password"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 이름 */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름</FormLabel>
                <FormControl>
                  <Input placeholder="홍길동" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 연락처 */}
          <FormField
            control={form.control}
            name="contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>연락처</FormLabel>
                <FormControl>
                  <Input
                    placeholder="010-0000-0000"
                    disabled={isLoading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 부서 (선택) */}
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>부서 (선택)</FormLabel>
                <FormControl>
                  <Input placeholder="영업팀" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={isLoading}
              className="flex-1"
            >
              이전
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? '가입 중...' : '회원가입 완료'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

---

### 6. 단계 5: 가입 완료 컴포넌트

**src/pages/auth/components/RegistrationComplete.tsx**:
```typescript
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function RegistrationComplete() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-8 w-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h2 className="mb-4 text-2xl font-semibold text-gray-900">
        회원가입이 완료되었습니다!
      </h2>

      <p className="mb-8 text-gray-600">
        관리자 승인 후 로그인이 가능합니다.
        <br />
        승인 완료 시 이메일로 알림을 보내드립니다.
      </p>

      <Link to="/auth/login">
        <Button className="w-full">로그인 페이지로 이동</Button>
      </Link>
    </div>
  )
}
```

---

## 📝 TypeScript 타입 정의

**src/types/auth.ts** (추가):
```typescript
export type OrganizationType = 'MANUFACTURER' | 'DISTRIBUTOR' | 'HOSPITAL'
```

---

## 🔧 Constants 정의

**src/constants/validation.ts** (추가):
```typescript
export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 6,
  },
  BUSINESS_NUMBER: {
    PATTERN: /^\d{3}-\d{2}-\d{5}$/,
  },
} as const

export const FILE_SIZE_LIMITS = {
  BUSINESS_LICENSE: 10 * 1024 * 1024, // 10MB
} as const

export const ALLOWED_FILE_TYPES = {
  BUSINESS_LICENSE: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
} as const
```

**src/constants/messages.ts** (추가):
```typescript
export const SUCCESS_MESSAGES = {
  // ... 기존 메시지들
  ORGANIZATION: {
    CREATED: '조직이 등록되었습니다.',
  },
} as const

export const ERROR_MESSAGES = {
  // ... 기존 메시지들
  ORGANIZATION: {
    CREATE_FAILED: '조직 등록에 실패했습니다.',
  },
} as const
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `src/pages/auth/RegisterPage.tsx`
- `src/pages/auth/components/RoleSelection.tsx`
- `src/pages/auth/components/BusinessNumberCheck.tsx`
- `src/pages/auth/components/OrganizationForm.tsx`
- `src/pages/auth/components/UserInfoForm.tsx`
- `src/pages/auth/components/RegistrationComplete.tsx`

**수정**:
- `src/types/auth.ts` (OrganizationType 추가)
- `src/constants/validation.ts` (BUSINESS_NUMBER, FILE_SIZE_LIMITS 추가)
- `src/constants/messages.ts` (ORGANIZATION 메시지 추가)

---

## ✅ 테스트 요구사항

### 1. RegisterPage 통합 테스트

**tests/pages/auth/RegisterPage.test.tsx**:
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { AuthProvider } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase')

const renderRegisterPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows role selection on initial render', () => {
    renderRegisterPage()

    expect(screen.getByText(/역할을 선택해주세요/i)).toBeInTheDocument()
    expect(screen.getByText(/제조사/i)).toBeInTheDocument()
    expect(screen.getByText(/유통사/i)).toBeInTheDocument()
    expect(screen.getByText(/병원/i)).toBeInTheDocument()
  })

  it('moves to business number step after role selection', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    const manufacturerButton = screen.getByText(/제조사/)
    await user.click(manufacturerButton)

    await waitFor(() => {
      expect(screen.getByText(/사업자등록번호를 입력해주세요/i)).toBeInTheDocument()
    })
  })

  it('validates business number format', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    // Step 1: Select role
    await user.click(screen.getByText(/제조사/))

    // Step 2: Enter invalid business number
    await waitFor(() => {
      expect(screen.getByLabelText(/사업자등록번호/i)).toBeInTheDocument()
    })

    const input = screen.getByLabelText(/사업자등록번호/i)
    await user.type(input, '123456789')

    const submitButton = screen.getByRole('button', { name: /다음/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/올바른 사업자등록번호 형식이 아닙니다/i)).toBeInTheDocument()
    })
  })

  it('moves to organization form for new business number', async () => {
    const user = userEvent.setup()

    // Mock: No existing organization
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      }),
    })

    renderRegisterPage()

    // Step 1: Select role
    await user.click(screen.getByText(/제조사/))

    // Step 2: Enter business number
    await waitFor(() => {
      expect(screen.getByLabelText(/사업자등록번호/i)).toBeInTheDocument()
    })

    const input = screen.getByLabelText(/사업자등록번호/i)
    await user.type(input, '123-45-67890')

    const submitButton = screen.getByRole('button', { name: /다음/i })
    await user.click(submitButton)

    // Step 3: Should show organization form
    await waitFor(() => {
      expect(screen.getByText(/조직 정보를 입력해주세요/i)).toBeInTheDocument()
    })
  })

  it('skips to user info form for existing organization', async () => {
    const user = userEvent.setup()

    // Mock: Existing organization
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'org-123',
                name: 'Test Organization',
                business_number: '123-45-67890',
              },
              error: null,
            }),
          }),
        }),
      }),
    })

    renderRegisterPage()

    // Step 1: Select role
    await user.click(screen.getByText(/제조사/))

    // Step 2: Enter existing business number
    await waitFor(() => {
      expect(screen.getByLabelText(/사업자등록번호/i)).toBeInTheDocument()
    })

    const input = screen.getByLabelText(/사업자등록번호/i)
    await user.type(input, '123-45-67890')

    const submitButton = screen.getByRole('button', { name: /다음/i })
    await user.click(submitButton)

    // Step 3: Should skip to user info form
    await waitFor(() => {
      expect(screen.getByText(/회원 정보를 입력해주세요/i)).toBeInTheDocument()
    })
  })
})
```

---

## 🔄 Git Commit

```bash
# 파일 추가
git add src/pages/auth/RegisterPage.tsx src/pages/auth/components/*.tsx src/types/auth.ts src/constants/validation.ts src/constants/messages.ts tests/pages/auth/RegisterPage.test.tsx

# Conventional Commit
git commit -m "feat(auth): Implement multi-step registration with organization logic

- Add RegisterPage with 5-step registration flow
- Add RoleSelection component for role choice (manufacturer/distributor/hospital)
- Add BusinessNumberCheck component with organization lookup
- Add OrganizationForm component with file upload for business license
- Add UserInfoForm component with Auth user creation and profile save
- Add RegistrationComplete component
- Add business number validation pattern to constants
- Add file size limits and allowed file types to constants
- Add ORGANIZATION success/error messages
- Add comprehensive RegisterPage integration tests

Registration Flow:
1. Role selection (manufacturer/distributor/hospital)
2. Business number check (existing org vs new org)
3. Organization info (if new org) + file upload
4. User info (email, password, name, contact, department)
5. Registration complete (pending admin approval)

Tests:
- Role selection rendering test
- Step navigation test
- Business number validation test
- New organization flow test
- Existing organization flow test

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push origin main
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] `src/pages/auth/RegisterPage.tsx` 메인 컴포넌트 구현 완료
- [ ] `RoleSelection` 컴포넌트 구현 완료
- [ ] `BusinessNumberCheck` 컴포넌트 구현 완료 (조직 조회 로직 포함)
- [ ] `OrganizationForm` 컴포넌트 구현 완료 (파일 업로드 포함)
- [ ] `UserInfoForm` 컴포넌트 구현 완료 (Auth + Profile 저장)
- [ ] `RegistrationComplete` 컴포넌트 구현 완료
- [ ] 5단계 플로우 정상 동작 확인
- [ ] 진행 상태 표시 UI 정상 동작
- [ ] 사업자등록번호 조회 로직 동작
- [ ] 사업자등록증 파일 업로드 동작
- [ ] 기존 조직 연결 플로우 동작
- [ ] 신규 조직 생성 플로우 동작
- [ ] RegisterPage 통합 테스트 작성 및 통과 (5개 시나리오)
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 에러 없음
- [ ] Git commit 완료 (Conventional Commits)
- [ ] Git push 완료
- [ ] 다음 Phase 진행 가능 (Phase 2.4)

---

## 🔗 참고 자료

- [React Hook Form - Multi-Step Forms](https://react-hook-form.com/advanced-usage#WizardFormFunnel)
- [Supabase Storage Upload](https://supabase.com/docs/guides/storage/uploads)
- [Zod File Validation](https://zod.dev/?id=instanceof)
- [shadcn/ui File Input](https://ui.shadcn.com/docs/components/form#file-input)

---

## ⏭️ 다음 단계

[Phase 2.4 - 레이아웃 및 네비게이션](phase-2.4-layout-navigation.md)

**작업 내용**:
- BaseLayout 컴포넌트 구현
- Sidebar 컴포넌트 구현 (역할별 메뉴)
- Header 컴포넌트 구현 (사용자 정보, 로그아웃)
- 반응형 네비게이션
