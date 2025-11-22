/**
 * Concurrency Control - PostgreSQL Advisory Locks
 * Lock types and timeout configurations
 */

// Lock Types (PostgreSQL Advisory Lock IDs)
export const LOCK_TYPES = {
  SHIPMENT_TRANSACTION: 1001,
  LOT_PRODUCTION: 1002,
  VIRTUAL_CODE_ALLOCATION: 1003,
} as const

export type LockType = (typeof LOCK_TYPES)[keyof typeof LOCK_TYPES]

// Lock Timeout Settings (milliseconds)
export const LOCK_TIMEOUTS = {
  DEFAULT: 5000, // 5 seconds
  SHIPMENT: 10000, // 10 seconds (complex transaction)
  LOT_PRODUCTION: 5000, // 5 seconds
  QUICK_OPERATION: 2000, // 2 seconds
} as const

// Lock Retry Configuration
export const LOCK_RETRY = {
  MAX_ATTEMPTS: 3,
  DELAY_MS: 1000, // 1 second between retries
  EXPONENTIAL_BACKOFF: true,
} as const

// Lock Error Messages
export const LOCK_ERROR_MESSAGES = {
  TIMEOUT: '다른 사용자가 처리 중입니다. 잠시 후 다시 시도해주세요.',
  DEADLOCK: '동시 처리 충돌이 발생했습니다. 다시 시도해주세요.',
  MAX_RETRIES_EXCEEDED: '최대 재시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.',
} as const
