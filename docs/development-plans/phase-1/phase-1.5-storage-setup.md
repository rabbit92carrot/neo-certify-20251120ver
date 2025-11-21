# Phase 1.5: Supabase Storage 설정

## 📋 개요

**목표**: 사업자등록증 파일 저장을 위한 Supabase Storage 설정 및 RLS 정책
**선행 조건**: Phase 1.4 (RLS 정책) 완료
**예상 소요 시간**: 1-2시간

---

## 🎯 개발 원칙 준수 체크리스트

- [x] SSOT: Storage 정책이 파일 보안의 단일 진실의 원천
- [ ] No Magic Numbers: 파일 크기 제한은 constants에서 관리
- [ ] No 'any' type: Storage SDK는 TypeScript 타입 제공
- [x] Clean Code: 명확한 버킷 및 경로 구조
- [ ] 테스트 작성: 파일 업로드/다운로드 테스트
- [ ] Git commit: Storage 설정 커밋
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 📦 작업 내용

### 1. Storage 버킷 생성 마이그레이션

```bash
supabase migration new create_storage_buckets
```

---

### 2. Storage 마이그레이션 파일 작성

**supabase/migrations/[timestamp]_create_storage_buckets.sql**:

```sql
-- =============================================
-- Neo Certificate System - Storage Setup
-- Description: Create storage buckets for business licenses
-- Author: rabbit92carrot
-- Created: 2024-01-20
-- =============================================

-- =============================================
-- BUCKET: business-licenses
-- Description: 사업자등록증 파일 저장
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-licenses', 'business-licenses', false);

-- =============================================
-- STORAGE RLS POLICIES
-- =============================================

-- Policy: Organizations can upload their own business license
CREATE POLICY "Organizations can upload own business license"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-licenses'
    AND auth.user_organization_id()::TEXT = (storage.foldername(name))[1]
  );

-- Policy: Organizations can view their own business license
CREATE POLICY "Organizations can view own business license"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-licenses'
    AND (
      auth.user_organization_id()::TEXT = (storage.foldername(name))[1]
      OR auth.is_admin()
    )
  );

-- Policy: Organizations can update their own business license
CREATE POLICY "Organizations can update own business license"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-licenses'
    AND auth.user_organization_id()::TEXT = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'business-licenses'
    AND auth.user_organization_id()::TEXT = (storage.foldername(name))[1]
  );

-- Policy: Organizations can delete their own business license
CREATE POLICY "Organizations can delete own business license"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'business-licenses'
    AND auth.user_organization_id()::TEXT = (storage.foldername(name))[1]
  );

-- Policy: Admins can view all business licenses
CREATE POLICY "Admins can view all business licenses"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-licenses'
    AND auth.is_admin()
  );

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN storage.buckets.id IS 'Bucket unique identifier';
COMMENT ON COLUMN storage.buckets.name IS 'Bucket display name';
COMMENT ON COLUMN storage.buckets.public IS 'Public access (false for business-licenses)';
```

---

### 3. 파일 경로 규칙 정의

**파일 경로 형식**:
```
{organization_id}/{timestamp}_{original_filename}

예시:
550e8400-e29b-41d4-a716-446655440000/1705747200000_business_license.pdf
```

**파일명 생성 로직** (src/lib/storage.ts):

```typescript
import { supabase } from './supabase'
import { FILE_SIZE_LIMITS, ALLOWED_FILE_TYPES } from '@/constants'

/**
 * 사업자등록증 파일 업로드
 * @param organizationId - 조직 ID
 * @param file - 업로드할 파일
 * @returns Storage 경로
 */
export async function uploadBusinessLicense(
  organizationId: string,
  file: File
): Promise<string> {
  // 1. 파일 크기 검증
  if (file.size > FILE_SIZE_LIMITS.BUSINESS_LICENSE) {
    throw new Error(
      `파일 크기는 ${FILE_SIZE_LIMITS.BUSINESS_LICENSE / 1024 / 1024}MB를 초과할 수 없습니다.`
    )
  }

  // 2. 파일 확장자 검증
  const fileExt = file.name.split('.').pop()?.toLowerCase()
  const allowedExts = ALLOWED_FILE_TYPES.BUSINESS_LICENSE.map(ext =>
    ext.replace('.', '')
  )

  if (!fileExt || !allowedExts.includes(fileExt)) {
    throw new Error(
      `허용된 파일 형식: ${ALLOWED_FILE_TYPES.BUSINESS_LICENSE.join(', ')}`
    )
  }

  // 3. 파일 경로 생성
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${organizationId}/${timestamp}_${sanitizedFileName}`

  // 4. 파일 업로드
  const { data, error } = await supabase.storage
    .from('business-licenses')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`파일 업로드 실패: ${error.message}`)
  }

  return data.path
}

/**
 * 사업자등록증 파일 다운로드 URL 생성
 * @param filePath - Storage 경로
 * @returns 서명된 URL (1시간 유효)
 */
export async function getBusinessLicenseUrl(
  filePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('business-licenses')
    .createSignedUrl(filePath, 3600) // 1시간 유효

  if (error) {
    throw new Error(`URL 생성 실패: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * 사업자등록증 파일 삭제
 * @param filePath - Storage 경로
 */
export async function deleteBusinessLicense(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('business-licenses')
    .remove([filePath])

  if (error) {
    throw new Error(`파일 삭제 실패: ${error.message}`)
  }
}
```

---

### 4. 마이그레이션 적용

```bash
# 로컬 DB 리셋
supabase db reset

# Storage 버킷 확인
# Studio → Storage → business-licenses 존재 확인
```

---

## 📝 TypeScript 타입 정의

**src/types/storage.ts**:

```typescript
export interface UploadResult {
  path: string
  fullPath: string
}

export interface BusinessLicenseFile {
  organizationId: string
  filePath: string
  originalName: string
  size: number
  uploadedAt: Date
}

export type AllowedFileExtension = '.pdf' | '.jpg' | '.jpeg' | '.png'
```

---

## 🔧 Constants 정의

이미 Phase 0.5에서 정의 완료:

```typescript
// src/constants/validation.ts
export const FILE_SIZE_LIMITS = {
  BUSINESS_LICENSE: 10 * 1024 * 1024, // 10MB
} as const

export const ALLOWED_FILE_TYPES = {
  BUSINESS_LICENSE: ['.pdf', '.jpg', '.jpeg', '.png'],
} as const
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `supabase/migrations/[timestamp]_create_storage_buckets.sql`
- `src/lib/storage.ts` (Phase 2에서 생성)
- `src/types/storage.ts` (Phase 2에서 생성)

---

## ✅ 테스트 요구사항

### 1. Storage 버킷 확인

```bash
# Studio에서 확인
# http://localhost:54323
# Storage → Buckets → business-licenses 존재 확인

# SQL로 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT id, name, public
FROM storage.buckets
WHERE id = 'business-licenses';
"

# 예상 출력:
#       id        |       name        | public
# ----------------+-------------------+--------
#  business-licenses | business-licenses | f
```

---

### 2. Storage RLS 정책 확인

```bash
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
"

# 예상: 5개 정책 존재
# - Organizations can upload own business license
# - Organizations can view own business license
# - Organizations can update own business license
# - Organizations can delete own business license
# - Admins can view all business licenses
```

---

### 3. 파일 업로드 테스트 (Phase 2 이후)

**tests/integration/storage.test.ts**:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { uploadBusinessLicense, getBusinessLicenseUrl, deleteBusinessLicense } from '@/lib/storage'
import { FILE_SIZE_LIMITS } from '@/constants'

describe('Storage - Business License Upload', () => {
  let uploadedPath: string

  beforeAll(async () => {
    // Login as test organization user
    await supabase.auth.signInWithPassword({
      email: 'test-org@example.com',
      password: 'password',
    })
  })

  it('should upload valid PDF file', async () => {
    const file = new File(['test content'], 'license.pdf', {
      type: 'application/pdf',
    })

    const path = await uploadBusinessLicense('test-org-id', file)
    uploadedPath = path

    expect(path).toMatch(/^test-org-id\/\d+_license\.pdf$/)
  })

  it('should reject file exceeding size limit', async () => {
    const largeContent = new Uint8Array(FILE_SIZE_LIMITS.BUSINESS_LICENSE + 1)
    const file = new File([largeContent], 'large.pdf', {
      type: 'application/pdf',
    })

    await expect(
      uploadBusinessLicense('test-org-id', file)
    ).rejects.toThrow('파일 크기는')
  })

  it('should reject invalid file type', async () => {
    const file = new File(['test'], 'file.txt', { type: 'text/plain' })

    await expect(
      uploadBusinessLicense('test-org-id', file)
    ).rejects.toThrow('허용된 파일 형식')
  })

  it('should generate signed URL', async () => {
    const url = await getBusinessLicenseUrl(uploadedPath)

    expect(url).toContain('https://')
    expect(url).toContain('token=')
  })

  it('should delete uploaded file', async () => {
    await expect(
      deleteBusinessLicense(uploadedPath)
    ).resolves.not.toThrow()
  })
})
```

---

### 4. 수동 검증 체크리스트

```bash
# 1. Studio에서 수동 업로드 테스트
# http://localhost:54323 → Storage → business-licenses
# → Upload 버튼 → 파일 선택 → 업로드

# 2. 파일 경로 형식 확인
# {org_id}/{timestamp}_{filename} 형식인지 확인

# 3. 다운로드 테스트
# Studio에서 업로드된 파일 클릭 → Download

# 4. RLS 테스트
# 다른 조직 사용자로 로그인 시도
# → 다른 조직의 파일 접근 불가 확인
```

---

## 🔍 문제 해결 (Troubleshooting)

### 문제 1: Storage bucket 생성 실패

**증상**: Migration 적용 시 "bucket already exists" 오류

**원인**: 이미 버킷이 존재하거나 이전 migration 실패

**해결**:

```sql
-- 기존 버킷 삭제 (주의: 모든 파일 삭제됨)
DELETE FROM storage.buckets WHERE id = 'business-licenses';

-- Migration 재실행
```

---

### 문제 2: 파일 업로드 시 403 Forbidden

**증상**: `uploadBusinessLicense()` 호출 시 403 에러

**원인**:
- RLS 정책이 업로드를 차단
- 로그인하지 않음
- organization_id가 경로와 일치하지 않음

**해결**:

```typescript
// 1. 로그인 확인
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  throw new Error('로그인이 필요합니다')
}

// 2. organization_id 확인
const { data: userProfile } = await supabase
  .from('users')
  .select('organization_id')
  .eq('id', user.id)
  .single()

// 3. 올바른 organization_id로 업로드
await uploadBusinessLicense(userProfile.organization_id, file)
```

---

### 문제 3: Signed URL 만료

**증상**: 다운로드 링크가 작동하지 않음

**원인**: Signed URL 만료 (기본 1시간)

**해결**:

```typescript
// 필요 시 유효기간 연장 (최대 7일)
const { data } = await supabase.storage
  .from('business-licenses')
  .createSignedUrl(filePath, 604800) // 7일 = 7 * 24 * 60 * 60
```

---

## 🔄 Git Commit

```bash
git add supabase/migrations/

git commit -m "feat(storage): Setup business license storage bucket

- Create business-licenses storage bucket (private)
- Add Storage RLS policies for organization isolation
- Organizations can upload/view/update/delete own files
- Admins can view all files
- File path format: {org_id}/{timestamp}_{filename}
- Max file size: 10MB
- Allowed types: PDF, JPG, PNG

Storage RLS Policies:
- Upload: Only own organization folder
- View: Own organization + admins
- Update/Delete: Own organization only

Tests:
- Bucket creation verification
- RLS policy verification
- Application-level upload/download tests (Phase 2)"

git push origin main
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] Migration 파일 생성 및 작성 완료
- [ ] business-licenses 버킷 생성 확인
- [ ] Storage RLS 정책 설정 완료 (5개)
- [ ] 파일 경로 규칙 정의
- [ ] Storage 유틸리티 함수 설계 완료 (구현은 Phase 2)
- [ ] TypeScript 타입 정의 설계
- [ ] Constants 재확인 (파일 크기, 허용 타입)
- [ ] Studio에서 버킷 확인
- [ ] RLS 정책 확인
- [ ] Git commit 완료
- [ ] Git push 완료
- [ ] Phase 1 전체 완료
- [ ] TypeScript 타입 생성 준비 (다음 단계)

---

## 📊 Phase 1 전체 완료 체크

Phase 1 완료 후 TypeScript 타입 자동 생성:

```bash
# 로컬 DB에서 TypeScript 타입 생성
supabase gen types typescript --local > src/types/database.ts

# 생성된 타입 확인
cat src/types/database.ts
```

**예상 타입 구조**:

```typescript
export interface Database {
  public: {
    Tables: {
      organizations: { Row: {...}, Insert: {...}, Update: {...} }
      users: { Row: {...}, Insert: {...}, Update: {...} }
      manufacturer_settings: { Row: {...}, Insert: {...}, Update: {...} }
      products: { Row: {...}, Insert: {...}, Update: {...} }
      lots: { Row: {...}, Insert: {...}, Update: {...} }
      virtual_codes: { Row: {...}, Insert: {...}, Update: {...} }
      patients: { Row: {...}, Insert: {...}, Update: {...} }
      history: { Row: {...}, Insert: {...}, Update: {...} }
      treatment_records: { Row: {...}, Insert: {...}, Update: {...} }
      treatment_details: { Row: {...}, Insert: {...}, Update: {...} }
      return_requests: { Row: {...}, Insert: {...}, Update: {...} }
      return_details: { Row: {...}, Insert: {...}, Update: {...} }
      notification_messages: { Row: {...}, Insert: {...}, Update: {...} }
    }
  }
}
```

---

## 🔗 참고 자료

- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [Signed URLs](https://supabase.com/docs/guides/storage/serving/downloads)
- [File Upload Best Practices](https://supabase.com/docs/guides/storage/uploads)

---

## ⏭️ 다음 단계

**Phase 1 완료!**

다음: [Phase 2.1 - 인증 설정](../phase-2/phase-2.1-auth-setup.md)

**작업 내용**:
- Supabase 클라이언트 설정
- AuthContext 구현
- useAuth hook 작성
- 로그인/로그아웃 로직
