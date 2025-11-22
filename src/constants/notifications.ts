/**
 * Notification Templates - SSOT for KakaoTalk messages
 * Based on PRD Section 10
 */

// KakaoTalk Template IDs (to be provided by KakaoTalk API)
export const KAKAOTALK_TEMPLATE_IDS = {
  AUTHENTICATION: 'template_auth_001',
  RECALL: 'template_recall_001',
} as const

// Authentication Message Template
export interface AuthenticationMessageData {
  patientPhone: string // 환자 전화번호
  productName: string // 제품명
  lotNumber: string // Lot 번호
  virtualCodes: string // 가상 코드 목록 (쉼표 구분)
  treatmentDate: string // 시술일 (YYYY-MM-DD)
  hospitalName: string // 병원명
  verificationUrl: string // 인증 URL
}

export const AUTHENTICATION_MESSAGE_TEMPLATE = (data: AuthenticationMessageData) => `
[PDO 실 정품 인증]

안녕하세요, ${data.hospitalName}입니다.

${data.treatmentDate} 시술하신 PDO 실 제품의 정품 인증 정보입니다.

📦 제품 정보
- 제품명: ${data.productName}
- Lot 번호: ${data.lotNumber}
- 가상 식별코드: ${data.virtualCodes}

✅ 정품 인증 확인
아래 링크에서 제품의 정품 여부를 확인하실 수 있습니다.
${data.verificationUrl}

문의사항이 있으시면 병원으로 연락 부탁드립니다.

감사합니다.
`.trim()

// Recall Message Template
export interface RecallMessageData {
  patientPhone: string // 환자 전화번호
  productName: string // 제품명
  lotNumber: string // Lot 번호
  recallReason: string // 회수 사유
  hospitalName: string // 병원명
  hospitalPhone: string // 병원 전화번호
}

export const RECALL_MESSAGE_TEMPLATE = (data: RecallMessageData) => `
[긴급 제품 회수 안내]

안녕하세요, ${data.hospitalName}입니다.

귀하께서 시술받으신 PDO 실 제품에 대한 긴급 회수 안내입니다.

📦 대상 제품
- 제품명: ${data.productName}
- Lot 번호: ${data.lotNumber}

⚠️ 회수 사유
${data.recallReason}

📞 즉시 연락 요청
가능한 빠른 시일 내에 병원으로 연락 부탁드립니다.
병원 전화번호: ${data.hospitalPhone}

안전을 최우선으로 하겠습니다.

${data.hospitalName} 드림
`.trim()

// Mock KakaoTalk Display Data
export interface MockKakaoTalkMessage {
  id: string
  type: 'authentication' | 'recall'
  recipientPhone: string
  sentAt: string
  message: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
}

// Notification Status
export const NOTIFICATION_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
} as const

export type NotificationStatus =
  (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS]

// Notification Type
export const NOTIFICATION_TYPE = {
  AUTHENTICATION: 'AUTHENTICATION',
  RECALL: 'RECALL',
  SYSTEM: 'SYSTEM',
} as const

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE]
