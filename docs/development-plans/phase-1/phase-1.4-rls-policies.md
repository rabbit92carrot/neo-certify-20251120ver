# Phase 1.4: RLS 정책 설정

## 📋 개요

**목표**: Row Level Security 정책을 통한 조직별 데이터 격리 및 접근 제어
**선행 조건**: Phase 1.3 (관계 테이블) 완료
**예상 소요 시간**: 3-4시간

---

## 🎯 개발 원칙 준수 체크리스트

- [x] SSOT: RLS 정책이 데이터 보안의 단일 진실의 원천
- [x] No Magic Numbers: 역할 기반 조건 명확히 정의
- [ ] No 'any' type: SQL 정책 (TypeScript 무관)
- [x] Clean Code: 명확한 정책명
- [ ] 테스트 작성: RLS 정책 검증 테스트
- [ ] Git commit: RLS 정책 커밋

---

## 📦 작업 내용

### RLS 정책 개요

**핵심 원칙**:
1. **조직별 격리**: 각 조직은 자신의 데이터만 접근
2. **PENDING 데이터 접근**: 수신자는 승인 전에도 조회 가능
3. **환자 데이터**: 본인 전화번호 데이터만 접근
4. **관리자 접근**: 모든 데이터 조회 가능 (organization_id = NULL로 식별)

---

### 1. RLS 마이그레이션 생성

```bash
supabase migration new enable_rls_policies
```

---

### 2. RLS 정책 마이그레이션 파일 작성

**supabase/migrations/[timestamp]_enable_rls_policies.sql**:

```sql
-- =============================================
-- Neo Certificate System - RLS Policies
-- Description: Row Level Security for multi-tenant data isolation
-- Author: rabbit92carrot
-- Created: 2024-01-20
-- =============================================

-- =============================================
-- HELPER FUNCTION: Get current user's organization_id
-- =============================================

CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM users
  WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

COMMENT ON FUNCTION auth.user_organization_id() IS '현재 로그인한 사용자의 organization_id 반환';

-- =============================================
-- HELPER FUNCTION: Check if user is admin
-- =============================================

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT organization_id IS NULL
  FROM users
  WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

COMMENT ON FUNCTION auth.is_admin() IS '현재 사용자가 관리자인지 확인 (organization_id IS NULL)';

-- =============================================
-- TABLE: organizations - RLS Policies
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id = auth.user_organization_id()
    OR auth.is_admin()
  );

-- Policy: Users can update their own organization (except status)
CREATE POLICY "Users can update their own organization"
  ON organizations FOR UPDATE
  USING (id = auth.user_organization_id())
  WITH CHECK (id = auth.user_organization_id());

-- Policy: Admins can view all organizations
-- (Already covered in SELECT policy via auth.is_admin())

-- Policy: Admins can insert/update/delete organizations
CREATE POLICY "Admins can manage all organizations"
  ON organizations FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- =============================================
-- TABLE: users - RLS Policies
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view colleagues in same organization
CREATE POLICY "Users can view colleagues"
  ON users FOR SELECT
  USING (
    organization_id = auth.user_organization_id()
    OR auth.is_admin()
  );

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy: Admins can manage all users
CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- =============================================
-- TABLE: manufacturer_settings - RLS Policies
-- =============================================

ALTER TABLE manufacturer_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Manufacturers can view/update their own settings
CREATE POLICY "Manufacturers can manage own settings"
  ON manufacturer_settings FOR ALL
  USING (
    organization_id = auth.user_organization_id()
    OR auth.is_admin()
  )
  WITH CHECK (
    organization_id = auth.user_organization_id()
    OR auth.is_admin()
  );

-- =============================================
-- TABLE: products - RLS Policies
-- =============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Organizations can view/manage their own products
CREATE POLICY "Organizations can manage own products"
  ON products FOR ALL
  USING (
    organization_id = auth.user_organization_id()
    OR auth.is_admin()
  )
  WITH CHECK (
    organization_id = auth.user_organization_id()
    OR auth.is_admin()
  );

-- =============================================
-- TABLE: lots - RLS Policies
-- =============================================

ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

-- Policy: View lots belonging to own products
CREATE POLICY "Organizations can view own lots"
  ON lots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = lots.product_id
        AND products.organization_id = auth.user_organization_id()
    )
    OR auth.is_admin()
  );

-- Policy: Manage lots belonging to own products
CREATE POLICY "Organizations can manage own lots"
  ON lots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = lots.product_id
        AND products.organization_id = auth.user_organization_id()
    )
    OR auth.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = lots.product_id
        AND products.organization_id = auth.user_organization_id()
    )
    OR auth.is_admin()
  );

-- =============================================
-- TABLE: virtual_codes - RLS Policies (★ CRITICAL)
-- =============================================

ALTER TABLE virtual_codes ENABLE ROW LEVEL SECURITY;

-- Policy: View virtual_codes owned by organization
CREATE POLICY "Organizations can view owned virtual_codes"
  ON virtual_codes FOR SELECT
  USING (
    (owner_type = 'organization' AND owner_id = auth.user_organization_id()::TEXT)
    OR auth.is_admin()
  );

-- Policy: View PENDING virtual_codes sent to organization
CREATE POLICY "Organizations can view pending virtual_codes"
  ON virtual_codes FOR SELECT
  USING (
    status = 'PENDING' AND pending_to = auth.user_organization_id()
  );

-- Policy: Manage virtual_codes owned by organization
CREATE POLICY "Organizations can manage owned virtual_codes"
  ON virtual_codes FOR ALL
  USING (
    (owner_type = 'organization' AND owner_id = auth.user_organization_id()::TEXT)
    OR auth.is_admin()
  )
  WITH CHECK (
    (owner_type = 'organization' AND owner_id = auth.user_organization_id()::TEXT)
    OR auth.is_admin()
  );

-- =============================================
-- TABLE: patients - RLS Policies
-- =============================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Policy: Hospitals can view all patients (for treatment records)
CREATE POLICY "Hospitals can view patients"
  ON patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = auth.user_organization_id()
        AND type = 'HOSPITAL'
    )
    OR auth.is_admin()
  );

-- Policy: Hospitals can insert patients (when registering treatment)
CREATE POLICY "Hospitals can insert patients"
  ON patients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = auth.user_organization_id()
        AND type = 'HOSPITAL'
    )
    OR auth.is_admin()
  );

-- Policy: Admins can manage all patients
CREATE POLICY "Admins can manage all patients"
  ON patients FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- =============================================
-- TABLE: history - RLS Policies
-- =============================================

ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- Policy: View history where organization is involved
CREATE POLICY "Organizations can view related history"
  ON history FOR SELECT
  USING (
    (from_owner_type = 'organization' AND from_owner_id = auth.user_organization_id()::TEXT)
    OR (to_owner_type = 'organization' AND to_owner_id = auth.user_organization_id()::TEXT)
    OR auth.is_admin()
  );

-- Policy: Insert history where organization is involved
CREATE POLICY "Organizations can insert related history"
  ON history FOR INSERT
  WITH CHECK (
    (from_owner_type = 'organization' AND from_owner_id = auth.user_organization_id()::TEXT)
    OR (to_owner_type = 'organization' AND to_owner_id = auth.user_organization_id()::TEXT)
    OR auth.is_admin()
  );

-- Note: UPDATE/DELETE on history typically not allowed (immutable audit log)

-- =============================================
-- TABLE: treatment_records - RLS Policies
-- =============================================

ALTER TABLE treatment_records ENABLE ROW LEVEL SECURITY;

-- Policy: Hospitals can view/manage their own treatment records
CREATE POLICY "Hospitals can manage own treatment_records"
  ON treatment_records FOR ALL
  USING (
    hospital_id = auth.user_organization_id()
    OR auth.is_admin()
  )
  WITH CHECK (
    hospital_id = auth.user_organization_id()
    OR auth.is_admin()
  );

-- =============================================
-- TABLE: treatment_details - RLS Policies
-- =============================================

ALTER TABLE treatment_details ENABLE ROW LEVEL SECURITY;

-- Policy: View treatment_details for own hospital's treatments
CREATE POLICY "Hospitals can view own treatment_details"
  ON treatment_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM treatment_records
      WHERE treatment_records.id = treatment_details.treatment_id
        AND treatment_records.hospital_id = auth.user_organization_id()
    )
    OR auth.is_admin()
  );

-- Policy: Insert treatment_details for own hospital's treatments
CREATE POLICY "Hospitals can insert own treatment_details"
  ON treatment_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM treatment_records
      WHERE treatment_records.id = treatment_details.treatment_id
        AND treatment_records.hospital_id = auth.user_organization_id()
    )
    OR auth.is_admin()
  );

-- =============================================
-- TABLE: return_requests - RLS Policies
-- =============================================

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

-- Policy: View return_requests where organization is requester or receiver
CREATE POLICY "Organizations can view related return_requests"
  ON return_requests FOR SELECT
  USING (
    requester_id = auth.user_organization_id()
    OR receiver_id = auth.user_organization_id()
    OR auth.is_admin()
  );

-- Policy: Requester can create return_requests
CREATE POLICY "Organizations can create return_requests"
  ON return_requests FOR INSERT
  WITH CHECK (
    requester_id = auth.user_organization_id()
  );

-- Policy: Receiver can update return_requests (approve/reject)
CREATE POLICY "Receivers can update return_requests"
  ON return_requests FOR UPDATE
  USING (receiver_id = auth.user_organization_id())
  WITH CHECK (receiver_id = auth.user_organization_id());

-- Policy: Admins can manage all return_requests
CREATE POLICY "Admins can manage all return_requests"
  ON return_requests FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- =============================================
-- TABLE: return_details - RLS Policies
-- =============================================

ALTER TABLE return_details ENABLE ROW LEVEL SECURITY;

-- Policy: View return_details for accessible return_requests
CREATE POLICY "Organizations can view related return_details"
  ON return_details FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM return_requests
      WHERE return_requests.id = return_details.return_request_id
        AND (return_requests.requester_id = auth.user_organization_id()
             OR return_requests.receiver_id = auth.user_organization_id())
    )
    OR auth.is_admin()
  );

-- Policy: Insert return_details for own return_requests
CREATE POLICY "Requesters can insert return_details"
  ON return_details FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM return_requests
      WHERE return_requests.id = return_details.return_request_id
        AND return_requests.requester_id = auth.user_organization_id()
    )
    OR auth.is_admin()
  );

-- =============================================
-- TABLE: notification_messages - RLS Policies
-- =============================================

ALTER TABLE notification_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Hospitals can view/manage notifications for their patients
CREATE POLICY "Hospitals can manage patient notifications"
  ON notification_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM treatment_records
      WHERE treatment_records.patient_phone = notification_messages.patient_phone
        AND treatment_records.hospital_id = auth.user_organization_id()
    )
    OR auth.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM treatment_records
      WHERE treatment_records.patient_phone = notification_messages.patient_phone
        AND treatment_records.hospital_id = auth.user_organization_id()
    )
    OR auth.is_admin()
  );

-- Policy: Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
  ON notification_messages FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());
```

---

### 3. 마이그레이션 적용

```bash
# 로컬 DB 리셋
supabase db reset

# 적용 결과 확인
supabase migration list
```

---

## 📝 TypeScript 타입 정의

RLS는 데이터베이스 레벨이므로 TypeScript 타입 정의 불필요.

---

## 🔧 Constants 정의

해당 없음 (SQL 정책)

---

## 📁 생성/수정 파일 목록

**생성**:
- `supabase/migrations/[timestamp]_enable_rls_policies.sql`

---

## ✅ 테스트 요구사항

### RLS 정책 검증 테스트

**supabase/migrations/[timestamp]_test_rls_policies.sql**:

```sql
-- =============================================
-- RLS POLICIES TEST
-- =============================================

-- TEST 1: Organization data isolation
DO $$
DECLARE
  org1_id UUID;
  org2_id UUID;
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Create two organizations
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('MANUFACTURER', '111-11-11111', '/test1.pdf', 'Org1', 'Rep1', '010-1111-1111', 'Seoul', 'ACTIVE')
  RETURNING id INTO org1_id;
  
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('DISTRIBUTOR', '222-22-22222', '/test2.pdf', 'Org2', 'Rep2', '010-2222-2222', 'Busan', 'ACTIVE')
  RETURNING id INTO org2_id;
  
  -- Create users in auth.users (mock)
  INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'user1@test.com') RETURNING id INTO user1_id;
  INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'user2@test.com') RETURNING id INTO user2_id;
  
  -- Create user profiles
  INSERT INTO users (id, email, name, contact, organization_id)
  VALUES (user1_id, 'user1@test.com', 'User1', '010-1111-1111', org1_id);
  
  INSERT INTO users (id, email, name, contact, organization_id)
  VALUES (user2_id, 'user2@test.com', 'User2', '010-2222-2222', org2_id);
  
  RAISE NOTICE 'SETUP: Created test organizations and users';
  
  -- Note: Actual RLS testing requires setting auth.uid() context
  -- This is typically done in application-level tests (e.g., Vitest + Supabase client)
  
  ROLLBACK;
END $$;

-- Manual RLS Test Instructions:
-- 1. Create test users via Supabase Auth
-- 2. Login as each user
-- 3. Try to query data from other organizations
-- 4. Verify RLS policies block unauthorized access
```

**Application-level RLS Test** (Phase 2 이후):

```typescript
// tests/integration/rls.test.ts
import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('RLS Policies', () => {
  it('should isolate organization data', async () => {
    // Login as user from org1
    const client1 = createClient(supabaseUrl, supabaseKey)
    await client1.auth.signInWithPassword({
      email: 'org1-user@test.com',
      password: 'password',
    })
    
    // Try to query org2's products
    const { data, error } = await client1
      .from('products')
      .select('*')
      .eq('organization_id', org2Id)
    
    // Should return empty (RLS blocks access)
    expect(data).toHaveLength(0)
  })
  
  it('should allow viewing PENDING virtual_codes', async () => {
    // Login as distributor (receiver)
    const client = createClient(supabaseUrl, supabaseKey)
    await client.auth.signInWithPassword({
      email: 'distributor@test.com',
      password: 'password',
    })
    
    // Query PENDING virtual_codes sent to this distributor
    const { data } = await client
      .from('virtual_codes')
      .select('*')
      .eq('status', 'PENDING')
      .eq('pending_to', distributorId)
    
    // Should see pending items
    expect(data.length).toBeGreaterThan(0)
  })
})
```

---

### 수동 검증 체크리스트

```bash
# 1. RLS 활성화 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"

# 모든 테이블에서 rowsecurity = true 확인

# 2. 정책 목록 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
"

# 각 테이블에 정책이 존재하는지 확인

# 3. Helper 함수 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT proname, pronamespace::regnamespace
FROM pg_proc
WHERE proname IN ('user_organization_id', 'is_admin');
"

# auth.user_organization_id(), auth.is_admin() 함수 존재 확인
```

---

## 🔍 문제 해결 (Troubleshooting)

### 문제 1: RLS로 인한 데이터 접근 불가

**증상**: Application에서 데이터 조회 시 항상 빈 결과 반환

**원인**:
- RLS 정책이 너무 엄격
- auth.uid()가 설정되지 않음
- Helper 함수 오류

**해결**:

```sql
-- 1. 현재 사용자 확인
SELECT auth.uid(), auth.user_organization_id();

-- 2. 특정 테이블의 RLS 일시 비활성화 (디버깅용)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 3. 데이터 조회 후 다시 활성화
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 4. 정책 삭제 후 재생성
DROP POLICY "policy_name" ON table_name;
-- 정책 재생성...
```

---

### 문제 2: Admin 사용자 생성 방법

**설명**:
- Admin 사용자는 `organization_id IS NULL`인 사용자
- Supabase Auth로 생성 후 users 테이블에 NULL 저장

**예시**:

```sql
-- 1. Admin 사용자 생성 (Supabase Dashboard 또는 Auth API)
-- email: admin@neocert.com

-- 2. users 테이블에 프로필 생성
INSERT INTO users (id, email, name, contact, organization_id)
VALUES (
  'admin-user-uuid-from-auth',
  'admin@neocert.com',
  'Admin',
  '010-0000-0000',
  NULL  -- organization_id NULL = Admin
);
```

---

## 🔄 Git Commit

```bash
git add supabase/migrations/

git commit -m "feat(db): Enable RLS policies for all tables

- Add helper functions: user_organization_id(), is_admin()
- Enable RLS on all 13 tables
- Add organization data isolation policies
- Add PENDING virtual_code access for receivers
- Add hospital-patient notification policies
- Add admin full access policies
- Add comprehensive SELECT/INSERT/UPDATE/DELETE policies

Security:
- Organizations can only access own data
- PENDING items visible to receivers before approval
- Hospitals can view/manage patient treatments
- Admins have full access (organization_id IS NULL)
- Immutable history (no UPDATE/DELETE policies)

Tests:
- RLS activation verification
- Policy existence checks
- Application-level RLS tests (Phase 2)"

git push origin main
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] Migration 파일 생성 및 작성 완료
- [ ] Helper 함수 생성 (2개)
- [ ] 모든 테이블에 RLS 활성화 (13개)
- [ ] 모든 테이블에 정책 설정 완료
- [ ] Admin 역할 정의 명확화
- [ ] PENDING 데이터 접근 규칙 구현
- [ ] RLS 활성화 확인
- [ ] 정책 목록 확인
- [ ] Application-level 테스트 시나리오 작성
- [ ] Git commit 완료
- [ ] Git push 완료
- [ ] 다음 Phase 진행 가능 (Phase 1.5)

---

## 🔗 참고 자료

- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-tenant RLS Patterns](https://supabase.com/docs/guides/auth/row-level-security#multi-tenant-rbac)
- [PRD 보안 요구사항](../../neo-cert-prd-1.2.md#10-보안-요구사항)

---

## ⏭️ 다음 단계

[Phase 1.5 - Storage 설정](phase-1.5-storage-setup.md)

**작업 내용**:
- Supabase Storage 버킷 생성
- 사업자등록증 파일 저장 설정
- Storage RLS 정책
- 파일 업로드/다운로드 로직
