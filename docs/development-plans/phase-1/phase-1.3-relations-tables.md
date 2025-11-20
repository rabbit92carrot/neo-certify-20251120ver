# Phase 1.3: 관계 테이블 마이그레이션

## 📋 개요

**목표**: virtual_codes, patients, history, treatment, return, notification 테이블 생성 및 검증
**선행 조건**: Phase 1.2 (핵심 테이블) 완료
**예상 소요 시간**: 2-3시간

---

## 🎯 개발 원칙 준수 체크리스트

- [x] SSOT: 데이터베이스 스키마가 단일 진실의 원천
- [ ] No Magic Numbers: CHECK 제약조건에 상수 활용
- [ ] No 'any' type: TypeScript 타입 자동 생성
- [x] Clean Code: 명확한 테이블/컬럼명
- [ ] 테스트 작성: Migration SQL 검증 테스트
- [ ] Git commit: Migration 파일 커밋

---

## 📦 작업 내용

### 1. 두 번째 마이그레이션 생성

```bash
# 새 마이그레이션 파일 생성
supabase migration new create_relations_tables
```

**생성되는 파일**: `supabase/migrations/[timestamp]_create_relations_tables.sql`

---

### 2. 마이그레이션 파일 작성

**supabase/migrations/[timestamp]_create_relations_tables.sql**:

```sql
-- =============================================
-- Neo Certificate System - Relations Tables Migration
-- Description: Virtual Codes, History, Treatments, Returns, Notifications
-- Author: rabbit92carrot
-- Created: 2024-01-20
-- =============================================

-- =============================================
-- TABLE: virtual_codes (★ 핵심 테이블)
-- Description: 가상 식별코드 (실제 추적 단위)
-- =============================================

CREATE TABLE virtual_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('IN_STOCK', 'PENDING', 'USED', 'DISPOSED')) DEFAULT 'IN_STOCK',
  owner_type TEXT NOT NULL CHECK (owner_type IN ('organization', 'patient')),
  owner_id TEXT NOT NULL,  -- UUID (organization) 또는 전화번호 (patient)
  pending_to UUID REFERENCES organizations(id) ON DELETE SET NULL,  -- 출고 승인 대기 중인 수신자
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for virtual_codes
CREATE INDEX idx_virtual_codes_code ON virtual_codes(code);
CREATE INDEX idx_virtual_codes_lot ON virtual_codes(lot_id);
CREATE INDEX idx_virtual_codes_status ON virtual_codes(status);
CREATE INDEX idx_virtual_codes_owner ON virtual_codes(owner_type, owner_id);
CREATE INDEX idx_virtual_codes_pending ON virtual_codes(pending_to) WHERE pending_to IS NOT NULL;

-- Comments
COMMENT ON TABLE virtual_codes IS '가상 식별코드 (제품 추적 단위)';
COMMENT ON COLUMN virtual_codes.code IS '고유 식별 코드 (UUID 또는 단축 형식)';
COMMENT ON COLUMN virtual_codes.status IS 'IN_STOCK: 재고, PENDING: 출고 대기, USED: 시술 완료, DISPOSED: 폐기';
COMMENT ON COLUMN virtual_codes.owner_type IS 'organization: 조직 보유, patient: 환자 시술';
COMMENT ON COLUMN virtual_codes.owner_id IS 'organization: UUID, patient: 전화번호 (01012345678)';
COMMENT ON COLUMN virtual_codes.pending_to IS '출고 대기 중인 수신 조직 (PENDING 상태일 때만 설정)';

-- =============================================
-- TABLE: patients
-- Description: 환자 정보 (전화번호 기반)
-- =============================================

CREATE TABLE patients (
  phone_number VARCHAR(11) PRIMARY KEY,  -- 01012345678 (하이픈 없이)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for patients
CREATE INDEX idx_patients_phone ON patients(phone_number);

-- Comments
COMMENT ON TABLE patients IS '환자 정보 (전화번호 기반)';
COMMENT ON COLUMN patients.phone_number IS '정규화된 전화번호 (하이픈 없음): 01012345678';

-- =============================================
-- TABLE: history
-- Description: 이력 추적 (생산/출고/입고/시술/회수/반품/폐기)
-- =============================================

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

-- Indexes for history
CREATE INDEX idx_history_virtual_code ON history(virtual_code_id);
CREATE INDEX idx_history_action ON history(action_type);
CREATE INDEX idx_history_created ON history(created_at DESC);
CREATE INDEX idx_history_from_owner ON history(from_owner_type, from_owner_id);
CREATE INDEX idx_history_to_owner ON history(to_owner_type, to_owner_id);

-- Comments
COMMENT ON TABLE history IS '이력 추적 (모든 거래 기록)';
COMMENT ON COLUMN history.action_type IS 'PRODUCTION: 생산, SHIPMENT: 출고, RECEIVE: 입고, TREATMENT: 시술, RECALL: 회수, RETURN: 반품, DISPOSE: 폐기';
COMMENT ON COLUMN history.from_owner_id IS '출발지 owner_id (organization UUID 또는 patient 전화번호)';
COMMENT ON COLUMN history.to_owner_id IS '도착지 owner_id (organization UUID 또는 patient 전화번호)';

-- =============================================
-- TABLE: treatment_records
-- Description: 시술 기록 (환자별 시술 세션)
-- =============================================

CREATE TABLE treatment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_phone VARCHAR(11) NOT NULL REFERENCES patients(phone_number) ON DELETE CASCADE,
  treatment_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for treatment_records
CREATE INDEX idx_treatment_hospital ON treatment_records(hospital_id);
CREATE INDEX idx_treatment_patient ON treatment_records(patient_phone);
CREATE INDEX idx_treatment_date ON treatment_records(treatment_date DESC);

-- Comments
COMMENT ON TABLE treatment_records IS '시술 기록 (환자별 시술 세션)';
COMMENT ON COLUMN treatment_records.hospital_id IS '시술 병원 (FK to organizations)';
COMMENT ON COLUMN treatment_records.patient_phone IS '환자 전화번호 (FK to patients)';
COMMENT ON COLUMN treatment_records.treatment_date IS '시술 일자';

-- =============================================
-- TABLE: treatment_details
-- Description: 시술 상세 (사용된 virtual_code 목록)
-- =============================================

CREATE TABLE treatment_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_id UUID NOT NULL REFERENCES treatment_records(id) ON DELETE CASCADE,
  virtual_code_id UUID NOT NULL REFERENCES virtual_codes(id) ON DELETE CASCADE,
  
  -- Ensure each virtual_code is used only once per treatment
  CONSTRAINT uq_treatment_virtual_code UNIQUE(treatment_id, virtual_code_id)
);

-- Indexes for treatment_details
CREATE INDEX idx_treatment_details_treatment ON treatment_details(treatment_id);
CREATE INDEX idx_treatment_details_code ON treatment_details(virtual_code_id);

-- Comments
COMMENT ON TABLE treatment_details IS '시술 상세 (시술에 사용된 virtual_code 목록)';

-- =============================================
-- TABLE: return_requests
-- Description: 반품 요청 (유통사→제조사, 병원→유통사)
-- =============================================

CREATE TABLE return_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for return_requests
CREATE INDEX idx_return_requester ON return_requests(requester_id);
CREATE INDEX idx_return_receiver ON return_requests(receiver_id);
CREATE INDEX idx_return_status ON return_requests(status);
CREATE INDEX idx_return_created ON return_requests(created_at DESC);

-- Comments
COMMENT ON TABLE return_requests IS '반품 요청';
COMMENT ON COLUMN return_requests.requester_id IS '반품 요청자 (유통사 또는 병원)';
COMMENT ON COLUMN return_requests.receiver_id IS '반품 수신자 (제조사 또는 유통사)';
COMMENT ON COLUMN return_requests.status IS 'PENDING: 대기, APPROVED: 승인, REJECTED: 거부';

-- =============================================
-- TABLE: return_details
-- Description: 반품 상세 (반품할 virtual_code 목록)
-- =============================================

CREATE TABLE return_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  virtual_code_id UUID NOT NULL REFERENCES virtual_codes(id) ON DELETE CASCADE,
  
  -- Ensure each virtual_code is returned only once per request
  CONSTRAINT uq_return_virtual_code UNIQUE(return_request_id, virtual_code_id)
);

-- Indexes for return_details
CREATE INDEX idx_return_details_request ON return_details(return_request_id);
CREATE INDEX idx_return_details_code ON return_details(virtual_code_id);

-- Comments
COMMENT ON TABLE return_details IS '반품 상세 (반품할 virtual_code 목록)';

-- =============================================
-- TABLE: notification_messages
-- Description: 알림 메시지 (환자 인증/회수 알림)
-- =============================================

CREATE TABLE notification_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('AUTHENTICATION', 'RECALL')),
  patient_phone VARCHAR(11) NOT NULL REFERENCES patients(phone_number) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notification_messages
CREATE INDEX idx_notification_patient ON notification_messages(patient_phone);
CREATE INDEX idx_notification_type ON notification_messages(type);
CREATE INDEX idx_notification_sent ON notification_messages(is_sent);
CREATE INDEX idx_notification_created ON notification_messages(created_at DESC);

-- Comments
COMMENT ON TABLE notification_messages IS '알림 메시지 (환자 인증/회수 알림)';
COMMENT ON COLUMN notification_messages.type IS 'AUTHENTICATION: 인증 발급, RECALL: 회수 안내';
COMMENT ON COLUMN notification_messages.is_sent IS '발송 완료 여부';

-- =============================================
-- TRIGGERS: Apply updated_at auto-update
-- =============================================

CREATE TRIGGER update_virtual_codes_updated_at 
  BEFORE UPDATE ON virtual_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_return_requests_updated_at 
  BEFORE UPDATE ON return_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: 다른 테이블들은 updated_at 컬럼이 없으므로 트리거 미적용
```

---

### 3. 마이그레이션 적용

```bash
# 로컬 DB 리셋 (전체 재생성)
supabase db reset

# 또는 새 마이그레이션만 적용
supabase migration up

# 적용 결과 확인
supabase migration list
```

**예상 출력**:
```
Local migrations:
  20240120_create_core_tables.sql       [Applied]
  20240120_create_relations_tables.sql  [Applied]
```

---

### 4. Supabase Studio에서 수동 검증

```bash
# Studio 접속
# http://localhost:54323

# Database → Tables에서 다음 테이블 확인:
# - virtual_codes ★
# - patients
# - history
# - treatment_records
# - treatment_details
# - return_requests
# - return_details
# - notification_messages
```

---

## 📝 TypeScript 타입 정의

타입은 Phase 1.5 완료 후 자동 생성됩니다.

---

## 🔧 Constants 정의

이미 Phase 0.5에서 정의 완료:

```typescript
// src/constants/status.ts
export const VIRTUAL_CODE_STATUS = {
  IN_STOCK: 'IN_STOCK',
  PENDING: 'PENDING',
  USED: 'USED',
  DISPOSED: 'DISPOSED',
} as const

export const HISTORY_ACTION = {
  PRODUCTION: 'PRODUCTION',
  SHIPMENT: 'SHIPMENT',
  RECEIVE: 'RECEIVE',
  TREATMENT: 'TREATMENT',
  RECALL: 'RECALL',
  RETURN: 'RETURN',
  DISPOSE: 'DISPOSE',
} as const

export const RETURN_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export const NOTIFICATION_TYPE = {
  AUTHENTICATION: 'AUTHENTICATION',
  RECALL: 'RECALL',
} as const
```

---

## 📁 생성/수정 파일 목록

**생성**:
- `supabase/migrations/[timestamp]_create_relations_tables.sql`

---

## ✅ 테스트 요구사항

### 1. 제약 조건 및 관계 테스트

**supabase/migrations/[timestamp]_test_relations_tables.sql** (임시 테스트용):

```sql
-- =============================================
-- RELATIONS TABLES CONSTRAINT TESTS
-- =============================================

-- TEST 1: virtual_codes status constraint
DO $$
DECLARE
  test_org_id UUID;
  test_product_id UUID;
  test_lot_id UUID;
BEGIN
  -- Setup
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('MANUFACTURER', '111-11-11111', '/test.pdf', 'Test Mfr', 'Rep', '010-1111-1111', 'Seoul', 'ACTIVE')
  RETURNING id INTO test_org_id;
  
  INSERT INTO products (organization_id, name, udi_di, model_name)
  VALUES (test_org_id, 'PDO Thread A', 'UDI-001', 'MODEL-A')
  RETURNING id INTO test_product_id;
  
  INSERT INTO lots (product_id, lot_number, quantity, manufacture_date, expiry_date)
  VALUES (test_product_id, 'ND00001240120', 100, '2024-01-20', '2025-01-20')
  RETURNING id INTO test_lot_id;
  
  -- Valid virtual_code
  INSERT INTO virtual_codes (code, lot_id, status, owner_type, owner_id)
  VALUES ('VC-TEST-001', test_lot_id, 'IN_STOCK', 'organization', test_org_id::TEXT);
  
  -- Invalid status
  BEGIN
    INSERT INTO virtual_codes (code, lot_id, status, owner_type, owner_id)
    VALUES ('VC-TEST-002', test_lot_id, 'INVALID', 'organization', test_org_id::TEXT);
    RAISE EXCEPTION 'Should have failed: invalid virtual_code status';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: Invalid virtual_code status rejected';
  END;
  
  ROLLBACK;
END $$;

-- TEST 2: Patient phone number format validation
DO $$
BEGIN
  -- Valid phone number (11 digits)
  INSERT INTO patients (phone_number) VALUES ('01012345678');
  
  -- Note: DB level doesn't validate format, only length
  -- Format validation should be done at application level using REGEX constants
  
  ROLLBACK;
END $$;

-- TEST 3: Treatment details uniqueness
DO $$
DECLARE
  test_hospital_id UUID;
  test_patient_phone VARCHAR(11) := '01012345678';
  test_treatment_id UUID;
  test_product_id UUID;
  test_lot_id UUID;
  test_vc_id UUID;
BEGIN
  -- Setup hospital
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('HOSPITAL', '222-22-22222', '/test.pdf', 'Test Hospital', 'Rep', '010-2222-2222', 'Seoul', 'ACTIVE')
  RETURNING id INTO test_hospital_id;
  
  -- Setup product and lot
  INSERT INTO products (organization_id, name, udi_di, model_name)
  VALUES (test_hospital_id, 'PDO Thread', 'UDI-002', 'MODEL-B')
  RETURNING id INTO test_product_id;
  
  INSERT INTO lots (product_id, lot_number, quantity, manufacture_date, expiry_date)
  VALUES (test_product_id, 'ND00002240120', 50, '2024-01-20', '2025-01-20')
  RETURNING id INTO test_lot_id;
  
  -- Create virtual code
  INSERT INTO virtual_codes (code, lot_id, status, owner_type, owner_id)
  VALUES ('VC-TEST-003', test_lot_id, 'IN_STOCK', 'organization', test_hospital_id::TEXT)
  RETURNING id INTO test_vc_id;
  
  -- Create patient
  INSERT INTO patients (phone_number) VALUES (test_patient_phone);
  
  -- Create treatment
  INSERT INTO treatment_records (hospital_id, patient_phone, treatment_date)
  VALUES (test_hospital_id, test_patient_phone, '2024-01-20')
  RETURNING id INTO test_treatment_id;
  
  -- Add treatment detail
  INSERT INTO treatment_details (treatment_id, virtual_code_id)
  VALUES (test_treatment_id, test_vc_id);
  
  -- Try to add same virtual_code again (should fail)
  BEGIN
    INSERT INTO treatment_details (treatment_id, virtual_code_id)
    VALUES (test_treatment_id, test_vc_id);
    RAISE EXCEPTION 'Should have failed: duplicate virtual_code in same treatment';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'PASS: Duplicate treatment detail rejected';
  END;
  
  ROLLBACK;
END $$;

-- TEST 4: Return request workflow
DO $$
DECLARE
  test_distributor_id UUID;
  test_manufacturer_id UUID;
  test_return_id UUID;
  test_product_id UUID;
  test_lot_id UUID;
  test_vc_id UUID;
BEGIN
  -- Setup manufacturer
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('MANUFACTURER', '333-33-33333', '/test.pdf', 'Test Mfr', 'Rep', '010-3333-3333', 'Seoul', 'ACTIVE')
  RETURNING id INTO test_manufacturer_id;
  
  -- Setup distributor
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('DISTRIBUTOR', '444-44-44444', '/test.pdf', 'Test Dist', 'Rep', '010-4444-4444', 'Seoul', 'ACTIVE')
  RETURNING id INTO test_distributor_id;
  
  -- Setup product and lot
  INSERT INTO products (organization_id, name, udi_di, model_name)
  VALUES (test_manufacturer_id, 'PDO Thread', 'UDI-003', 'MODEL-C')
  RETURNING id INTO test_product_id;
  
  INSERT INTO lots (product_id, lot_number, quantity, manufacture_date, expiry_date)
  VALUES (test_product_id, 'ND00003240120', 30, '2024-01-20', '2025-01-20')
  RETURNING id INTO test_lot_id;
  
  -- Create virtual code owned by distributor
  INSERT INTO virtual_codes (code, lot_id, status, owner_type, owner_id)
  VALUES ('VC-TEST-004', test_lot_id, 'IN_STOCK', 'organization', test_distributor_id::TEXT)
  RETURNING id INTO test_vc_id;
  
  -- Create return request
  INSERT INTO return_requests (requester_id, receiver_id, status, reason)
  VALUES (test_distributor_id, test_manufacturer_id, 'PENDING', 'Defective product')
  RETURNING id INTO test_return_id;
  
  -- Add return detail
  INSERT INTO return_details (return_request_id, virtual_code_id)
  VALUES (test_return_id, test_vc_id);
  
  -- Try to add same virtual_code again (should fail)
  BEGIN
    INSERT INTO return_details (return_request_id, virtual_code_id)
    VALUES (test_return_id, test_vc_id);
    RAISE EXCEPTION 'Should have failed: duplicate virtual_code in same return';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'PASS: Duplicate return detail rejected';
  END;
  
  ROLLBACK;
END $$;

-- TEST 5: History tracking
DO $$
DECLARE
  test_org_id UUID;
  test_product_id UUID;
  test_lot_id UUID;
  test_vc_id UUID;
BEGIN
  -- Setup
  INSERT INTO organizations (type, business_number, business_license_file, name, representative_name, representative_contact, address, status)
  VALUES ('MANUFACTURER', '555-55-55555', '/test.pdf', 'Test Mfr', 'Rep', '010-5555-5555', 'Seoul', 'ACTIVE')
  RETURNING id INTO test_org_id;
  
  INSERT INTO products (organization_id, name, udi_di, model_name)
  VALUES (test_org_id, 'PDO Thread', 'UDI-004', 'MODEL-D')
  RETURNING id INTO test_product_id;
  
  INSERT INTO lots (product_id, lot_number, quantity, manufacture_date, expiry_date)
  VALUES (test_product_id, 'ND00004240120', 10, '2024-01-20', '2025-01-20')
  RETURNING id INTO test_lot_id;
  
  INSERT INTO virtual_codes (code, lot_id, status, owner_type, owner_id)
  VALUES ('VC-TEST-005', test_lot_id, 'IN_STOCK', 'organization', test_org_id::TEXT)
  RETURNING id INTO test_vc_id;
  
  -- Create history record
  INSERT INTO history (virtual_code_id, action_type, from_owner_type, from_owner_id, to_owner_type, to_owner_id, quantity)
  VALUES (test_vc_id, 'PRODUCTION', 'organization', test_org_id::TEXT, 'organization', test_org_id::TEXT, 1);
  
  -- Invalid action_type
  BEGIN
    INSERT INTO history (virtual_code_id, action_type, from_owner_type, from_owner_id, to_owner_type, to_owner_id, quantity)
    VALUES (test_vc_id, 'INVALID', 'organization', test_org_id::TEXT, 'organization', test_org_id::TEXT, 1);
    RAISE EXCEPTION 'Should have failed: invalid history action_type';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: Invalid history action_type rejected';
  END;
  
  ROLLBACK;
END $$;

-- TEST 6: Notification messages
DO $$
DECLARE
  test_patient_phone VARCHAR(11) := '01098765432';
BEGIN
  -- Create patient
  INSERT INTO patients (phone_number) VALUES (test_patient_phone);
  
  -- Create authentication notification
  INSERT INTO notification_messages (type, patient_phone, content, is_sent)
  VALUES ('AUTHENTICATION', test_patient_phone, 'Your authentication code: ABC123', FALSE);
  
  -- Create recall notification
  INSERT INTO notification_messages (type, patient_phone, content, is_sent)
  VALUES ('RECALL', test_patient_phone, 'Product recall notice', FALSE);
  
  -- Invalid type
  BEGIN
    INSERT INTO notification_messages (type, patient_phone, content)
    VALUES ('INVALID', test_patient_phone, 'Test');
    RAISE EXCEPTION 'Should have failed: invalid notification type';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: Invalid notification type rejected';
  END;
  
  ROLLBACK;
END $$;
```

**실행**:

```bash
# 테스트 실행
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') < supabase/migrations/[timestamp]_test_relations_tables.sql

# 모든 테스트가 PASS 출력해야 함
```

---

### 2. 수동 검증 체크리스트

```bash
# 1. 테이블 존재 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "\dt"

# 예상 출력에 다음 테이블들 포함:
#  virtual_codes
#  patients
#  history
#  treatment_records
#  treatment_details
#  return_requests
#  return_details
#  notification_messages

# 2. 외래 키 제약 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
"

# 3. 인덱스 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('virtual_codes', 'patients', 'history', 'treatment_records', 'treatment_details', 'return_requests', 'return_details', 'notification_messages')
ORDER BY tablename, indexname;
"

# 4. UNIQUE 제약 확인
psql $(supabase status --output table | grep 'DB URL' | awk '{print $3}') -c "
SELECT conname, contype, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND contype = 'u'
  AND conrelid::regclass::text IN ('treatment_details', 'return_details', 'virtual_codes')
ORDER BY conrelid::regclass::text;
"
```

---

## 🔍 문제 해결 (Troubleshooting)

### 문제 1: 외래 키 제약 위반

**증상**: Migration 적용 시 "violates foreign key constraint" 오류

**원인**:
- 참조하는 테이블이 아직 생성되지 않음
- Migration 순서가 잘못됨

**해결**:

```bash
# 1. Migration 순서 확인
supabase migration list

# 2. create_core_tables가 먼저 적용되어야 함
# 3. 필요 시 db 리셋
supabase db reset
```

---

### 문제 2: virtual_codes의 pending_to 컬럼 이해

**설명**:
- `pending_to`는 출고 승인 대기 중일 때만 사용
- 상태가 `PENDING`일 때 수신자 조직 ID 저장
- 승인 후에는 `owner_id`로 이동하고 `pending_to`는 NULL

**예시 데이터 플로우**:

```sql
-- 1. 제조사가 생산 (상태: IN_STOCK)
INSERT INTO virtual_codes (code, lot_id, status, owner_type, owner_id, pending_to)
VALUES ('VC-001', lot_id, 'IN_STOCK', 'organization', manufacturer_id::TEXT, NULL);

-- 2. 유통사로 출고 요청 (상태: PENDING)
UPDATE virtual_codes
SET status = 'PENDING', pending_to = distributor_id
WHERE code = 'VC-001';

-- 3. 유통사가 승인 (상태: IN_STOCK)
UPDATE virtual_codes
SET status = 'IN_STOCK', owner_id = distributor_id::TEXT, pending_to = NULL
WHERE code = 'VC-001';
```

---

### 문제 3: patients 테이블에 최소 정보만 저장하는 이유

**설명**:
- PRD 요구사항: 환자 개인정보는 최소화
- 전화번호만으로 식별 (이름, 주민번호 등 저장하지 않음)
- 병원 내부 시스템에서 관리, 네오인증서는 추적만 수행

**장점**:
- 개인정보보호법 준수
- 데이터 최소화 원칙
- 시스템 복잡도 감소

---

## 🔄 Git Commit

```bash
# Migration 파일 추가
git add supabase/migrations/

# Conventional Commit
git commit -m "feat(db): Create relations tables migration

- Add virtual_codes table (core tracking entity)
- Add patients table (phone-based identification)
- Add history table (all transaction tracking)
- Add treatment_records and treatment_details tables
- Add return_requests and return_details tables
- Add notification_messages table
- Add comprehensive indexes for all tables
- Add UNIQUE constraints for data integrity
- Add foreign key constraints with proper CASCADE rules
- Add table/column comments for documentation
- Add updated_at triggers for virtual_codes and return_requests

Tests:
- Constraint validation tests (6 test scenarios)
- Foreign key relationship tests
- UNIQUE constraint tests
- Manual verification checklist"

# Push to remote
git push origin main
```

---

## ✔️ 완료 기준 (Definition of Done)

- [ ] Migration 파일 생성 및 작성 완료
- [ ] Supabase 로컬 DB에 마이그레이션 적용 성공
- [ ] 모든 테이블 생성 확인 (8개)
- [ ] 모든 인덱스 생성 확인
- [ ] 모든 외래 키 제약 설정 확인
- [ ] UNIQUE 제약 조건 동작 확인
- [ ] Trigger 동작 확인 (2개)
- [ ] 제약 조건 테스트 통과 (6개 테스트)
- [ ] Supabase Studio에서 테이블 구조 확인
- [ ] 외래 키 관계 시각화 확인
- [ ] TypeScript 에러 없음 (타입 생성은 Phase 1.5에서)
- [ ] Git commit 완료 (Conventional Commits)
- [ ] Git push 완료
- [ ] 다음 Phase 진행 가능 (Phase 1.4)

---

## 🔗 참고 자료

- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [PostgreSQL UNIQUE Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS)
- [Supabase Database Design](https://supabase.com/docs/guides/database/tables)
- [PRD 데이터 모델](../../neo-cert-prd-1.2.md#6-데이터-모델)

---

## ⏭️ 다음 단계

[Phase 1.4 - RLS 정책 설정](phase-1.4-rls-policies.md)

**작업 내용**:
- 조직별 데이터 격리 RLS 정책 설정
- PENDING 상태 데이터 접근 규칙
- 관리자 전체 접근 권한
- 환자 본인 데이터 접근 권한
