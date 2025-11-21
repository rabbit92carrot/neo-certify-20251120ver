# Phase 0.6: Feature Flags (기능 토글)

## 📋 Overview

**Phase 0.6**은 MVP 개발 및 프로덕션 배포 시 기능을 켜고 끌 수 있는 Feature Flag 시스템을 구현합니다.

**목적**:
1. **개발 편의성**: MVP 단계에서 일부 기능을 비활성화하여 빠른 개발
2. **점진적 배포**: 프로덕션에서 기능을 단계적으로 활성화
3. **A/B 테스트**: 특정 기능의 효과 측정

---

## 🎯 Feature Flags 목록

### 1. 조직 가입 자동 승인

**Flag 이름**: `AUTO_APPROVE_ORGANIZATIONS`

**설명**:
- MVP 초기에는 관리자 승인 없이 모든 조직을 자동 승인
- 프로덕션에서는 수동 승인 워크플로우 활성화

**환경 변수**:
```bash
# .env.local (개발 환경)
NEXT_PUBLIC_AUTO_APPROVE_ORGANIZATIONS=true

# .env.production (프로덕션 환경)
NEXT_PUBLIC_AUTO_APPROVE_ORGANIZATIONS=false
```

**구현 위치**: Phase 2.3 - RegistrationPage

**Before (수동 승인)**:
```typescript
// src/pages/auth/RegistrationPage.tsx
const handleRegister = async (data: RegisterFormData) => {
  // 1. Create organization (status = 'PENDING')
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.organizationName,
      type: data.organizationType,
      status: 'PENDING', // 관리자 승인 대기
      // ...
    })
    .select()
    .single()

  if (orgError) throw orgError

  // 2. Create user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (authError) throw authError

  toast({
    title: '회원가입 성공',
    description: '관리자 승인 후 로그인이 가능합니다.',
  })
}
```

**After (자동 승인)**:
```typescript
// src/pages/auth/RegistrationPage.tsx
import { FEATURE_FLAGS } from '@/constants/featureFlags'

const handleRegister = async (data: RegisterFormData) => {
  // 1. Create organization
  const organizationStatus = FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS
    ? 'APPROVED' // 자동 승인
    : 'PENDING'  // 수동 승인 대기

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.organizationName,
      type: data.organizationType,
      status: organizationStatus,
      // ...
    })
    .select()
    .single()

  if (orgError) throw orgError

  // 2. Create user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (authError) throw authError

  const successMessage = FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS
    ? '회원가입 성공! 이제 로그인할 수 있습니다.'
    : '회원가입 성공! 관리자 승인 후 로그인이 가능합니다.'

  toast({
    title: '회원가입 성공',
    description: successMessage,
  })

  // 자동 승인 시 바로 로그인 페이지로 이동
  if (FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS) {
    navigate('/login')
  }
}
```

---

### 2. 이메일 인증 생략 (MVP 전용)

**Flag 이름**: `SKIP_EMAIL_VERIFICATION`

**설명**:
- MVP 단계에서 이메일 인증 단계를 생략하여 빠른 테스트
- 프로덕션에서는 이메일 인증 필수

**환경 변수**:
```bash
# .env.local
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true

# .env.production
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=false
```

**구현**: Supabase Auth 설정에서 `confirm_email` 옵션 조정

---

## 📂 Feature Flags 시스템 구현

### Constants 정의

**파일 경로**: `src/constants/featureFlags.ts`

```typescript
/**
 * Feature Flags
 *
 * 환경 변수를 통해 기능을 켜고 끌 수 있습니다.
 * 개발 환경에서는 편의성을 위해 일부 기능을 비활성화할 수 있습니다.
 */

export const FEATURE_FLAGS = {
  /**
   * 조직 가입 자동 승인
   *
   * - true: 가입 시 즉시 APPROVED 상태로 생성 (MVP 개발 편의성)
   * - false: 가입 시 PENDING 상태로 생성, 관리자 승인 필요 (프로덕션)
   *
   * 환경 변수: NEXT_PUBLIC_AUTO_APPROVE_ORGANIZATIONS
   */
  AUTO_APPROVE_ORGANIZATIONS:
    process.env.NEXT_PUBLIC_AUTO_APPROVE_ORGANIZATIONS === 'true',

  /**
   * 이메일 인증 생략
   *
   * - true: 이메일 인증 없이 바로 로그인 가능 (MVP)
   * - false: 이메일 인증 필수 (프로덕션)
   *
   * 환경 변수: NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION
   */
  SKIP_EMAIL_VERIFICATION:
    process.env.NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION === 'true',
} as const

/**
 * Feature Flag 설명
 *
 * 개발자를 위한 참고 정보
 */
export const FEATURE_FLAG_DESCRIPTIONS = {
  AUTO_APPROVE_ORGANIZATIONS:
    'MVP 단계: true (자동 승인) | 프로덕션: false (수동 승인)',
  SKIP_EMAIL_VERIFICATION:
    'MVP 단계: true (인증 생략) | 프로덕션: false (인증 필수)',
} as const

/**
 * 현재 활성화된 Feature Flags 출력 (개발 환경 디버깅용)
 */
export function logActiveFeatureFlags() {
  if (process.env.NODE_ENV === 'development') {
    console.group('🚩 Active Feature Flags')
    Object.entries(FEATURE_FLAGS).forEach(([key, value]) => {
      const status = value ? '✅ ON' : '❌ OFF'
      console.log(`${status} ${key}`)
    })
    console.groupEnd()
  }
}
```

---

## 🔧 환경 변수 설정

### .env.local (개발 환경)

```bash
# Feature Flags (개발 편의성을 위해 모두 활성화)
NEXT_PUBLIC_AUTO_APPROVE_ORGANIZATIONS=true
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true
```

### .env.production (프로덕션 환경)

```bash
# Feature Flags (프로덕션에서는 모두 비활성화)
NEXT_PUBLIC_AUTO_APPROVE_ORGANIZATIONS=false
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=false
```

### .env.example (템플릿)

```bash
# Feature Flags
# MVP 개발 시: true로 설정하여 빠른 개발
# 프로덕션: false로 설정하여 보안 강화
NEXT_PUBLIC_AUTO_APPROVE_ORGANIZATIONS=true
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true
```

---

## 📝 사용 예시

### 조직 승인 워크플로우

```typescript
// src/pages/auth/RegistrationPage.tsx
import { FEATURE_FLAGS } from '@/constants/featureFlags'

export function RegistrationPage() {
  const handleRegister = async (data: RegisterFormData) => {
    const orgStatus = FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS
      ? 'APPROVED'
      : 'PENDING'

    const { data: organization } = await supabase
      .from('organizations')
      .insert({
        name: data.organizationName,
        type: data.organizationType,
        status: orgStatus,
        // ...
      })
      .select()
      .single()

    const message = FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS
      ? '가입 완료! 바로 로그인하세요.'
      : '가입 완료! 관리자 승인 후 로그인 가능합니다.'

    toast({ title: message })
  }

  return <div>...</div>
}
```

### 관리자 대시보드

```typescript
// src/pages/admin/DashboardPage.tsx
import { FEATURE_FLAGS } from '@/constants/featureFlags'

export function AdminDashboardPage() {
  // Feature Flag에 따라 조건부 렌더링
  return (
    <div>
      {!FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS && (
        <Card>
          <CardHeader>
            <CardTitle>승인 대기 조직</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 수동 승인 모드일 때만 표시 */}
            <OrganizationApprovalList />
          </CardContent>
        </Card>
      )}

      {FEATURE_FLAGS.AUTO_APPROVE_ORGANIZATIONS && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              <strong>개발 모드:</strong> 조직 가입이 자동 승인됩니다.
              프로덕션 배포 시 <code>AUTO_APPROVE_ORGANIZATIONS=false</code>로 설정하세요.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## ✅ Definition of Done

### 구현
- [ ] `src/constants/featureFlags.ts` 생성
- [ ] `.env.local`에 개발용 Feature Flag 설정
- [ ] `.env.example`에 Feature Flag 템플릿 추가
- [ ] Phase 2.3 RegistrationPage에 AUTO_APPROVE_ORGANIZATIONS 적용

### 문서화
- [ ] Feature Flag 목록 및 설명 작성
- [ ] 환경별 권장 설정 문서화
- [ ] 프로덕션 배포 체크리스트에 Feature Flag 확인 항목 추가

### 검증
- [ ] 개발 환경: AUTO_APPROVE_ORGANIZATIONS=true 동작 확인
- [ ] 프로덕션 환경: AUTO_APPROVE_ORGANIZATIONS=false 동작 확인
- [ ] logActiveFeatureFlags() 콘솔 출력 확인

---

## 🔗 관련 문서

- [Phase 2.3: 회원가입 UI](../phase-2/phase-2.3-registration-ui.md)
- [Phase 6.1: 조직 승인 관리](../phase-6/phase-6.1-organization-approval.md)
- [Phase 8.4: 보안 강화](../phase-8/phase-8.4-security-hardening.md)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 1 - 데이터베이스 설계](../phase-1/README.md)

**프로덕션 배포 전 체크리스트**:
- [ ] `.env.production`에서 모든 Feature Flag를 `false`로 설정
- [ ] 수동 승인 워크플로우 테스트 완료
- [ ] 이메일 인증 플로우 테스트 완료
