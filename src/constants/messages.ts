/**
 * User Messages - SSOT for all UI messages
 * Error, Success, Confirmation messages with template support
 */

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  EMAIL_ALREADY_EXISTS: '이미 등록된 이메일입니다.',
  WEAK_PASSWORD: '비밀번호는 최소 8자 이상이어야 합니다.',
  UNAUTHORIZED: '로그인이 필요합니다.',
  FORBIDDEN: '접근 권한이 없습니다.',

  // Validation
  REQUIRED_FIELD: '필수 입력 항목입니다.',
  INVALID_EMAIL: '올바른 이메일 형식이 아닙니다.',
  INVALID_PHONE: '올바른 전화번호 형식이 아닙니다.',
  INVALID_FILE_SIZE: '파일 크기는 10MB를 초과할 수 없습니다.',
  INVALID_FILE_TYPE: '허용되지 않는 파일 형식입니다.',

  // Business Logic
  INSUFFICIENT_STOCK: '재고가 부족합니다.',
  RECALL_TIME_EXCEEDED: '회수 가능 시간(24시간)이 초과되었습니다.',
  DUPLICATE_VIRTUAL_CODE: '중복된 가상 식별코드가 있습니다.',
  INVALID_LOT_NUMBER: '올바르지 않은 Lot 번호입니다.',
  EXPIRED_PRODUCT: '유통기한이 지난 제품입니다.',

  // Network
  NETWORK_ERROR: '네트워크 오류가 발생했습니다. 다시 시도해주세요.',
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  TIMEOUT: '요청 시간이 초과되었습니다.',

  // General
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
  NOT_FOUND: '요청한 데이터를 찾을 수 없습니다.',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: '로그인되었습니다.',
  LOGOUT_SUCCESS: '로그아웃되었습니다.',
  REGISTER_SUCCESS: '회원가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.',

  // Products
  PRODUCT_CREATED: '제품이 등록되었습니다.',
  PRODUCT_UPDATED: '제품 정보가 수정되었습니다.',
  PRODUCT_DELETED: '제품이 삭제되었습니다.',

  // Lot Production
  LOT_PRODUCED: 'Lot 생산이 완료되었습니다.',

  // Shipment
  SHIPMENT_CREATED: '출하가 완료되었습니다.',
  SHIPMENT_ACCEPTED: '입고가 승인되었습니다.',
  SHIPMENT_REJECTED: '입고가 거부되었습니다.',

  // Treatment
  TREATMENT_REGISTERED: '시술이 등록되었습니다.',
  RECALL_COMPLETED: '제품 회수가 완료되었습니다.',

  // Returns
  RETURN_REQUESTED: '반품 요청이 완료되었습니다.',
  RETURN_APPROVED: '반품이 승인되었습니다.',
  RETURN_REJECTED: '반품이 거부되었습니다.',

  // Disposal
  DISPOSAL_COMPLETED: '제품 폐기가 완료되었습니다.',

  // Admin
  ORGANIZATION_APPROVED: '조직이 승인되었습니다.',
  ORGANIZATION_REJECTED: '조직이 거부되었습니다.',
  USER_UPDATED: '사용자 정보가 수정되었습니다.',

  // General
  SAVED: '저장되었습니다.',
  DELETED: '삭제되었습니다.',
} as const

// Confirmation Messages
export const CONFIRM_MESSAGES = {
  DELETE_PRODUCT: '이 제품을 삭제하시겠습니까?',
  CREATE_SHIPMENT: '출하를 진행하시겠습니까?',
  ACCEPT_SHIPMENT: '입고를 승인하시겠습니까?',
  REJECT_SHIPMENT: '입고를 거부하시겠습니까? (제조사로 반품됩니다)',
  REGISTER_TREATMENT: '시술을 등록하시겠습니까?',
  RECALL_PRODUCT: '제품을 회수하시겠습니까? (24시간 이내만 가능)',
  REQUEST_RETURN: '반품 요청을 하시겠습니까?',
  APPROVE_RETURN: '반품을 승인하시겠습니까?',
  REJECT_RETURN: '반품을 거부하시겠습니까?',
  DISPOSE_PRODUCT: '제품을 폐기하시겠습니까? (되돌릴 수 없습니다)',
  APPROVE_ORGANIZATION: '이 조직을 승인하시겠습니까?',
  REJECT_ORGANIZATION: '이 조직을 거부하시겠습니까?',
  LOGOUT: '로그아웃하시겠습니까?',
} as const

// Info Messages
export const INFO_MESSAGES = {
  LOADING: '로딩 중...',
  NO_DATA: '데이터가 없습니다.',
  EMPTY_CART: '장바구니가 비어있습니다.',
  SELECT_PRODUCT: '제품을 선택해주세요.',
  ENTER_QUANTITY: '수량을 입력해주세요.',
  PENDING_APPROVAL: '관리자 승인 대기 중입니다.',
  AUTO_LOGOUT_SOON: '30분 동안 활동이 없어 곧 자동 로그아웃됩니다.',
} as const

// Template Messages (with placeholders)
export const TEMPLATE_MESSAGES = {
  ITEMS_SELECTED: (count: number) => `${count}개 항목이 선택되었습니다.`,
  STOCK_REMAINING: (count: number) => `재고: ${count}개`,
  DAYS_UNTIL_EXPIRY: (days: number) => `유통기한 ${days}일 남음`,
  RECALL_TIME_REMAINING: (hours: number) => `회수 가능 시간: ${hours}시간 남음`,
  FILE_SIZE_EXCEEDED: (size: number) => `파일 크기가 ${size}MB를 초과합니다.`,
} as const
