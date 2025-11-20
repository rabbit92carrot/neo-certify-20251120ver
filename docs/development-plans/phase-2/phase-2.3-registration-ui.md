# Phase 2.3: 회원가입 UI

## 📋 개요

**목표**: 조직 등록 로직 포함 회원가입 페이지 구현
**선행 조건**: Phase 2.2 (로그인 UI) 완료
**예상 소요 시간**: 4-5시간

---

## 📦 핵심 기능

### 1. 역할 선택

```typescript
// 제조사 / 유통사 / 병원 선택
<RadioGroup>
  <Radio value="MANUFACTURER">제조사</Radio>
  <Radio value="DISTRIBUTOR">유통사</Radio>
  <Radio value="HOSPITAL">병원</Radio>
</RadioGroup>
```

### 2. 사업자등록번호 입력 및 조직 조회

```typescript
const checkOrganization = async (businessNumber: string) => {
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('business_number', businessNumber)
    .single()

  if (data) {
    // 기존 조직 존재 → 연결
    setExistingOrg(data)
  } else {
    // 신규 조직 생성
    setShowOrgForm(true)
  }
}
```

### 3. 사업자등록증 파일 업로드

```typescript
const uploadBusinessLicense = async (file: File) => {
  const fileName = `${Date.now()}_${file.name}`
  const { data, error } = await supabase.storage
    .from('business-licenses')
    .upload(`${orgId}/${fileName}`, file)

  if (error) throw error
  return data.path
}
```

### 4. 회원가입 프로세스

1. Auth 사용자 생성 (signUp)
2. 조직 생성 or 기존 조직 조회
3. Users 테이블에 사용자 정보 + organization_id 저장
4. 제조사인 경우 manufacturer_settings 자동 생성

---

## 🔄 Git Commit

```bash
git commit -m "feat(auth): Implement registration with organization logic"
```

---

## ⏭️ 다음: Phase 2.4 - 레이아웃 및 네비게이션
