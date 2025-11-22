/**
 * Terminology - SSOT for all UI terms (Korean/English)
 * Ensures consistent naming across the application
 */

// Entity Names
export const ENTITIES = {
  // Korean
  PRODUCT: '제품 종류',
  LOT: 'Lot',
  VIRTUAL_CODE: '가상 식별코드',
  ORGANIZATION: '조직',
  MANUFACTURER: '제조사',
  DISTRIBUTOR: '유통사',
  HOSPITAL: '병원',
  ADMIN: '관리자',
  USER: '사용자',
  PATIENT: '환자',
  SHIPMENT: '출하',
  TREATMENT: '시술',
  RETURN: '반품',
  RECALL: '회수',
  DISPOSAL: '폐기',
  INVENTORY: '재고',
  HISTORY: '거래 내역',

  // English
  PRODUCT_EN: 'Product Type',
  LOT_EN: 'Lot',
  VIRTUAL_CODE_EN: 'Virtual Code',
  ORGANIZATION_EN: 'Organization',
  MANUFACTURER_EN: 'Manufacturer',
  DISTRIBUTOR_EN: 'Distributor',
  HOSPITAL_EN: 'Hospital',
  ADMIN_EN: 'Admin',
  USER_EN: 'User',
  PATIENT_EN: 'Patient',
  SHIPMENT_EN: 'Shipment',
  TREATMENT_EN: 'Treatment',
  RETURN_EN: 'Return',
  RECALL_EN: 'Recall',
  DISPOSAL_EN: 'Disposal',
  INVENTORY_EN: 'Inventory',
  HISTORY_EN: 'History',
} as const

// Action Verbs
export const ACTIONS = {
  CREATE: '등록',
  READ: '조회',
  UPDATE: '수정',
  DELETE: '삭제',
  APPROVE: '승인',
  REJECT: '거부',
  ACCEPT: '승인',
  PRODUCE: '생산',
  SHIP: '출하',
  RECEIVE: '입고',
  RETURN: '반품',
  RECALL: '회수',
  DISPOSE: '폐기',
  REGISTER: '등록',
  SEARCH: '검색',
  FILTER: '필터',
  EXPORT: '내보내기',
  PRINT: '인쇄',
  DOWNLOAD: '다운로드',
  UPLOAD: '업로드',
  SAVE: '저장',
  CANCEL: '취소',
  CONFIRM: '확인',
  SUBMIT: '제출',
  RESET: '초기화',
  LOGIN: '로그인',
  LOGOUT: '로그아웃',
  SIGNUP: '회원가입',
} as const

// Status Terms
export const STATUS_TERMS = {
  PENDING: '대기 중',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  APPROVED: '승인됨',
  REJECTED: '거부됨',
  ACTIVE: '활성',
  INACTIVE: '비활성',
  IN_STOCK: '재고',
  OUT_OF_STOCK: '품절',
  USED: '사용 완료',
  RETURNED: '반품됨',
  RECALLED: '회수됨',
  DISPOSED: '폐기됨',
} as const

// Field Labels
export const LABELS = {
  // Common
  NAME: '이름',
  CODE: '코드',
  TYPE: '종류',
  STATUS: '상태',
  DATE: '날짜',
  TIME: '시간',
  QUANTITY: '수량',
  PRICE: '가격',
  TOTAL: '합계',
  DESCRIPTION: '설명',
  NOTES: '비고',
  REASON: '사유',
  CREATED_AT: '등록일시',
  UPDATED_AT: '수정일시',
  CREATED_BY: '등록자',

  // User & Auth
  EMAIL: '이메일',
  PASSWORD: '비밀번호',
  PASSWORD_CONFIRM: '비밀번호 확인',
  PHONE: '전화번호',
  ADDRESS: '주소',
  ROLE: '역할',

  // Organization
  ORGANIZATION_NAME: '조직명',
  BUSINESS_NUMBER: '사업자등록번호',
  BUSINESS_LICENSE: '사업자등록증',
  REPRESENTATIVE: '대표자',

  // Product
  PRODUCT_NAME: '제품명',
  PRODUCT_CODE: '제품 코드',
  PRODUCT_TYPE: '제품 종류',
  MANUFACTURER_NAME: '제조사명',

  // Lot
  LOT_NUMBER: 'Lot 번호',
  LOT_PREFIX: 'Lot 접두사',
  MANUFACTURE_DATE: '제조일자',
  EXPIRY_DATE: '사용기한',
  EXPIRY_MONTHS: '사용기한 (개월)',

  // Virtual Code
  VIRTUAL_CODE: '가상 식별코드',
  VIRTUAL_CODE_COUNT: '가상 코드 수',

  // Shipment
  SHIPMENT_DATE: '출하일',
  SENDER: '발신자',
  RECEIVER: '수신자',
  SHIPPING_QUANTITY: '출하 수량',
  RECEIVED_QUANTITY: '입고 수량',

  // Treatment
  TREATMENT_DATE: '시술일',
  PATIENT_PHONE: '환자 전화번호',
  TREATMENT_QUANTITY: '시술 수량',

  // Inventory
  AVAILABLE_STOCK: '가용 재고',
  PENDING_STOCK: '입고 대기',
  TOTAL_STOCK: '전체 재고',

  // Return
  RETURN_DATE: '반품일',
  RETURN_REASON: '반품 사유',
  RETURN_QUANTITY: '반품 수량',

  // Settings
  SETTINGS: '설정',
  MANUFACTURER_SETTINGS: '제조사 설정',
  DEFAULT_LOT_PREFIX: '기본 Lot 접두사',
  DEFAULT_EXPIRY_MONTHS: '기본 사용기한 (개월)',
} as const

// Page Titles
export const PAGE_TITLES = {
  // Auth
  LOGIN: '로그인',
  REGISTER: '회원가입',
  FORGOT_PASSWORD: '비밀번호 찾기',

  // Manufacturer
  MANUFACTURER_DASHBOARD: '제조사 대시보드',
  PRODUCT_LIST: '제품 목록',
  PRODUCT_CREATE: '제품 등록',
  PRODUCT_EDIT: '제품 수정',
  LOT_PRODUCTION: 'Lot 생산',
  MANUFACTURER_SHIPMENT: '출하 관리',
  MANUFACTURER_INVENTORY: '재고 조회',
  MANUFACTURER_HISTORY: '거래 내역',
  MANUFACTURER_SETTINGS: '제조사 설정',

  // Distributor
  DISTRIBUTOR_DASHBOARD: '유통사 대시보드',
  DISTRIBUTOR_RECEIVING: '입고 관리',
  DISTRIBUTOR_INVENTORY: '재고 조회',
  HOSPITAL_SHIPMENT: '병원 출하',
  DISTRIBUTOR_RETURNS: '반품 관리',
  DISTRIBUTOR_HISTORY: '거래 내역',

  // Hospital
  HOSPITAL_DASHBOARD: '병원 대시보드',
  TREATMENT_REGISTRATION: '시술 등록',
  RECALL_MANAGEMENT: '회수 관리',
  HOSPITAL_RECEIVING: '입고 내역',
  HOSPITAL_INVENTORY: '재고 조회',
  HOSPITAL_RETURN: '반품 요청',
  DISPOSAL_MANAGEMENT: '폐기 관리',
  HOSPITAL_HISTORY: '거래 내역',

  // Admin
  ADMIN_DASHBOARD: '관리자 대시보드',
  ORGANIZATION_MANAGEMENT: '조직 관리',
  USER_MANAGEMENT: '사용자 관리',
  PRODUCT_MASTER: '제품 마스터 관리',
  SYSTEM_MONITORING: '시스템 모니터링',

  // Mock
  MOCK_KAKAOTALK: 'Mock KakaoTalk',
} as const

// Button Labels
export const BUTTONS = {
  SUBMIT: '제출',
  SAVE: '저장',
  CANCEL: '취소',
  DELETE: '삭제',
  EDIT: '수정',
  CREATE: '등록',
  SEARCH: '검색',
  RESET: '초기화',
  APPROVE: '승인',
  REJECT: '거부',
  ACCEPT: '승인',
  RETURN: '반품',
  RECALL: '회수',
  DISPOSE: '폐기',
  DOWNLOAD: '다운로드',
  UPLOAD: '업로드',
  EXPORT: '내보내기',
  PRINT: '인쇄',
  ADD_TO_CART: '장바구니 담기',
  CHECKOUT: '출하하기',
  LOGIN: '로그인',
  LOGOUT: '로그아웃',
  SIGNUP: '회원가입',
  BACK: '뒤로',
  NEXT: '다음',
  PREVIOUS: '이전',
  CLOSE: '닫기',
  CONFIRM: '확인',
  VIEW_DETAILS: '상세보기',
} as const

// Table Headers
export const TABLE_HEADERS = {
  NO: '번호',
  ACTIONS: '작업',
  STATUS: '상태',
  DATE: '날짜',
  CREATED_AT: '등록일시',
} as const

// Utility Function: Get term by key
export function getTerm(key: string): string {
  const allTerms = { ...ENTITIES, ...ACTIONS, ...STATUS_TERMS, ...LABELS, ...PAGE_TITLES, ...BUTTONS, ...TABLE_HEADERS }
  return allTerms[key as keyof typeof allTerms] || key
}
