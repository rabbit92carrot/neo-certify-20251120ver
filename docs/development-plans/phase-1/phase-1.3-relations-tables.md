# Phase 1.3: 관계 테이블 마이그레이션

## 📋 개요

**목표**: Virtual_Code, History, Treatment, Return, Notification 테이블 생성
**선행 조건**: Phase 1.2 (핵심 테이블) 완료
**예상 소요 시간**: 2-3시간

---

## 📦 주요 테이블

### Virtual_Codes (핵심)

가상 식별코드 - 전체 시스템의 중심

```sql
CREATE TABLE virtual_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('IN_STOCK', 'PENDING', 'USED', 'DISPOSED')),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('organization', 'patient')),
  owner_id TEXT NOT NULL,
  pending_to UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Patients

```sql
CREATE TABLE patients (
  phone_number VARCHAR(11) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### History

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
```

### Treatment Tables

```sql
CREATE TABLE treatment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_phone VARCHAR(11) NOT NULL REFERENCES patients(phone_number) ON DELETE CASCADE,
  treatment_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE treatment_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  treatment_id UUID NOT NULL REFERENCES treatment_records(id) ON DELETE CASCADE,
  virtual_code_id UUID NOT NULL REFERENCES virtual_codes(id) ON DELETE CASCADE,
  UNIQUE(treatment_id, virtual_code_id)
);
```

### Return Tables

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

CREATE TABLE return_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  virtual_code_id UUID NOT NULL REFERENCES virtual_codes(id) ON DELETE CASCADE,
  UNIQUE(return_request_id, virtual_code_id)
);
```

### Notifications

```sql
CREATE TABLE notification_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('AUTHENTICATION', 'RECALL')),
  patient_phone VARCHAR(11) NOT NULL REFERENCES patients(phone_number) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 🔄 Git Commit

```bash
git add supabase/migrations/
git commit -m "feat(db): Create relations tables (virtual_codes, history, treatment, return)"
```

---

## ⏭️ 다음 단계

[Phase 1.4 - RLS 정책](phase-1.4-rls-policies.md)
