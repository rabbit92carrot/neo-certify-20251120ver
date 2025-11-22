/**
 * Business Logic Constants - SSOT for business rules
 * FIFO, Virtual Code, Recall, Manufacturer defaults
 */

// FIFO Sorting Rules
export const FIFO_SORTING = {
  PRIMARY: 'manufacture_date ASC',
  SECONDARY: 'expiry_date ASC',
  TERTIARY: 'sequence_number ASC',
  QUATERNARY: 'created_at ASC',
  FULL_ORDER_BY: 'manufacture_date ASC, expiry_date ASC, sequence_number ASC, created_at ASC',
} as const

// Virtual Code Generation
export const VIRTUAL_CODE_FORMAT = {
  LENGTH: 12,
  CHARACTER_SET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  GENERATION_METHOD: 'MD5 hash (first 12 chars)',
  EXAMPLE: 'A1B2C3D4E5F6',
} as const

// Phone Number Format
export const PHONE_FORMAT = {
  DISPLAY: '010-1234-5678',
  STORAGE: '01012345678', // Remove hyphens before storage
  HASH_METHOD: 'SHA256',
} as const

// Recall Rules
export const RECALL_RULES = {
  TIME_LIMIT_HOURS: 24,
  TIME_LIMIT_MS: 24 * 60 * 60 * 1000,
  ALLOWED_ROLES: ['HOSPITAL'],
  ALLOWED_STATUSES: ['USED'],
} as const

// Manufacturer Default Settings
export const MANUFACTURER_DEFAULTS = {
  LOT_PREFIX: 'ND',
  EXPIRY_MONTHS: 24,
  LOT_NUMBER_FORMAT: 'PREFIX-YYYYMMDD-SEQ',
  LOT_NUMBER_EXAMPLE: 'ND-20250122-001',
} as const

// Shipment Rules
export const SHIPMENT_RULES = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY_PER_SHIPMENT: 100000,
  ALLOWED_TRANSITIONS: {
    MANUFACTURER_TO_DISTRIBUTOR: true,
    DISTRIBUTOR_TO_HOSPITAL: true,
    DISTRIBUTOR_TO_DISTRIBUTOR: true, // Multi-tier distribution
    HOSPITAL_TO_DISTRIBUTOR: false, // Returns use different workflow
  },
} as const

// Treatment Rules
export const TREATMENT_RULES = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY_PER_TREATMENT: 100,
  REQUIRE_PATIENT_PHONE: true,
  ALLOW_MULTIPLE_PRODUCTS: true,
} as const

// Return Rules
export const RETURN_RULES = {
  MIN_REASON_LENGTH: 5,
  MAX_REASON_LENGTH: 500,
  ALLOWED_TRANSITIONS: {
    DISTRIBUTOR_TO_MANUFACTURER: true,
    HOSPITAL_TO_DISTRIBUTOR: true,
  },
} as const

// Disposal Rules
export const DISPOSAL_RULES = {
  ALLOWED_ROLES: ['HOSPITAL'],
  ALLOWED_STATUSES: ['IN_STOCK'],
  REVERSIBLE: false,
} as const

// Expiry Date Rules
export const EXPIRY_RULES = {
  WARNING_DAYS: 30,
  WARNING_MS: 30 * 24 * 60 * 60 * 1000,
  BLOCK_IF_EXPIRED: true,
  MIN_FUTURE_DAYS: 30,
} as const

// Inventory Aggregation
export const INVENTORY_GROUPING = {
  BY_PRODUCT: 'product_id',
  BY_LOT: 'lot_id',
  BY_STATUS: 'status',
  BY_EXPIRY_DATE: 'expiry_date',
} as const

// Transaction Action Types (for history table)
export const ACTION_TYPES = {
  LOT_PRODUCTION: 'LOT_PRODUCTION',
  SHIPMENT_OUT: 'SHIPMENT_OUT',
  SHIPMENT_IN: 'SHIPMENT_IN',
  TREATMENT: 'TREATMENT',
  RECALL: 'RECALL',
  RETURN_OUT: 'RETURN_OUT',
  RETURN_IN: 'RETURN_IN',
  DISPOSAL: 'DISPOSAL',
  REJECTION: 'REJECTION',
} as const

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES]

// Transaction Direction
export const TRANSACTION_DIRECTION = {
  IN: 'IN',
  OUT: 'OUT',
  INTERNAL: 'INTERNAL',
} as const

export type TransactionDirection =
  (typeof TRANSACTION_DIRECTION)[keyof typeof TRANSACTION_DIRECTION]
