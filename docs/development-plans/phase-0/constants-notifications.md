# SSOT 상수: notifications.ts

## 📋 개요

**목적**: 알림 메시지 템플릿 중앙 집중화 (카카오톡, 이메일, SMS 등 모든 알림 메시지)
**SSOT 원칙**: 알림 메시지 템플릿에 대한 단일 진실 공급원
**파일 위치**: `src/constants/notifications.ts`

---

## 🎯 포함 내용

1. **카카오톡 메시지 템플릿**: 정품 인증, 회수 알림
2. **이메일 템플릿** (Post-MVP)
3. **템플릿 포매팅 함수**: 변수 치환 헬퍼
4. **알림 타입 상수**: 알림 종류 enum

---

## 📝 파일 내용

**src/constants/notifications.ts**:
```typescript
/**
 * 알림 메시지 템플릿 상수
 * SSOT: 모든 알림 메시지 템플릿에 대한 단일 진실 공급원
 *
 * 포함 내용:
 * - 카카오톡 메시지 템플릿
 * - 템플릿 변수 정의
 * - 포매팅 헬퍼 함수
 *
 * PRD 참조: Section 10 (알림 메시지 명세)
 */

/**
 * 알림 타입
 */
export const NOTIFICATION_TYPE = {
  /**
   * 정품 인증 완료 알림
   */
  AUTHENTICATION: 'AUTHENTICATION',

  /**
   * 정품 인증 회수 알림
   */
  RECALL: 'RECALL',
} as const;

/**
 * 알림 타입 TypeScript 타입
 */
export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];

/**
 * 카카오톡 알림 템플릿
 *
 * 템플릿 변수 형식: {변수명}
 * 변수 치환: formatNotification() 함수 사용
 */
export const KAKAOTALK_TEMPLATES = {
  /**
   * 정품 인증 완료 메시지
   *
   * 전송 시점: 환자가 시술을 받고 병원이 Virtual Code를 사용한 직후
   *
   * 필수 변수:
   * - {treatmentDate}: 시술일 (YYYY-MM-DD 형식)
   * - {hospitalName}: 병원명
   * - {productName}: 제품명
   * - {quantity}: 수량
   * - {manufacturerName}: 제조사명
   *
   * PRD 참조: Section 10.1
   */
  [NOTIFICATION_TYPE.AUTHENTICATION]: {
    /**
     * 메시지 제목
     */
    TITLE: '[네오인증서] 정품 인증 완료',

    /**
     * 메시지 본문
     */
    BODY: `안녕하세요.
{treatmentDate}에 {hospitalName}에서 시술받으신
제품의 정품 인증이 완료되었습니다.

■ 시술 정보
- 제품: {productName} {quantity}개
- 제조사: {manufacturerName}
- 시술일: {treatmentDate}
- 시술 병원: {hospitalName}

본 제품은 정품임이 확인되었습니다.`,

    /**
     * 필수 변수 목록
     */
    REQUIRED_VARIABLES: [
      'treatmentDate',
      'hospitalName',
      'productName',
      'quantity',
      'manufacturerName',
    ] as const,
  },

  /**
   * 정품 인증 회수 알림
   *
   * 전송 시점: 병원이 시술 후 24시간 이내 Virtual Code 회수 시
   *
   * 필수 변수:
   * - {hospitalName}: 병원명
   * - {reason}: 회수 사유
   * - {productName}: 제품명
   * - {quantity}: 수량
   *
   * PRD 참조: Section 10.2
   */
  [NOTIFICATION_TYPE.RECALL]: {
    /**
     * 메시지 제목
     */
    TITLE: '[네오인증서] 정품 인증 회수 안내',

    /**
     * 메시지 본문
     */
    BODY: `안녕하세요.
{hospitalName}에서 발급한 정품 인증이
회수되었음을 안내드립니다.

■ 회수 정보
- 병원: {hospitalName}
- 회수 사유: {reason}
- 회수 제품: {productName} {quantity}개

문의사항은 해당 병원으로 연락해주세요.`,

    /**
     * 필수 변수 목록
     */
    REQUIRED_VARIABLES: [
      'hospitalName',
      'reason',
      'productName',
      'quantity',
    ] as const,
  },
} as const;

/**
 * 회수 사유 표준 텍스트
 *
 * UI 선택지 또는 기본값으로 사용
 */
export const RECALL_REASONS = {
  /**
   * 환자 요청
   */
  PATIENT_REQUEST: '환자 요청',

  /**
   * 시술 취소
   */
  TREATMENT_CANCELED: '시술 취소',

  /**
   * 잘못된 제품 사용
   */
  WRONG_PRODUCT: '잘못된 제품 사용',

  /**
   * 입력 오류
   */
  INPUT_ERROR: '입력 오류',

  /**
   * 기타 (사유 직접 입력)
   */
  OTHER: '기타',
} as const;

/**
 * 템플릿 변수 타입 정의
 */
export interface NotificationVariables {
  /**
   * 정품 인증 완료 알림 변수
   */
  [NOTIFICATION_TYPE.AUTHENTICATION]: {
    treatmentDate: string;
    hospitalName: string;
    productName: string;
    quantity: number;
    manufacturerName: string;
  };

  /**
   * 정품 인증 회수 알림 변수
   */
  [NOTIFICATION_TYPE.RECALL]: {
    hospitalName: string;
    reason: string;
    productName: string;
    quantity: number;
  };
}

/**
 * 템플릿 포매팅 함수
 *
 * @param template 원본 템플릿 문자열 ({변수명} 형식 포함)
 * @param variables 변수 객체 (key: 변수명, value: 치환 값)
 * @returns 변수가 치환된 최종 메시지
 *
 * @example
 * ```typescript
 * const message = formatNotification(
 *   KAKAOTALK_TEMPLATES.AUTHENTICATION.BODY,
 *   {
 *     treatmentDate: '2025-01-20',
 *     hospitalName: '서울성형외과',
 *     productName: '엘란쎄 M',
 *     quantity: 2,
 *     manufacturerName: '네오덤'
 *   }
 * );
 * ```
 */
export function formatNotification(
  template: string,
  variables: Record<string, string | number | boolean>
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => {
      // {변수명} 형식의 플레이스홀더를 실제 값으로 치환
      const placeholder = `{${key}}`;
      const replacement = String(value);
      return result.replace(new RegExp(placeholder, 'g'), replacement);
    },
    template
  );
}

/**
 * 필수 변수 검증 함수
 *
 * @param type 알림 타입
 * @param variables 제공된 변수 객체
 * @throws Error 필수 변수 누락 시
 *
 * @example
 * ```typescript
 * validateNotificationVariables(
 *   NOTIFICATION_TYPE.AUTHENTICATION,
 *   { treatmentDate: '2025-01-20', ... }
 * );
 * ```
 */
export function validateNotificationVariables(
  type: NotificationType,
  variables: Record<string, unknown>
): void {
  const template = KAKAOTALK_TEMPLATES[type];
  const requiredVars = template.REQUIRED_VARIABLES;

  const missingVars = requiredVars.filter(
    (varName) => !(varName in variables) || variables[varName] == null
  );

  if (missingVars.length > 0) {
    throw new Error(
      `알림 템플릿 필수 변수 누락: ${missingVars.join(', ')}`
    );
  }
}

/**
 * 완전한 알림 메시지 생성 함수
 *
 * @param type 알림 타입
 * @param variables 변수 객체
 * @returns 제목과 본문을 포함한 완전한 메시지
 *
 * @example
 * ```typescript
 * const { title, body } = createNotificationMessage(
 *   NOTIFICATION_TYPE.AUTHENTICATION,
 *   {
 *     treatmentDate: '2025-01-20',
 *     hospitalName: '서울성형외과',
 *     productName: '엘란쎄 M',
 *     quantity: 2,
 *     manufacturerName: '네오덤'
 *   }
 * );
 * ```
 */
export function createNotificationMessage<T extends NotificationType>(
  type: T,
  variables: NotificationVariables[T]
): { title: string; body: string } {
  // 필수 변수 검증
  validateNotificationVariables(type, variables as Record<string, unknown>);

  const template = KAKAOTALK_TEMPLATES[type];

  return {
    title: template.TITLE,
    body: formatNotification(
      template.BODY,
      variables as Record<string, string | number | boolean>
    ),
  };
}
```

---

## 🔧 사용 예시

### 1. 정품 인증 완료 알림 생성

```typescript
import {
  NOTIFICATION_TYPE,
  createNotificationMessage,
} from '@/constants/notifications';

// 시술 완료 후 알림 생성
const notificationData = {
  treatmentDate: '2025-01-20',
  hospitalName: '서울성형외과',
  productName: '엘란쎄 M',
  quantity: 2,
  manufacturerName: '네오덤',
};

const { title, body } = createNotificationMessage(
  NOTIFICATION_TYPE.AUTHENTICATION,
  notificationData
);

console.log(title);
// [네오인증서] 정품 인증 완료

console.log(body);
// 안녕하세요.
// 2025-01-20에 서울성형외과에서 시술받으신
// 제품의 정품 인증이 완료되었습니다.
//
// ■ 시술 정보
// - 제품: 엘란쎄 M 2개
// - 제조사: 네오덤
// - 시술일: 2025-01-20
// - 시술 병원: 서울성형외과
//
// 본 제품은 정품임이 확인되었습니다.
```

### 2. 회수 알림 생성

```typescript
import {
  NOTIFICATION_TYPE,
  RECALL_REASONS,
  createNotificationMessage,
} from '@/constants/notifications';

const recallData = {
  hospitalName: '서울성형외과',
  reason: RECALL_REASONS.INPUT_ERROR,
  productName: '엘란쎄 M',
  quantity: 1,
};

const { title, body } = createNotificationMessage(
  NOTIFICATION_TYPE.RECALL,
  recallData
);

console.log(body);
// 안녕하세요.
// 서울성형외과에서 발급한 정품 인증이
// 회수되었음을 안내드립니다.
//
// ■ 회수 정보
// - 병원: 서울성형외과
// - 회수 사유: 입력 오류
// - 회수 제품: 엘란쎄 M 1개
//
// 문의사항은 해당 병원으로 연락해주세요.
```

### 3. 카카오톡 API 전송 (Phase 6.6 Mock 연계)

```typescript
import { createNotificationMessage } from '@/constants/notifications';
import { sendKakaoTalkMessage } from '@/services/kakao';

async function sendAuthenticationNotification(
  patientPhone: string,
  data: NotificationVariables[typeof NOTIFICATION_TYPE.AUTHENTICATION]
) {
  const message = createNotificationMessage(
    NOTIFICATION_TYPE.AUTHENTICATION,
    data
  );

  await sendKakaoTalkMessage({
    to: patientPhone,
    title: message.title,
    body: message.body,
  });
}
```

### 4. 필수 변수 검증

```typescript
import {
  NOTIFICATION_TYPE,
  validateNotificationVariables,
} from '@/constants/notifications';

try {
  // 필수 변수 누락 시 에러 발생
  validateNotificationVariables(NOTIFICATION_TYPE.AUTHENTICATION, {
    treatmentDate: '2025-01-20',
    hospitalName: '서울성형외과',
    // productName, quantity, manufacturerName 누락
  });
} catch (error) {
  console.error(error.message);
  // 알림 템플릿 필수 변수 누락: productName, quantity, manufacturerName
}
```

### 5. UI 회수 사유 선택 드롭다운

```typescript
import { RECALL_REASONS } from '@/constants/notifications';

// React 컴포넌트 예시
const RecallReasonSelect = () => {
  const reasons = Object.values(RECALL_REASONS);

  return (
    <select name="recallReason">
      {reasons.map((reason) => (
        <option key={reason} value={reason}>
          {reason}
        </option>
      ))}
    </select>
  );
};
```

---

## 🔗 연계 시스템

### 1. Database 연계

```typescript
import { DATABASE_CONSTANTS } from '@/constants/database';
import { createNotificationMessage } from '@/constants/notifications';

// notification_messages 테이블에 저장
await supabase.from(DATABASE_CONSTANTS.TABLES.NOTIFICATION_MESSAGES).insert({
  type: NOTIFICATION_TYPE.AUTHENTICATION,
  patient_phone: patientPhone,
  content: message.body,
  is_sent: false,
});
```

### 2. Business Logic 연계 (Recall 규칙)

```typescript
import { RECALL_RULES } from '@/constants/business-logic';
import { NOTIFICATION_TYPE, createNotificationMessage } from '@/constants/notifications';

// 회수 가능 시간 내인지 확인 후 알림 전송
if (RECALL_RULES.isRecallable(treatmentDate)) {
  const message = createNotificationMessage(
    NOTIFICATION_TYPE.RECALL,
    recallData
  );

  await sendNotification(patientPhone, message);
} else {
  throw new Error('24시간 경과하여 회수할 수 없습니다.');
}
```

### 3. Phase 6.6 (KakaoTalk Mock) 연계

Mock 환경에서도 동일한 템플릿 사용:
```typescript
// services/kakao-mock.ts
import { KAKAOTALK_TEMPLATES } from '@/constants/notifications';

export function sendMockKakaoMessage(type: NotificationType, data: any) {
  const template = KAKAOTALK_TEMPLATES[type];
  console.log('[Mock KakaoTalk]', template.TITLE);
  console.log(formatNotification(template.BODY, data));
}
```

---

## ✅ 완료 기준

- [x] 카카오톡 알림 타입 정의 (AUTHENTICATION, RECALL)
- [x] 정품 인증 완료 템플릿 정의 (PRD Section 10.1)
- [x] 정품 인증 회수 템플릿 정의 (PRD Section 10.2)
- [x] 템플릿 변수 목록 명시
- [x] formatNotification() 함수 구현
- [x] validateNotificationVariables() 검증 함수 구현
- [x] createNotificationMessage() 통합 함수 구현
- [x] 회수 사유 표준 텍스트 정의
- [x] TypeScript 타입 정의 (NotificationType, NotificationVariables)
- [x] JSDoc 주석으로 모든 함수 설명
- [x] 사용 예시 5개 이상 제공
- [x] Phase 6.6 (KakaoTalk Mock) 연계 명시

---

## 🔗 관련 문서

- [PRD Section 10](../../neo-cert-prd-1.2.md) - 알림 메시지 명세
- [Phase 5 - Hospital Features](../phase-5/README.md) - 시술 등록 시 알림 전송
- [Phase 6.6 - KakaoTalk Mock](../phase-6/phase-6.6-mock-kakaotalk.md) - Mock 알림 구현
- [constants-database.md](./constants-database.md) - notification_messages 테이블
- [constants-business-logic.md](./constants-business-logic.md) - Recall 규칙 연계

---

## 📌 주의사항

### 1. 개인정보 보호
- 알림 메시지에는 **민감 정보 미포함** (Lot 번호, 제조일, 사용기한 제외)
- PRD Section 10.1 명시: "미포함 항목: Lot 번호, 사용기한, 제조일"

### 2. 템플릿 수정 시
- **반드시 PRD와 동기화** 필요
- `REQUIRED_VARIABLES` 배열도 함께 업데이트

### 3. 다국어 지원 (Post-MVP)
- 현재는 한국어만 지원
- 향후 `KAKAOTALK_TEMPLATES_EN` 등 추가 가능

### 4. 변수 치환 안전성
- `formatNotification()` 함수는 정규식 기반
- 변수명에 특수문자 사용 금지 (영문, 숫자만)

---

## 🚀 향후 확장 (Post-MVP)

### 1. 이메일 템플릿 추가
```typescript
export const EMAIL_TEMPLATES = {
  [NOTIFICATION_TYPE.AUTHENTICATION]: {
    SUBJECT: '네오인증서 - 정품 인증 완료',
    HTML_BODY: `<html>...</html>`,
  },
} as const;
```

### 2. SMS 템플릿 추가 (90바이트 제한)
```typescript
export const SMS_TEMPLATES = {
  [NOTIFICATION_TYPE.AUTHENTICATION]: {
    BODY: '[네오인증서] {hospitalName} 시술 정품 인증 완료',
  },
} as const;
```

### 3. 알림 채널 선택
```typescript
export const NOTIFICATION_CHANNEL = {
  KAKAOTALK: 'KAKAOTALK',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
} as const;
```
