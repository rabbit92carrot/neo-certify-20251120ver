# Phase 2.1: Supabase Auth 통합

## 📋 개요

**목표**: Supabase Auth 클라이언트 설정 및 AuthContext 구현
**선행 조건**: Phase 1 전체 완료
**예상 소요 시간**: 2-3시간

---

## 📦 작업 내용

### 1. Supabase 클라이언트 생성

**src/lib/supabase.ts**:
```typescript
import { createClient } from '@supabase/supabase-js'
import { ENV } from '@/config/env'
import type { Database } from '@/types/database'

export const supabase = createClient<Database>(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY
)
```

### 2. AuthContext 구현

**src/contexts/AuthContext.tsx**:
```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### 3. App에 적용

**src/App.tsx**:
```typescript
import { AuthProvider } from '@/contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      {/* 라우터 등 */}
    </AuthProvider>
  )
}
```

---

## 🔄 Git Commit

```bash
git add src/lib/supabase.ts src/contexts/AuthContext.tsx
git commit -m "feat(auth): Integrate Supabase Auth with AuthContext"
```

---

## ⏭️ 다음: Phase 2.2 - 로그인 UI
