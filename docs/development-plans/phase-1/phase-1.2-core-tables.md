# Phase 1.2: 핵심 테이블 마이그레이션

## 📋 개요

**목표**: Organization, User, Manufacturer_Settings, Product, Lot 테이블 생성 및 검증
**선행 조건**: Phase 1.1 (DB 설계) 완료
**예상 소요 시간**: 2-3시간

---

## 🎯 개발 원칙 준수 체크리스트

- [x] SSOT: 데이터베이스 스키마가 단일 진실의 원천
- [ ] No Magic Numbers: CHECK 제약조건에 상수 활용
- [ ] No 'any' type: TypeScript 타입 자동 생성
- [x] Clean Code: 명확한 테이블/컬럼명
- [ ] 테스트 작성: Migration SQL 검증 테스트
- [ ] Git commit: Migration 파일 커밋
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 📦 작업 내용

### 1. 첫 번째 마이그레이션 생성

```bash
# Supabase 로컬 환경이 실행 중인지 확인
supabase status

# 새 마이그레이션 파일 생성
supabase migration new create_core_tables
```

**생성되는 파일**: `supabase/migrations/[timestamp]_create_core_tables.sql`

---

### 2. 마이그레이션 파일 작성

**supabase/migrations/[timestamp]_create_core_tables.sql**:

```sql
-- =============================================
-- Neo Certificate System - Core Tables Migration
-- Description: Organizations, Users, Products, Lots
-- Author: rabbit92carrot
-- Created: 2024-01-20
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone to Asia/Seoul
SET timezone TO 'Asia/Seoul';

-- =============================================
-- TABLE: organizations
-- Description: 제조사/유통사/병원 조직 정보
-- =============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('MANUFACTURER', 'DISTRIBUTOR', 'HOSPITAL')),
  business_number VARCHAR(12) NOT NULL UNIQUE,
  business_license_file TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  representative_name VARCHAR(100) NOT NULL,
  representative_contact VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'DELETED')) DEFAULT 'PENDING_APPROVAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for organizations
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_business_number ON organizations(business_number);

-- Comments for documentation
COMMENT ON TABLE organizations IS '조직 정보 (제조사/유통사/병원)';
COMMENT ON COLUMN organizations.type IS '조직 유형: MANUFACTURER, DISTRIBUTOR, HOSPITAL';
COMMENT ON COLUMN organizations.business_number IS '사업자등록번호 (하이픈 포함): 000-00-00000';
COMMENT ON COLUMN organizations.business_license_file IS 'Supabase Storage 경로';
COMMENT ON COLUMN organizations.status IS '승인 상태: PENDING_APPROVAL, ACTIVE, INACTIVE, DELETED';

-- =============================================
-- TABLE: users
-- Description: 사용자 프로필 (Supabase Auth 확장)
-- =============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(20) NOT NULL,
  department VARCHAR(100),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- Comments
COMMENT ON TABLE users IS '사용자 프로필 정보 (auth.users 확장)';
COMMENT ON COLUMN users.id IS 'Supabase Auth user ID (FK to auth.users)';
COMMENT ON COLUMN users.organization_id IS '소속 조직 (FK to organizations)';

-- =============================================
-- TABLE: manufacturer_settings
-- Description: 제조사별 Lot 번호 생성 규칙
-- =============================================

CREATE TABLE manufacturer_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  lot_prefix VARCHAR(10) NOT NULL DEFAULT 'ND',
  lot_model_digits INTEGER NOT NULL DEFAULT 5 CHECK (lot_model_digits BETWEEN 3 AND 10),
  lot_date_format VARCHAR(20) NOT NULL DEFAULT 'yyMMdd',
  expiry_months INTEGER NOT NULL DEFAULT 12 CHECK (expiry_months IN (6, 12, 18, 24, 30, 36)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for manufacturer_settings
CREATE INDEX idx_manufacturer_settings_organization ON manufacturer_settings(organization_id);

-- Comments
COMMENT ON TABLE manufacturer_settings IS '제조사별 Lot 번호 생성 규칙';
COMMENT ON COLUMN manufacturer_settings.lot_prefix IS 'Lot 번호 접두사 (기본: ND)';
COMMENT ON COLUMN manufacturer_settings.lot_model_digits IS '모델 코드 자릿수 (3-10)';
COMMENT ON COLUMN manufacturer_settings.lot_date_format IS '날짜 형식 (기본: yyMMdd)';
COMMENT ON COLUMN manufacturer_settings.expiry_months IS '사용기한 (6개월 단위, 6-36)';

-- =============================================
-- TABLE: products
-- Description: 제품 마스터 정보
-- =============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  udi_di VARCHAR(100) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique product per organization
  CONSTRAINT uq_product_udi_per_org UNIQUE (organization_id, udi_di)
);

-- Indexes for products
CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_udi_di ON products(udi_di);

-- Comments
COMMENT ON TABLE products IS '제품 마스터 정보';
COMMENT ON COLUMN products.udi_di IS 'UDI-DI (Device Identifier)';
COMMENT ON COLUMN products.model_name IS '제품 모델명';
COMMENT ON COLUMN products.is_active IS '활성 상태 (비활성화 시 false)';

-- =============================================
-- TABLE: lots
-- Description: Lot (생산 단위) 정보
-- =============================================

CREATE TABLE lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_number VARCHAR(50) NOT NULL UNIQUE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  manufacture_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure expiry date is after manufacture date
  CONSTRAINT chk_expiry_after_manufacture CHECK (expiry_date > manufacture_date)
);

-- Indexes for lots
CREATE INDEX idx_lots_product ON lots(product_id);
CREATE INDEX idx_lots_number ON lots(lot_number);
CREATE INDEX idx_lots_manufacture_date ON lots(manufacture_date);
CREATE INDEX idx_lots_expiry_date ON lots(expiry_date);

-- Comments
COMMENT ON TABLE lots IS 'Lot (생산 단위) 정보';
COMMENT ON COLUMN lots.lot_number IS 'Lot 번호 (형식: ND + 모델코드 + yyMMdd)';
COMMENT ON COLUMN lots.quantity IS '생산 수량';
COMMENT ON COLUMN lots.manufacture_date IS '제조일자';
COMMENT ON COLUMN lots.expiry_date IS '사용기한';

-- =============================================
-- TRIGGER FUNCTION: update_updated_at_column
-- Description: updated_at 자동 갱신
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION update_updated_at_column() IS 'UPDATE 시 updated_at 자동 갱신';

-- =============================================
-- TRIGGERS: Apply updated_at auto-update
-- =============================================

CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manufacturer_settings_updated_at 
  BEFORE UPDATE ON manufacturer_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: lots 테이블은 updated_at이 없으므로 트리거 미적용
```

---

### 3. 마이그레이션 적용

```bash
# 로컬 DB 리셋 (모든 데이터 삭제 후 마이그레이션 재적용)
supabase db reset

# 또는 새 마이그레이션만 적용
supabase migration up

# 적용 결과 확인
supabase migration list
```

**예상 출력**:
```
Local migrations:
  20240120_create_core_tables.sql  [Applied]
```

---

### 4. Supabase Studio에서 수동 검증

```bash
# Studio 접속
# http://localhost:54323

# Database → Tables에서 다음 테이블 확인:
# - organizations
# - users
# - manufacturer_settings
# - products
# - lots
```

---

## 📝 TypeScript 타입 정의

타입은 Phase 1 완료 후 자동 생성됩니다:

```bash
# Phase 1.5 완료 후 실행
supabase gen types typescript --local > src/types/database.ts
```

**생성되는 타입 예시**:

```typescript
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          type: 'MANUFACTURER' | 'DISTRIBUTOR' | 'HOSPITAL'
          business_number: string
          business_license_file: string
          name: string
          representative_name: string
          representative_contact: string
          address: string
          status: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'DELETED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'MANUFACTURER' | 'DISTRIBUTOR' | 'HOSPITAL'
          business_number: string
          business_license_file: string
          name: string
          representative_name: string
          representative_contact: string
          address: string
          status?: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'DELETED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          // ...
        }
      }
      // ... 다른 테이블들
    }
  }
}
```

---

## 🔧 Constants 정의

이미 Phase 0.5에서 정의 완료:

```typescript
// src/constants/status.ts
export const ORGANIZATION_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DELETED: 'DELETED',
} as const

export const ORGANIZATION_TYPE = {
  MANUFACTURER: 'MANUFACTURER',
  DISTRIBUTOR: 'DISTRIBUTOR',
  HOSPITAL: 'HOSPITAL',
} as const

// src/constants/validation.ts
export const LOT_SETTINGS = {
  MODEL_DIGITS: {
    MIN: 3,
    MAX: 10,
  },
  EXPIRY_MONTHS: {
    STEP: 6,
    MIN: 6,
    MAX: 36,
  },
} as const
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `supabase/migrations/[timestamp]_create_core_tables.sql`

---

## ✅ 테스트 요구사항

### 1. 제약 조건 테스트

**supabase/migrations/[timestamp]_test_core_tables.sql** (임시 테스트용):

```sql
-- =============================================
-- CONSTRAINT TESTS
-- =============================================

-- TEST 1: Organization type constraint
DO $$
BEGIN
  -- Valid types should succeed
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address)
  VALUES ('MANUFACTURER', '123-45-67890', '/test.pdf', 'Test Mfr', 'Rep', '010-1234-5678', 'Seoul');
  
  -- Invalid type should fail
  BEGIN
    INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address)
    VALUES ('INVALID', '123-45-67891', '/test.pdf', 'Test', 'Rep', '010-1234-5678', 'Seoul');
    RAISE EXCEPTION 'Should have failed: invalid organization type';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: Invalid organization type rejected';
  END;
  
  ROLLBACK;
END $$;

-- TEST 2: Business number uniqueness
DO $$
BEGIN
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address)
  VALUES ('MANUFACTURER', '111-11-11111', '/test.pdf', 'Test1', 'Rep1', '010-1111-1111', 'Seoul');
  
  BEGIN
    INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address)
    VALUES ('DISTRIBUTOR', '111-11-11111', '/test2.pdf', 'Test2', 'Rep2', '010-2222-2222', 'Busan');
    RAISE EXCEPTION 'Should have failed: duplicate business number';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'PASS: Duplicate business number rejected';
  END;
  
  ROLLBACK;
END $$;

-- TEST 3: Lot expiry date constraint
DO $$
DECLARE
  test_org_id UUID;
  test_product_id UUID;
BEGIN
  -- Setup test data
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('MANUFACTURER', '222-22-22222', '/test.pdf', 'Test Mfr', 'Rep', '010-1234-5678', 'Seoul', 'ACTIVE')
  RETURNING id INTO test_org_id;
  
  INSERT INTO products (organization_id, name, udi_di, model_name)
  VALUES (test_org_id, 'PDO Thread A', 'UDI-TEST-001', 'MODEL-A')
  RETURNING id INTO test_product_id;
  
  -- Valid lot should succeed
  INSERT INTO lots (product_id, lot_number, quantity, manufacture_date, expiry_date)
  VALUES (test_product_id, 'ND00001240120', 100, '2024-01-20', '2025-01-20');
  
  -- Invalid lot (expiry before manufacture) should fail
  BEGIN
    INSERT INTO lots (product_id, lot_number, quantity, manufacture_date, expiry_date)
    VALUES (test_product_id, 'ND00002240120', 50, '2024-01-20', '2023-01-20');
    RAISE EXCEPTION 'Should have failed: expiry before manufacture';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: Invalid expiry date rejected';
  END;
  
  ROLLBACK;
END $$;

-- TEST 4: Manufacturer settings constraints
DO $$
DECLARE
  test_org_id UUID;
BEGIN
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('MANUFACTURER', '333-33-33333', '/test.pdf', 'Test Mfr', 'Rep', '010-1234-5678', 'Seoul', 'ACTIVE')
  RETURNING id INTO test_org_id;
  
  -- Valid settings
  INSERT INTO manufacturer_settings (organization_id, lot_prefix, lot_model_digits, expiry_months)
  VALUES (test_org_id, 'ND', 5, 12);
  
  -- Invalid model_digits (out of range)
  BEGIN
    INSERT INTO manufacturer_settings (organization_id, lot_prefix, lot_model_digits, expiry_months)
    VALUES (test_org_id, 'ND', 11, 12);  -- Max is 10
    RAISE EXCEPTION 'Should have failed: model_digits out of range';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: Invalid model_digits rejected';
  END;
  
  -- Invalid expiry_months (not in allowed values)
  BEGIN
    INSERT INTO manufacturer_settings (organization_id, lot_prefix, lot_model_digits, expiry_months)
    VALUES (test_org_id, 'ND2', 5, 15);  -- Must be 6, 12, 18, 24, 30, or 36
    RAISE EXCEPTION 'Should have failed: invalid expiry_months';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: Invalid expiry_months rejected';
  END;
  
  ROLLBACK;
END $$;

-- TEST 5: Updated_at trigger test
DO $$
DECLARE
  test_org_id UUID;
  old_updated_at TIMESTAMPTZ;
  new_updated_at TIMESTAMPTZ;
BEGIN
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('HOSPITAL', '444-44-44444', '/test.pdf', 'Test Hospital', 'Rep', '010-1234-5678', 'Seoul', 'ACTIVE')
  RETURNING id, updated_at INTO test_org_id, old_updated_at;
  
  -- Wait a moment
  PERFORM pg_sleep(0.1);
  
  -- Update record
  UPDATE organizations SET name = 'Updated Hospital' WHERE id = test_org_id
  RETURNING updated_at INTO new_updated_at;
  
  IF new_updated_at > old_updated_at THEN
    RAISE NOTICE 'PASS: updated_at trigger working';
  ELSE
    RAISE EXCEPTION 'FAIL: updated_at not updated';
  END IF;
  
  ROLLBACK;
END $$;
```

**실행**:

```bash
# 테스트 실행
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') < supabase/migrations/[timestamp]_test_core_tables.sql

# 모든 테스트가 PASS 출력해야 함
```

---

### 2. 수동 검증 체크리스트

```bash
# 1. 테이블 존재 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "\dt"

# 예상 출력:
#  organizations
#  users
#  manufacturer_settings
#  products
#  lots

# 2. 인덱스 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "\di"

# 예상: idx_organizations_*, idx_users_*, idx_products_*, idx_lots_* 등

# 3. 트리거 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
"

# 예상:
# update_organizations_updated_at | organizations
# update_users_updated_at | users
# update_manufacturer_settings_updated_at | manufacturer_settings
# update_products_updated_at | products

# 4. 제약 조건 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT conname, contype, conrelid::regclass 
FROM pg_constraint 
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text;
"
```

---

## 🔍 문제 해결 (Troubleshooting)

### 문제 1: Migration 적용 실패

**증상**: `supabase db reset` 또는 `supabase migration up` 실패

**원인**: 
- Supabase 로컬 스택이 실행되지 않음
- SQL 문법 오류
- 이미 존재하는 테이블

**해결**:

```bash
# 1. Supabase 상태 확인
supabase status

# 2. 실행되지 않았다면 시작
supabase start

# 3. 로그 확인
supabase db logs

# 4. SQL 문법 검증
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') < supabase/migrations/[timestamp]_create_core_tables.sql
```

---

### 문제 2: Trigger 동작하지 않음

**증상**: UPDATE 후 updated_at이 갱신되지 않음

**원인**:
- Trigger 함수가 생성되지 않음
- Trigger가 테이블에 연결되지 않음

**확인**:

```sql
-- Trigger 함수 확인
SELECT proname FROM pg_proc WHERE proname = 'update_updated_at_column';

-- Trigger 연결 확인
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'update_%_updated_at';
```

**해결**:

```bash
# Migration 재실행
supabase db reset
```

---

### 문제 3: 타임존 설정 확인

**증상**: created_at/updated_at이 UTC로 저장됨

**확인**:

```sql
SHOW timezone;  -- 예상: Asia/Seoul

SELECT NOW();   -- 예상: 한국 시간 (KST)
```

**해결**:

```sql
-- 데이터베이스 타임존 설정
ALTER DATABASE postgres SET timezone TO 'Asia/Seoul';

-- 연결 재시작
\q

-- 재접속 후 확인
SHOW timezone;
```

---

## 🔄 Git Commit

```bash
# Migration 파일 추가
git add supabase/migrations/

# Conventional Commit
git commit -m "feat(db): Create core tables migration

- Add organizations table with type/status constraints
- Add users table extending auth.users
- Add manufacturer_settings with Lot config constraints
- Add products table with UDI-DI
- Add lots table with manufacture/expiry date validation
- Add updated_at auto-update trigger function
- Add comprehensive indexes for query optimization
- Add table/column comments for documentation
- Set timezone to Asia/Seoul

Tests:
- Constraint validation tests
- Trigger functionality tests
- Manual verification checklist"

# Push to remote
git push origin main
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] Migration 파일 생성 및 작성 완료
- [ ] Supabase 로컬 DB에 마이그레이션 적용 성공
- [ ] 모든 테이블 생성 확인 (5개)
- [ ] 모든 인덱스 생성 확인
- [ ] 모든 Trigger 동작 확인
- [ ] 제약 조건 테스트 통과 (5개 테스트)
- [ ] 타임존 설정 확인 (Asia/Seoul)
- [ ] Supabase Studio에서 테이블 구조 확인
- [ ] TypeScript 에러 없음 (타입 생성은 Phase 1.5에서)
- [ ] Git commit 완료 (Conventional Commits)
- [ ] Git push 완료
- [ ] 다음 Phase 진행 가능 (Phase 1.3)

---

## 🔗 참고 자료

- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [PRD 데이터 모델](../../neo-cert-prd-1.2.md#6-데이터-모델)

---

## ⏭️ 다음 단계

[Phase 1.3 - 관계 테이블 마이그레이션](phase-1.3-relations-tables.md)

**작업 내용**:
- virtual_codes, patients, history 테이블 생성
- treatment_records, treatment_details 테이블 생성
- return_requests, return_details, notification_messages 테이블 생성
- 모든 관계 제약 조건 설정
