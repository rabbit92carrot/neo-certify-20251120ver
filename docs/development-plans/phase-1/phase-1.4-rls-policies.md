# Phase 1.4: RLS (Row Level Security) 정책

## 📋 개요

**목표**: 조직별 데이터 격리 및 Pending 데이터 접근 정책 구현
**선행 조건**: Phase 1.3 (관계 테이블) 완료
**예상 소요 시간**: 3-4시간

---

## 📦 핵심 RLS 정책

### 1. Organizations RLS

```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 자신의 조직만 조회
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 관리자는 모든 조직 조회
CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.organization_id IS NULL -- Admin 조직 없음
  ));
```

### 2. Products RLS

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 제조사는 자신의 제품만 조회/수정
CREATE POLICY "Manufacturers manage their products"
  ON products FOR ALL
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 유통사/병원은 보유한 제품 조회만
CREATE POLICY "Others can view products they own"
  ON products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM virtual_codes vc
    JOIN lots l ON vc.lot_id = l.id
    WHERE l.product_id = products.id
    AND vc.owner_type = 'organization'
    AND vc.owner_id::uuid = (SELECT organization_id FROM users WHERE id = auth.uid())
  ));
```

### 3. Virtual_Codes RLS (핵심)

```sql
ALTER TABLE virtual_codes ENABLE ROW LEVEL SECURITY;

-- 소유자는 자신의 코드 조회
CREATE POLICY "Owners can view their codes"
  ON virtual_codes FOR SELECT
  USING (
    (owner_type = 'organization' AND owner_id::uuid = (SELECT organization_id FROM users WHERE id = auth.uid()))
    OR
    (status = 'PENDING' AND pending_to = (SELECT organization_id FROM users WHERE id = auth.uid()))
  );

-- 소유자는 자신의 코드 수정
CREATE POLICY "Owners can update their codes"
  ON virtual_codes FOR UPDATE
  USING (owner_type = 'organization' AND owner_id::uuid = (SELECT organization_id FROM users WHERE id = auth.uid()));
```

### 4. History RLS

```sql
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- 관련된 조직만 이력 조회
CREATE POLICY "Organizations can view their history"
  ON history FOR SELECT
  USING (
    from_owner_id = (SELECT organization_id::text FROM users WHERE id = auth.uid())
    OR
    to_owner_id = (SELECT organization_id::text FROM users WHERE id = auth.uid())
  );

-- 관리자는 모든 이력 조회
CREATE POLICY "Admins can view all history"
  ON history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.organization_id IS NULL
  ));
```

### 5. Patients RLS

```sql
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 병원만 환자 데이터 생성
CREATE POLICY "Hospitals can create patients"
  ON patients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM users u
    JOIN organizations o ON u.organization_id = o.id
    WHERE u.id = auth.uid() AND o.type = 'HOSPITAL'
  ));
```

---

## ✅ 테스트 요구사항

```sql
-- 테스트 시나리오 1: 제조사는 자신의 제품만 조회
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<manufacturer-user-id>"}';
SELECT * FROM products; -- 자신의 제품만 반환

-- 테스트 시나리오 2: Pending 데이터 접근
-- 유통사는 pending_to가 자신인 코드 조회 가능
SELECT * FROM virtual_codes WHERE status = 'PENDING';
```

---

## 🔄 Git Commit

```bash
git add supabase/migrations/
git commit -m "feat(db): Implement RLS policies for data isolation"
```

---

## ⏭️ 다음 단계

[Phase 1.5 - Storage 설정](phase-1.5-storage-setup.md)
