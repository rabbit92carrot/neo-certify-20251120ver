/**
 * Validation Rules and Regex Patterns - SSOT
 * All validation constants in one place
 */

// Regex Patterns
export const REGEX = {
  // Email (RFC 5322 compliant)
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Password (min 8 chars, at least 1 letter and 1 number)
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,

  // Phone Number (Korean format: 010-1234-5678 or 01012345678)
  PHONE_KR: /^(01[016789])-?(\d{3,4})-?(\d{4})$/,

  // Business Registration Number (10 digits: 123-45-67890)
  BUSINESS_NUMBER: /^\d{3}-?\d{2}-?\d{5}$/,

  // Virtual Code (12 alphanumeric characters)
  VIRTUAL_CODE: /^[A-Z0-9]{12}$/,

  // Lot Number (configurable pattern, default: ND-YYYYMMDD-001)
  LOT_NUMBER: /^[A-Z]{2}-\d{8}-\d{3}$/,

  // Product Code (alphanumeric, 6-20 chars)
  PRODUCT_CODE: /^[A-Z0-9]{6,20}$/,

  // Korean Name (Korean characters only)
  KOREAN_NAME: /^[가-힣]{2,20}$/,

  // Alphanumeric only
  ALPHANUMERIC: /^[A-Za-z0-9]+$/,

  // Numbers only
  NUMBERS_ONLY: /^\d+$/,
} as const

// Password Policy
export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 100,
  REQUIRE_LETTER: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: false,
  REQUIRE_UPPERCASE: false,
} as const

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
} as const

// Input Length Limits
export const INPUT_LIMITS = {
  ORGANIZATION_NAME: { min: 2, max: 100 },
  PRODUCT_NAME: { min: 2, max: 100 },
  PRODUCT_CODE: { min: 6, max: 20 },
  LOT_NUMBER: { min: 10, max: 20 },
  VIRTUAL_CODE: { min: 12, max: 12 },
  PHONE: { min: 10, max: 13 },
  EMAIL: { min: 5, max: 100 },
  PASSWORD: { min: 8, max: 100 },
  ADDRESS: { min: 5, max: 200 },
  RETURN_REASON: { min: 5, max: 500 },
  NOTES: { min: 0, max: 1000 },
} as const

// Business Rules
export const VALIDATION = {
  // Virtual Code
  VIRTUAL_CODE_LENGTH: 12,
  VIRTUAL_CODE_FORMAT: 'MD5 hash (12 chars)',

  // Recall
  RECALL_TIME_LIMIT_HOURS: 24,

  // Expiry Warning
  EXPIRY_WARNING_DAYS: 30,

  // Quantity
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 1000000,

  // Lot Production
  MIN_LOT_QUANTITY: 1,
  MAX_LOT_QUANTITY: 1000000,

  // Shipment
  MIN_SHIPMENT_QUANTITY: 1,
  MAX_SHIPMENT_QUANTITY: 100000,

  // Treatment
  MIN_TREATMENT_QUANTITY: 1,
  MAX_TREATMENT_QUANTITY: 100,

  // Return Reason Min Length
  RETURN_REASON_MIN_LENGTH: 5,

  // Auto Logout (minutes)
  AUTO_LOGOUT_MINUTES: 30,

  // Session Timeout (milliseconds)
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
} as const

// Date Validation
export const DATE_VALIDATION = {
  // Minimum future date for expiry (days from now)
  MIN_EXPIRY_DAYS: 30,

  // Maximum future date for expiry (years from now)
  MAX_EXPIRY_YEARS: 5,

  // Date format
  DATE_FORMAT: 'yyyy-MM-dd',
  DATETIME_FORMAT: 'yyyy-MM-dd HH:mm:ss',
  DISPLAY_DATE_FORMAT: 'yyyy년 MM월 dd일',
  DISPLAY_DATETIME_FORMAT: 'yyyy년 MM월 dd일 HH:mm',
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const

// Time Conversions (to eliminate magic numbers)
export const TIME_CONVERSIONS = {
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_WEEK: 7,
  DAYS_PER_MONTH: 30, // Average
  DAYS_PER_YEAR: 365,
  MONTHS_PER_YEAR: 12,
} as const

// Validation Helper Functions
export const validate = {
  email: (email: string): boolean => REGEX.EMAIL.test(email),
  password: (password: string): boolean => REGEX.PASSWORD.test(password),
  phone: (phone: string): boolean => REGEX.PHONE_KR.test(phone),
  virtualCode: (code: string): boolean => REGEX.VIRTUAL_CODE.test(code),
  lotNumber: (lot: string): boolean => REGEX.LOT_NUMBER.test(lot),
  businessNumber: (num: string): boolean => REGEX.BUSINESS_NUMBER.test(num),
}
