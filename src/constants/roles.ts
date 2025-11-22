/**
 * User Roles and Permissions - SSOT
 */

// User Roles
export const USER_ROLES = {
  MANUFACTURER: 'MANUFACTURER',
  DISTRIBUTOR: 'DISTRIBUTOR',
  HOSPITAL: 'HOSPITAL',
  ADMIN: 'ADMIN',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

// Role Labels (Korean)
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.MANUFACTURER]: '제조사',
  [USER_ROLES.DISTRIBUTOR]: '유통사',
  [USER_ROLES.HOSPITAL]: '병원',
  [USER_ROLES.ADMIN]: '관리자',
}

// Permission Matrix
export const ROLE_PERMISSIONS = {
  [USER_ROLES.MANUFACTURER]: {
    canManageProducts: true,
    canProduceLots: true,
    canShipToDistributors: true,
    canViewOwnInventory: true,
    canViewOwnHistory: true,
    canManageSettings: true,
  },
  [USER_ROLES.DISTRIBUTOR]: {
    canReceiveFromManufacturer: true,
    canShipToHospitals: true,
    canReturnToManufacturer: true,
    canViewOwnInventory: true,
    canViewOwnHistory: true,
  },
  [USER_ROLES.HOSPITAL]: {
    canReceiveFromDistributor: true,
    canRegisterTreatments: true,
    canRecallProducts: true,
    canReturnToDistributor: true,
    canDisposeProducts: true,
    canViewOwnInventory: true,
    canViewOwnHistory: true,
  },
  [USER_ROLES.ADMIN]: {
    canApproveOrganizations: true,
    canManageUsers: true,
    canManageProductMaster: true,
    canViewAllHistory: true,
    canViewSystemMonitoring: true,
  },
} as const

// Role-based Routes
export const ROLE_ROUTES = {
  [USER_ROLES.MANUFACTURER]: '/manufacturer',
  [USER_ROLES.DISTRIBUTOR]: '/distributor',
  [USER_ROLES.HOSPITAL]: '/hospital',
  [USER_ROLES.ADMIN]: '/admin',
} as const
