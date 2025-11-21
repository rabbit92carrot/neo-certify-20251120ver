# Phase 6.6: Mock 카카오 알림톡 페이지

## 📋 Overview

**Phase 6.6**은 카카오 알림톡 발송을 시뮬레이션하는 Mock 페이지를 구현합니다. MVP 단계에서는 실제 카카오 API 연동 대신, 시스템에서 발송된 알림톡 메시지를 Mock UI로 표시하여 정품 인증 및 회수 알림 기능을 검증합니다.

---

## 🎯 Goals

1. 카카오톡 메시지 형태의 Mock UI 구현
2. 정품 인증 발급 메시지 표시
3. 회수 알림 메시지 표시
4. 메시지 발송 이력 스크롤 뷰
5. Supabase 스타일의 깔끔한 UI 디자인

---

## 📦 Technical Stack

- **UI**: React + TypeScript
- **컴포넌트**: shadcn/ui (Card, ScrollArea, Badge)
- **스타일링**: Tailwind CSS (Supabase-inspired)
- **데이터**: Supabase Realtime (notification_messages 테이블)
- **쿼리**: TanStack Query v5

---

## 📋 Work Content

### 1. MockKakaoTalkPage 컴포넌트

**파일 경로**: `src/pages/admin/MockKakaoTalkPage.tsx`

```typescript
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Phone, Bell, CheckCircle2, AlertCircle } from 'lucide-react'
import { NOTIFICATION_TYPE } from '@/constants/status'
import { formatDate, formatPhoneNumber } from '@/utils/format'
import type { NotificationMessage } from '@/types/database'

export function MockKakaoTalkPage() {
  const { data: messages, refetch } = useQuery({
    queryKey: ['mockKakaoMessages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data as NotificationMessage[]
    },
  })

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('notification_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_messages',
        },
        () => {
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">카카오 알림톡 Mock</h1>
        <p className="mt-2 text-sm text-gray-600">
          시스템에서 발송된 알림톡 메시지를 시뮬레이션합니다. (MVP 단계 - 실제 발송 없음)
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-500" />
              알림톡 메시지 피드
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              총 {messages?.length || 0}개 메시지
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {!messages || messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Bell className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">아직 발송된 메시지가 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y">
                {messages.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

### 2. MessageCard 컴포넌트

**파일 경로**: `src/components/mock-kakao/MessageCard.tsx`

```typescript
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react'
import { NOTIFICATION_TYPE } from '@/constants/status'
import { formatDate, formatPhoneNumber } from '@/utils/format'
import type { NotificationMessage } from '@/types/database'

interface MessageCardProps {
  message: NotificationMessage
}

export function MessageCard({ message }: MessageCardProps) {
  const isCertification = message.type === NOTIFICATION_TYPE.CERTIFICATION
  const isRecall = message.type === NOTIFICATION_TYPE.RECALL

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        {/* 카카오톡 프로필 아이콘 */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center">
            <span className="text-xl font-bold text-white">K</span>
          </div>
        </div>

        {/* 메시지 콘텐츠 */}
        <div className="flex-1 min-w-0">
          {/* 발신자 정보 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">네오인증서</span>
              {isCertification && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  정품 인증
                </Badge>
              )}
              {isRecall && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  회수 알림
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {formatDate(message.created_at, 'YYYY-MM-DD HH:mm')}
            </span>
          </div>

          {/* 수신자 정보 */}
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <Phone className="h-3.5 w-3.5" />
            <span>받는 사람: {formatPhoneNumber(message.patient_phone)}</span>
          </div>

          {/* 메시지 박스 (카카오톡 말풍선 스타일) */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
              {message.content}
            </pre>
          </div>

          {/* 발송 상태 (MVP는 항상 미발송) */}
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
            <span>미발송 (Mock 모드)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 3. Types 정의

**파일 경로**: `src/types/database.ts`

```typescript
export interface NotificationMessage {
  id: string
  type: 'CERTIFICATION' | 'RECALL'
  patient_phone: string
  content: string
  is_sent: boolean
  created_at: string
}
```

---

### 4. Constants 정의

**파일 경로**: `src/constants/status.ts`

```typescript
export const NOTIFICATION_TYPE = {
  CERTIFICATION: 'CERTIFICATION',
  RECALL: 'RECALL',
} as const

export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE]
```

---

### 5. 유틸리티 함수

**파일 경로**: `src/utils/format.ts`

```typescript
/**
 * 전화번호 포맷팅 (01012345678 -> 010-1234-5678)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`
  }

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }

  return phone
}

/**
 * 날짜 포맷팅
 */
export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD'): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
}
```

---

### 6. 라우트 추가

**파일 경로**: `src/routes/index.tsx` (또는 라우터 설정 파일)

```typescript
import { MockKakaoTalkPage } from '@/pages/admin/MockKakaoTalkPage'

// Admin Routes
{
  path: '/admin',
  element: <AdminLayout />,
  children: [
    // ... 기존 admin 라우트들
    {
      path: 'mock-kakao',
      element: <MockKakaoTalkPage />,
    },
  ],
}
```

---

### 7. 네비게이션 메뉴 추가

**파일 경로**: `src/components/layout/AdminSidebar.tsx`

```typescript
import { Bell } from 'lucide-react'

const adminMenuItems = [
  // ... 기존 메뉴들
  {
    title: '카카오 알림톡',
    path: '/admin/mock-kakao',
    icon: Bell,
  },
]
```

---

## 🧪 Test Scenarios

### Test 1: 메시지 목록 표시

**Given**: notification_messages 테이블에 데이터가 있을 때
**When**: Mock Kakao 페이지에 접근
**Then**:
- 메시지 목록이 최신순으로 표시됨
- 각 메시지에 타입별 Badge 표시 (정품 인증/회수 알림)
- 수신자 전화번호가 포맷팅되어 표시됨

---

### Test 2: Realtime 업데이트

**Given**: Mock Kakao 페이지가 열려 있을 때
**When**: 새로운 notification_message가 INSERT됨 (병원에서 사용 등록)
**Then**:
- 페이지가 자동으로 새로고침 없이 업데이트됨
- 새 메시지가 목록 상단에 표시됨

---

### Test 3: 빈 상태 표시

**Given**: notification_messages 테이블이 비어있을 때
**When**: Mock Kakao 페이지에 접근
**Then**:
- "아직 발송된 메시지가 없습니다" 메시지 표시
- 빈 상태 아이콘 표시

---

### Test 4: 메시지 포맷 검증 (정품 인증)

**Given**: 병원이 환자에게 제품 사용 등록
**When**: notification_message INSERT
**Then**:
- 메시지 내용이 PRD Section 10.1 형식과 일치
- 제품명, 수량, 제조사명, 시술일, 병원명 포함
- Lot 번호, 사용기한 미포함 (PRD 명시)

**예시 메시지**:
```
[네오인증서] 정품 인증 완료

안녕하세요.
2025-01-15에 서울대병원에서 시술받으신
제품의 정품 인증이 완료되었습니다.

■ 시술 정보
- 제품: 보톡스 2개
- 제조사: ABC제약
- 시술일: 2025-01-15
- 시술 병원: 서울대병원

본 제품은 정품임이 확인되었습니다.
```

---

### Test 5: 메시지 포맷 검증 (회수 알림)

**Given**: 병원이 24시간 내 회수 처리
**When**: notification_message INSERT (type: RECALL)
**Then**:
- 메시지 내용이 PRD Section 10.2 형식과 일치
- 병원명, 회수 사유, 제품명, 수량 포함

**예시 메시지**:
```
[네오인증서] 정품 인증 회수 안내

안녕하세요.
서울대병원에서 발급한 정품 인증이
회수되었음을 안내드립니다.

■ 회수 정보
- 병원: 서울대병원
- 회수 사유: 시술 취소
- 회수 제품: 보톡스 2개

문의사항은 해당 병원으로 연락해주세요.
```

---

### Test 6: 스크롤 성능

**Given**: 100개 이상의 메시지가 있을 때
**When**: 페이지 스크롤
**Then**:
- ScrollArea 컴포넌트가 부드럽게 스크롤됨
- 메시지 100개까지만 로드 (LIMIT)
- 추가 메시지는 페이지네이션 또는 무한 스크롤로 처리 (2차 개발)

---

## 🎨 UI Design (Supabase Style)

### 레이아웃 구조

```
┌─────────────────────────────────────────────┐
│  카카오 알림톡 Mock                         │
│  시스템에서 발송된 알림톡 메시지...         │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ 🔔 알림톡 메시지 피드    │ 총 15개 메시지│ │
│ ├─────────────────────────────────────────┤ │
│ │ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │ │
│ │ │ [K] 네오인증서   [✓ 정품 인증]       │ │ │
│ │ │     2025-01-15 14:23               │ │ │
│ │ │     📱 010-1234-5678               │ │ │
│ │ │     ┌────────────────────────┐     │ │ │
│ │ │     │ [네오인증서] 정품...   │     │ │ │
│ │ │     │ 안녕하세요...          │     │ │ │
│ │ │     └────────────────────────┘     │ │ │
│ │ │     ● 미발송 (Mock 모드)           │ │ │
│ │ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │ │
│ │                                         │ │
│ │ [추가 메시지들...]                      │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 색상 팔레트

- **배경**: `bg-gray-50` (페이지), `bg-white` (카드)
- **카카오 로고**: `bg-yellow-400` (카카오 브랜드 컬러)
- **정품 인증 Badge**: `bg-green-100 text-green-700`
- **회수 알림 Badge**: `bg-red-100 text-red-700`
- **메시지 박스**: `bg-white border-gray-200 shadow-sm`
- **Hover**: `hover:bg-gray-50`

### 타이포그래피

- **제목**: `text-3xl font-bold text-gray-900`
- **설명**: `text-sm text-gray-600`
- **메시지 내용**: `text-sm text-gray-800 leading-relaxed`
- **발송 상태**: `text-xs text-gray-500`

---

## 🔧 Implementation Steps

### Step 1: 타입 및 Constants 정의
```bash
# src/types/database.ts에 NotificationMessage 타입 추가
# src/constants/status.ts에 NOTIFICATION_TYPE 추가
```

### Step 2: 유틸리티 함수 구현
```bash
# src/utils/format.ts에 formatPhoneNumber, formatDate 추가
```

### Step 3: MessageCard 컴포넌트 구현
```bash
# src/components/mock-kakao/MessageCard.tsx 생성
# Supabase 스타일의 카드 디자인 적용
```

### Step 4: MockKakaoTalkPage 구현
```bash
# src/pages/admin/MockKakaoTalkPage.tsx 생성
# TanStack Query로 데이터 fetching
# Supabase Realtime 구독 설정
```

### Step 5: 라우팅 설정
```bash
# src/routes/index.tsx에 /admin/mock-kakao 라우트 추가
# src/components/layout/AdminSidebar.tsx에 메뉴 아이템 추가
```

### Step 6: 테스트 데이터 생성
```bash
# Supabase Studio에서 notification_messages에 샘플 데이터 INSERT
# 정품 인증 메시지 5개, 회수 알림 메시지 3개
```

---

## 📝 Database Integration

### notification_messages 테이블 활용

이 페이지는 **Phase 1.3에서 정의된 notification_messages 테이블**을 사용합니다:

```sql
-- notification_messages 테이블 (Phase 1.3에서 이미 생성됨)
CREATE TABLE notification_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('CERTIFICATION', 'RECALL')),
  patient_phone TEXT NOT NULL,
  content TEXT NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_notification_messages_created_at ON notification_messages(created_at DESC);
CREATE INDEX idx_notification_messages_patient_phone ON notification_messages(patient_phone);
```

### 메시지 생성 트리거 (Phase 5.3에서 구현됨)

병원이 환자에게 제품을 사용 등록할 때, 자동으로 notification_message가 생성됩니다:

```typescript
// Phase 5.3: HospitalUsagePage에서
const handleSubmitUsage = async (data: UsageFormData) => {
  // 1. Virtual Code 상태 업데이트 (IN_STOCK -> USED)
  // 2. History 기록 추가
  // 3. notification_messages INSERT

  const { error: notificationError } = await supabase
    .from('notification_messages')
    .insert({
      type: 'CERTIFICATION',
      patient_phone: data.patient_phone,
      content: generateCertificationMessage({
        productName: data.product_name,
        quantity: data.quantity,
        manufacturerName: data.manufacturer_name,
        usageDate: data.usage_date,
        hospitalName: currentUser.organization.name,
      }),
      is_sent: false, // MVP에서는 항상 false
    })
}
```

### 회수 알림 생성 (Phase 5.3에서 구현됨)

병원이 24시간 내 회수 처리할 때:

```typescript
const handleRecall = async (data: RecallFormData) => {
  // 1. Virtual Code 상태 업데이트 (USED -> IN_STOCK)
  // 2. History 기록 추가
  // 3. notification_messages INSERT (type: RECALL)

  const { error: notificationError } = await supabase
    .from('notification_messages')
    .insert({
      type: 'RECALL',
      patient_phone: data.patient_phone,
      content: generateRecallMessage({
        hospitalName: currentUser.organization.name,
        recallReason: data.recall_reason,
        productName: data.product_name,
        quantity: data.quantity,
      }),
      is_sent: false,
    })
}
```

---

## 🔨 Message Generation Functions

**파일 경로**: `src/utils/messageGenerator.ts`

```typescript
interface CertificationMessageParams {
  productName: string
  quantity: number
  manufacturerName: string
  usageDate: string
  hospitalName: string
}

export function generateCertificationMessage(params: CertificationMessageParams): string {
  const { productName, quantity, manufacturerName, usageDate, hospitalName } = params

  return `[네오인증서] 정품 인증 완료

안녕하세요.
${usageDate}에 ${hospitalName}에서 시술받으신
제품의 정품 인증이 완료되었습니다.

■ 시술 정보
- 제품: ${productName} ${quantity}개
- 제조사: ${manufacturerName}
- 시술일: ${usageDate}
- 시술 병원: ${hospitalName}

본 제품은 정품임이 확인되었습니다.`
}

interface RecallMessageParams {
  hospitalName: string
  recallReason: string
  productName: string
  quantity: number
}

export function generateRecallMessage(params: RecallMessageParams): string {
  const { hospitalName, recallReason, productName, quantity } = params

  return `[네오인증서] 정품 인증 회수 안내

안녕하세요.
${hospitalName}에서 발급한 정품 인증이
회수되었음을 안내드립니다.

■ 회수 정보
- 병원: ${hospitalName}
- 회수 사유: ${recallReason}
- 회수 제품: ${productName} ${quantity}개

문의사항은 해당 병원으로 연락해주세요.`
}
```

---

## ✅ Definition of Done

- [ ] MockKakaoTalkPage 컴포넌트 구현 완료
- [ ] MessageCard 컴포넌트 구현 완료 (Supabase 스타일)
- [ ] notification_messages 테이블 연동 완료
- [ ] Supabase Realtime 구독 설정 완료
- [ ] 정품 인증 메시지 포맷 PRD 10.1 일치
- [ ] 회수 알림 메시지 포맷 PRD 10.2 일치
- [ ] 전화번호 포맷팅 유틸리티 구현
- [ ] 날짜 포맷팅 유틸리티 구현
- [ ] Admin 사이드바에 메뉴 추가
- [ ] /admin/mock-kakao 라우트 설정 완료
- [ ] 6개 테스트 시나리오 통과
- [ ] Supabase 스타일 가이드 준수 (색상, 간격, 타이포)
- [ ] 반응형 디자인 (768px 이상)
- [ ] ScrollArea 성능 최적화 (100개 메시지)
- [ ] 코드 리뷰 통과
- [ ] Git commit (conventional commit 형식)

---

## 🚀 Next Steps

Phase 6.6 완료 후:

1. **Phase 5.3 수정**: HospitalUsagePage에서 notification_messages INSERT 로직 추가
2. **Phase 7**: 통합 테스트 시 Mock Kakao 페이지 검증
3. **2차 개발**: 실제 카카오 알림톡 API 연동

---

## 📚 References

- **PRD Section 10**: 알림톡 메시지 정의
- **PRD Section 7.1**: MVP 기능 - 카카오 알림톡 Mock 페이지
- **PRD Section 9**: URL 라우팅 - /mock/kakao
- **Phase 1.3**: notification_messages 테이블 스키마
- **Phase 5.3**: 병원 사용 등록 및 회수 기능
- **shadcn/ui ScrollArea**: https://ui.shadcn.com/docs/components/scroll-area
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime

---

## 🔄 Git Commit Template

```bash
git add .
git commit -m "feat(admin): Implement Mock KakaoTalk page with Supabase style

- Add MockKakaoTalkPage component with realtime subscription
- Add MessageCard component with certification/recall badges
- Implement message generation utilities (PRD Section 10)
- Add phone number and date formatting utilities
- Integrate with notification_messages table
- Add /admin/mock-kakao route and sidebar menu
- Apply Supabase-inspired UI design (Card, ScrollArea, Badge)
- Support realtime updates for new messages
- Display up to 100 messages with scroll optimization

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 💡 Troubleshooting

### 문제 1: Realtime 구독이 작동하지 않음

**증상**: 새 메시지 INSERT 시 자동 업데이트 안 됨

**해결**:
```typescript
// Supabase Studio에서 Realtime 활성화 확인
// Database > Replication > notification_messages 테이블 활성화

// 또는 SQL로 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE notification_messages;
```

---

### 문제 2: 전화번호 포맷이 깨짐

**증상**: "01012345678"이 "010-1234-5678"로 표시 안 됨

**해결**:
```typescript
// formatPhoneNumber 함수 검증
console.log(formatPhoneNumber('01012345678')) // "010-1234-5678"

// DB에 하이픈 포함 저장된 경우
export function formatPhoneNumber(phone: string): string {
  // 먼저 모든 비숫자 제거
  const cleaned = phone.replace(/\D/g, '')
  // ... 나머지 로직
}
```

---

### 문제 3: 메시지 내용이 줄바꿈 안 됨

**증상**: 메시지가 한 줄로 표시됨

**해결**:
```tsx
// pre 태그와 whitespace-pre-wrap 클래스 사용
<pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
  {message.content}
</pre>
```

---

### 문제 4: ScrollArea 높이가 맞지 않음

**증상**: 스크롤이 안 되거나 높이가 이상함

**해결**:
```tsx
// 고정 높이 설정
<ScrollArea className="h-[600px]">
  {/* 콘텐츠 */}
</ScrollArea>

// 또는 동적 높이 (calc 사용)
<ScrollArea className="h-[calc(100vh-200px)]">
  {/* 콘텐츠 */}
</ScrollArea>
```

---

**Phase 6.6 문서 종료**
