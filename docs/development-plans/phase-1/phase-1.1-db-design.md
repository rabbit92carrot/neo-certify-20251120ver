# Phase 1.1: 데이터베이스 설계

## 📋 개요

**목표**: 전체 데이터베이스 ERD 설계 및 Supabase 로컬 환경 구축
**선행 조건**: Phase 0 전체 완료
**예상 소요 시간**: 4-6시간

---

## 🎯 개발 원칙 준수 체크리스트

- [x] SSOT: 데이터베이스 스키마가 단일 진실의 원천
- [ ] No Magic Numbers: Enum 타입 활용
- [ ] No 'any' type: 타입 생성 시 strict
- [x] Clean Code: 명확한 테이블/컬럼명
- [ ] 테스트 작성: Migration 검증
- [ ] Git commit: ERD 및 Docker 설정 커밋
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 📦 작업 내용

### 1. Docker Compose로 Supabase 로컬 환경 구축

```bash
# Supabase CLI 설치 (이미 설치된 경우 skip)
npm install -g supabase

# Supabase 프로젝트 초기화
supabase init

# Supabase 로컬 스택 시작
supabase start
```

**생성되는 파일**:
- `supabase/config.toml`
- `supabase/.gitignore`

**supabase/config.toml** (주요 설정):
```toml
project_id = "neo-certify-local"

[api]
enabled = true
port = 54321
schemas = ["public", "storage"]

[db]
port = 54322
major_version = 15

[studio]
enabled = true
port = 54323

[auth]
enabled = true
site_url = "http://localhost:5173"
additional_redirect_urls = ["http://localhost:5173"]
```

### 2. 데이터베이스 ERD 설계

#### 2.1 핵심 엔티티 (15개 테이블)

```
1. organizations (조직)
   ├── manufacturer_settings (제조사 설정)
   ├── users (사용자)
   └── products (제품)

2. products (제품)
   └── lots (Lot)
       └── virtual_codes (가상 식별코드) ★ 핵심

3. virtual_codes (가상 식별코드)
   ├── history (이력)
   ├── treatment_details (시술 상세)
   ├── return_details (반품 상세)
   └── shipment_details (출고 상세)

4. patients (환자)
   └── treatment_records (시술 기록)
       └── treatment_details (시술 상세)

5. shipments (출고 기록)
   └── shipment_details (출고 상세)

6. return_requests (반품 요청)
   └── return_details (반품 상세)

7. notification_messages (알림 메시지)
```

#### 2.2 테이블 상세 정의

**organizations (조직)**:
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('MANUFACTURER', 'DISTRIBUTOR', 'HOSPITAL')),
  business_number VARCHAR(12) NOT NULL UNIQUE, -- 000-00-00000 정규화
  business_license_file TEXT NOT NULL, -- Supabase Storage 경로
  name VARCHAR(255) NOT NULL,
  representative_name VARCHAR(100) NOT NULL,
  representative_contact VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'DELETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_status ON organizations(status);
```

**manufacturer_settings (제조사 설정)**:
```sql
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
```

**users (사용자)**:
```sql
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
```

**products (제품)**:
```sql
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
```

**lots (Lot)**:
```sql
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
```

**virtual_codes (가상 식별코드) ★ 핵심**:
```sql
CREATE TABLE virtual_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('IN_STOCK', 'PENDING', 'USED', 'DISPOSED')),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('organization', 'patient')),
  owner_id TEXT NOT NULL, -- UUID (organization) 또는 전화번호 (patient)
  pending_to UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_virtual_codes_lot ON virtual_codes(lot_id);
CREATE INDEX idx_virtual_codes_status ON virtual_codes(status);
CREATE INDEX idx_virtual_codes_owner ON virtual_codes(owner_type, owner_id);
CREATE INDEX idx_virtual_codes_pending ON virtual_codes(pending_to) WHERE pending_to IS NOT NULL;
```

**patients (환자)**:
```sql
CREATE TABLE patients (
  phone_number VARCHAR(11) PRIMARY KEY, -- 01012345678 (정규화)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**history (이력)**:
```sql
CREATE TABLE history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  virtual_code_id UUID NOT NULL REFERENCES virtual_codes(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('PRODUCTION', 'SHIPMENT', 'RECEIVE', 'TREATMENT', 'RECALL', 'RETURN', 'DISPOSE')),
  from_owner_type TEXT NOT NULL,
  from_owner_id TEXT NOT NULL,
  to_owner_type TEXT NOT NULL,
  to_owner_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_virtual_code ON history(virtual_code_id);
CREATE INDEX idx_history_action ON history(action_type);
CREATE INDEX idx_history_created ON history(created_at DESC);
```

**treatment_records (시술 기록)**:
```sql
CREATE TABLE treatment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_phone VARCHAR(11) NOT NULL REFERENCES patients(phone_number) ON DELETE CASCADE,
  treatment_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_treatment_hospital ON treatment_records(hospital_id);
CREATE INDEX idx_treatment_patient ON treatment_records(patient_phone);
CREATE INDEX idx_treatment_date ON treatment_records(treatment_date DESC);
```

**treatment_details (시술 상세)**:
```sql
CREATE TABLE treatment_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_id UUID NOT NULL REFERENCES treatment_records(id) ON DELETE CASCADE,
  virtual_code_id UUID NOT NULL REFERENCES virtual_codes(id) ON DELETE CASCADE,
  UNIQUE(treatment_id, virtual_code_id)
);

CREATE INDEX idx_treatment_details_treatment ON treatment_details(treatment_id);
CREATE INDEX idx_treatment_details_code ON treatment_details(virtual_code_id);
```

**return_requests (반품 요청)**:
```sql
CREATE TABLE return_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_return_requester ON return_requests(requester_id);
CREATE INDEX idx_return_receiver ON return_requests(receiver_id);
CREATE INDEX idx_return_status ON return_requests(status);
```

**return_details (반품 상세)**:
```sql
CREATE TABLE return_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  virtual_code_id UUID NOT NULL REFERENCES virtual_codes(id) ON DELETE CASCADE,
  UNIQUE(return_request_id, virtual_code_id)
);

CREATE INDEX idx_return_details_request ON return_details(return_request_id);
CREATE INDEX idx_return_details_code ON return_details(virtual_code_id);
```

**notification_messages (알림 메시지)**:
```sql
CREATE TABLE notification_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('AUTHENTICATION', 'RECALL')),
  patient_phone VARCHAR(11) NOT NULL REFERENCES patients(phone_number) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_patient ON notification_messages(patient_phone);
CREATE INDEX idx_notification_type ON notification_messages(type);
CREATE INDEX idx_notification_sent ON notification_messages(is_sent);
```

### 3. ERD 다이어그램 작성

**docs/database-erd.md** (mermaid 형식):
```markdown
# Database ERD

\`\`\`mermaid
erDiagram
    organizations ||--o{ manufacturer_settings : has
    organizations ||--o{ users : has
    organizations ||--o{ products : manufactures
    organizations ||--o{ virtual_codes : owns
    organizations ||--o{ treatment_records : performs
    organizations ||--o{ return_requests : requests
    organizations ||--o{ return_requests : receives

    products ||--o{ lots : has
    lots ||--o{ virtual_codes : generates

    virtual_codes ||--o{ history : tracks
    virtual_codes ||--o{ treatment_details : used_in
    virtual_codes ||--o{ return_details : returned_in

    patients ||--o{ treatment_records : receives
    treatment_records ||--o{ treatment_details : contains
    return_requests ||--o{ return_details : contains

    patients ||--o{ notification_messages : receives
\`\`\`
```

### 4. 타임존 설정

모든 TIMESTAMPTZ는 Asia/Seoul 기준:

```sql
-- Supabase 프로젝트 타임존 설정
ALTER DATABASE postgres SET timezone TO 'Asia/Seoul';
```

---

## 📝 TypeScript 타입 정의

**src/types/database.ts** (Supabase CLI로 자동 생성):
```bash
# 타입 생성 (Phase 1.2 이후)
supabase gen types typescript --local > src/types/database.ts
```

---

## 🔧 Constants 정의

이미 Phase 0.5에서 정의 완료

---

## 📁 생성/수정 파일 목록

**생성**:
- `supabase/config.toml`
- `supabase/.gitignore`
- `supabase/migrations/` (디렉토리)
- `docs/database-erd.md`

---

## ✅ 테스트 요구사항

### 수동 검증

```bash
# Supabase 로컬 실행
supabase start

# Studio 접속
# http://localhost:54323

# 상태 확인
supabase status
```

**예상 출력**:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

---

## 🔄 Git Commit

```bash
git add supabase/config.toml supabase/.gitignore
git commit -m "chore(db): Initialize Supabase local environment"

git add docs/database-erd.md
git commit -m "docs(db): Add database ERD diagram"
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] Supabase 로컬 환경 구축 완료
- [ ] ERD 다이어그램 작성 완료
- [ ] 13개 테이블 스키마 정의 완료
- [ ] 인덱스 전략 수립
- [ ] Supabase Studio 접속 확인
- [ ] Git commit 완료
- [ ] 다음 Phase 진행 가능

---

## 🔗 참고 자료

- [Supabase 로컬 개발](https://supabase.com/docs/guides/cli/local-development)
- [PostgreSQL 인덱스](https://www.postgresql.org/docs/current/indexes.html)
- [PRD 데이터 모델 섹션](../../neo-cert-prd-1.2.md#6-데이터-모델)

---

## ⏭️ 다음 단계

[Phase 1.2 - 핵심 테이블 마이그레이션](phase-1.2-core-tables.md)

**작업 내용**:
- Organization, User, Manufacturer_Settings 마이그레이션 작성
- Product, Lot 마이그레이션 작성
- 로컬 DB에 적용 및 검증
