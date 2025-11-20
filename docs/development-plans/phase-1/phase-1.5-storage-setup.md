# Phase 1.5: Supabase Storage 설정

## 📋 개요

**목표**: 사업자등록증 파일 저장용 Storage Bucket 생성 및 RLS
**선행 조건**: Phase 1.4 (RLS 정책) 완료
**예상 소요 시간**: 1-2시간

---

## 📦 작업 내용

### 1. Storage Bucket 생성

```sql
-- Business License 파일용 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-licenses', 'business-licenses', false);
```

### 2. Storage RLS 정책

```sql
-- 업로드 정책: 가입 시에만 업로드
CREATE POLICY "Allow upload during registration"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-licenses'
    AND auth.role() = 'authenticated'
  );

-- 조회 정책: 자신의 조직 파일만 조회
CREATE POLICY "Users can view their own organization files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-licenses'
    AND (storage.foldername(name))[1] = (SELECT organization_id::text FROM users WHERE id = auth.uid())
  );

-- 관리자는 모든 파일 조회
CREATE POLICY "Admins can view all files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-licenses'
    AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.organization_id IS NULL)
  );
```

### 3. 파일 명명 규칙

```
business-licenses/
  └── {organization_id}/
      └── {timestamp}_{original_filename}
```

### 4. 파일 검증

- 최대 크기: 10MB (상수로 정의됨)
- 허용 형식: PDF, JPG, PNG
- Client-side 검증 + Server-side 검증

---

## 🔄 Git Commit

```bash
git add supabase/migrations/
git commit -m "feat(db): Setup Supabase Storage for business licenses"
```

---

## ✔️ Phase 1 완료!

모든 데이터베이스 설정 완료:
- [x] 13개 테이블 마이그레이션
- [x] RLS 정책
- [x] Storage 설정
- [x] 로컬 환경 검증

**다음**: [Phase 2.1 - Auth 설정](../phase-2/phase-2.1-auth-setup.md)
