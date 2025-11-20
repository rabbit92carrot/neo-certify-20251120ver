# Phase 1.2: 핵심 테이블 마이그레이션

## 📋 개요

**목표**: Organization, User, Manufacturer_Settings, Product, Lot 테이블 생성
**선행 조건**: Phase 1.1 (DB 설계) 완료
**예상 소요 시간**: 2-3시간

---

## 📦 작업 내용

### 1. 첫 번째 마이그레이션 생성

```bash
supabase migration new create_core_tables
```

### 2. 마이그레이션 파일 작성

**supabase/migrations/[timestamp]_create_core_tables.sql**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
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

CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_business_number ON organizations(business_number);

-- Users table (extends auth.users)
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

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- Manufacturer Settings table
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

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  udi_di VARCHAR(100) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_products_active ON products(is_active);

-- Lots table
CREATE TABLE lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_number VARCHAR(50) NOT NULL UNIQUE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  manufacture_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lots_product ON lots(product_id);
CREATE INDEX idx_lots_number ON lots(lot_number);
CREATE INDEX idx_lots_manufacture_date ON lots(manufacture_date);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manufacturer_settings_updated_at BEFORE UPDATE ON manufacturer_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. 마이그레이션 적용

```bash
# 로컬 DB에 적용
supabase db reset

# 또는
supabase migration up
```

### 4. 검증

```bash
# Studio에서 테이블 확인
# http://localhost:54323
```

---

## ✅ 테스트 요구사항

```sql
-- 테스트 데이터 삽입
INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
VALUES ('MANUFACTURER', '123-45-67890', '/test.pdf', '테스트제조사', '대표자', '010-1234-5678', '서울시', 'ACTIVE')
RETURNING id;

-- 제약조건 테스트
-- 잘못된 type 입력 시 에러 확인
INSERT INTO organizations (type, ...) VALUES ('INVALID', ...); -- 에러 발생 확인
```

---

## 🔄 Git Commit

```bash
git add supabase/migrations/
git commit -m "feat(db): Create core tables migration (organizations, users, products, lots)"
```

---

## ⏭️ 다음 단계

[Phase 1.3 - 관계 테이블 마이그레이션](phase-1.3-relations-tables.md)
