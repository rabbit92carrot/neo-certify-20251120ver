/**
 * Status Constants - SSOT for all status values
 * All status enums and related UI labels
 */

// Virtual Code Status
export const VIRTUAL_CODE_STATUS = {
  PENDING: 'PENDING',
  IN_STOCK: 'IN_STOCK',
  USED: 'USED',
  RETURNED: 'RETURNED',
  DISPOSED: 'DISPOSED',
  RECALLED: 'RECALLED',
} as const

export type VirtualCodeStatus = (typeof VIRTUAL_CODE_STATUS)[keyof typeof VIRTUAL_CODE_STATUS]

// Organization Status
export const ORGANIZATION_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  REJECTED: 'REJECTED',
} as const

export type OrganizationStatus =
  (typeof ORGANIZATION_STATUS)[keyof typeof ORGANIZATION_STATUS]

// Product Status
export const PRODUCT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS]

// Shipment Status
export const SHIPMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const

export type ShipmentStatus = (typeof SHIPMENT_STATUS)[keyof typeof SHIPMENT_STATUS]

// Return Request Status
export const RETURN_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const

export type ReturnStatus = (typeof RETURN_STATUS)[keyof typeof RETURN_STATUS]

// User Status
export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS]

// Treatment Status
export const TREATMENT_STATUS = {
  COMPLETED: 'COMPLETED',
  RECALLED: 'RECALLED',
} as const

export type TreatmentStatus = (typeof TREATMENT_STATUS)[keyof typeof TREATMENT_STATUS]

// === UI Labels (Korean) ===

export const VIRTUAL_CODE_STATUS_LABELS: Record<VirtualCodeStatus, string> = {
  [VIRTUAL_CODE_STATUS.PENDING]: '입고 대기',
  [VIRTUAL_CODE_STATUS.IN_STOCK]: '재고',
  [VIRTUAL_CODE_STATUS.USED]: '사용 완료',
  [VIRTUAL_CODE_STATUS.RETURNED]: '반품',
  [VIRTUAL_CODE_STATUS.DISPOSED]: '폐기',
  [VIRTUAL_CODE_STATUS.RECALLED]: '회수',
}

export const ORGANIZATION_STATUS_LABELS: Record<OrganizationStatus, string> = {
  [ORGANIZATION_STATUS.PENDING]: '승인 대기',
  [ORGANIZATION_STATUS.ACTIVE]: '활성',
  [ORGANIZATION_STATUS.INACTIVE]: '비활성',
  [ORGANIZATION_STATUS.REJECTED]: '거부됨',
}

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  [PRODUCT_STATUS.ACTIVE]: '활성',
  [PRODUCT_STATUS.INACTIVE]: '비활성',
}

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  [SHIPMENT_STATUS.PENDING]: '입고 대기',
  [SHIPMENT_STATUS.COMPLETED]: '입고 완료',
  [SHIPMENT_STATUS.REJECTED]: '반품',
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  [RETURN_STATUS.PENDING]: '승인 대기',
  [RETURN_STATUS.APPROVED]: '승인됨',
  [RETURN_STATUS.REJECTED]: '거부됨',
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  [USER_STATUS.ACTIVE]: '활성',
  [USER_STATUS.INACTIVE]: '비활성',
}

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  [TREATMENT_STATUS.COMPLETED]: '완료',
  [TREATMENT_STATUS.RECALLED]: '회수됨',
}

// === Status Color Mappings ===

export const STATUS_COLORS = {
  PENDING: 'yellow',
  ACTIVE: 'green',
  INACTIVE: 'gray',
  REJECTED: 'red',
  IN_STOCK: 'blue',
  USED: 'purple',
  RETURNED: 'orange',
  DISPOSED: 'gray',
  RECALLED: 'red',
  COMPLETED: 'green',
  APPROVED: 'green',
} as const
