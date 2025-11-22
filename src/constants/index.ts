/**
 * Constants - Central Export Point (SSOT)
 *
 * This is the Single Source of Truth for all application constants.
 * Import from here instead of individual files.
 *
 * Example:
 * import { VIRTUAL_CODE_STATUS, USER_ROLES, ROUTES } from '@/constants'
 */

// Status Constants
export * from './status'

// Role Constants
export * from './roles'

// Route Constants
export * from './routes'

// Message Constants
export * from './messages'

// Validation Constants
export * from './validation'

// Terminology Constants
export * from './terminology'

// Database Constants
export * from './database'

// Business Logic Constants
export * from './business-logic'

// Lock Constants
export * from './locks'

// Notification Constants
export * from './notifications'

// Feature Flags
export * from './featureFlags'

// Re-export commonly used constants for convenience
export {
  VIRTUAL_CODE_STATUS,
  ORGANIZATION_STATUS,
  PRODUCT_STATUS,
  SHIPMENT_STATUS,
  RETURN_STATUS,
  USER_STATUS,
  TREATMENT_STATUS,
} from './status'

export {
  USER_ROLES,
  ROLE_PERMISSIONS,
  ROLE_ROUTES,
} from './roles'

export {
  AUTH_ROUTES,
  MANUFACTURER_ROUTES,
  DISTRIBUTOR_ROUTES,
  HOSPITAL_ROUTES,
  ADMIN_ROUTES,
  API_ENDPOINTS,
} from './routes'

export {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CONFIRM_MESSAGES,
  INFO_MESSAGES,
} from './messages'

export {
  REGEX,
  PASSWORD_RULES,
  FILE_LIMITS,
  INPUT_LIMITS,
  VALIDATION,
  validate,
} from './validation'

export {
  ENTITIES,
  ACTIONS,
  STATUS_TERMS,
  LABELS,
  PAGE_TITLES,
  BUTTONS,
  getTerm,
} from './terminology'

export {
  TABLES,
  COLUMNS,
  DB_FUNCTIONS,
  RLS_POLICIES,
} from './database'

export {
  FIFO_SORTING,
  VIRTUAL_CODE_FORMAT,
  PHONE_FORMAT,
  RECALL_RULES,
  MANUFACTURER_DEFAULTS,
  ACTION_TYPES,
  TRANSACTION_DIRECTION,
} from './business-logic'

export {
  LOCK_TYPES,
  LOCK_TIMEOUTS,
  LOCK_RETRY,
} from './locks'

export {
  KAKAOTALK_TEMPLATE_IDS,
  AUTHENTICATION_MESSAGE_TEMPLATE,
  RECALL_MESSAGE_TEMPLATE,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
} from './notifications'

export {
  FEATURE_FLAGS,
  featureFlags,
  isFeatureEnabled,
  isMVPMode,
  isProductionMode,
} from './featureFlags'
