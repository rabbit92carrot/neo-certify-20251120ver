# Phase 2.2: 로그인 UI

## 📋 개요

**목표**: 로그인, 비밀번호 찾기/재설정 페이지 구현
**선행 조건**: Phase 2.1 (Auth 설정) 완료
**예상 소요 시간**: 3-4시간

---

## 📦 주요 컴포넌트

### 1. 로그인 페이지

**src/pages/auth/LoginPage.tsx**:
- React Hook Form + Zod validation
- 이메일/비밀번호 입력
- 에러 처리 (ERROR_MESSAGES 사용)
- 로그인 성공 시 역할별 리다이렉트

### 2. 비밀번호 찾기

**src/pages/auth/ForgotPasswordPage.tsx**:
- 이메일 입력
- Supabase resetPasswordForEmail 호출

### 3. 비밀번호 재설정

**src/pages/auth/ResetPasswordPage.tsx**:
- 새 비밀번호 입력 (최소 6자)
- Supabase updateUser 호출

---

## 🔄 Git Commit

```bash
git commit -m "feat(auth): Implement login and password reset UI"
```

---

## ⏭️ 다음: Phase 2.3 - 회원가입 UI
