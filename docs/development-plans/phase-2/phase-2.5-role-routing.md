# Phase 2.5: 역할 기반 라우팅

## 📋 개요

**목표**: Protected Route 및 역할별 권한 검증 구현
**선행 조건**: Phase 2.4 (레이아웃) 완료
**예상 소요 시간**: 2-3시간

---

## 📦 작업 내용

### 1. ProtectedRoute 컴포넌트

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const { data: userRole } = useUserRole(user?.id)

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" />

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" />
  }

  return <>{children}</>
}
```

### 2. React Router 설정

```typescript
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />

  <Route path="/manufacturer/*" element={
    <ProtectedRoute allowedRoles={[USER_ROLES.MANUFACTURER]}>
      <ManufacturerLayout />
    </ProtectedRoute>
  } />

  <Route path="/distributor/*" element={
    <ProtectedRoute allowedRoles={[USER_ROLES.DISTRIBUTOR]}>
      <DistributorLayout />
    </ProtectedRoute>
  } />

  {/* ... */}
</Routes>
```

### 3. 역할별 리다이렉트

```typescript
// 로그인 성공 시
const redirectAfterLogin = (role: UserRole) => {
  switch (role) {
    case USER_ROLES.MANUFACTURER:
      return '/manufacturer/dashboard'
    case USER_ROLES.DISTRIBUTOR:
      return '/distributor/dashboard'
    case USER_ROLES.HOSPITAL:
      return '/hospital/dashboard'
    case USER_ROLES.ADMIN:
      return '/admin/dashboard'
  }
}
```

---

## 🔄 Git Commit

```bash
git commit -m "feat(routing): Implement role-based routing and protected routes"
```

---

## ✔️ Phase 2 완료!

**다음**: [Phase 3.1 - 제품 목록 UI](../phase-3/phase-3.1-product-list.md)
