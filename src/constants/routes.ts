/**
 * Application Routes - SSOT
 */

// Auth Routes
export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
} as const

// Manufacturer Routes
export const MANUFACTURER_ROUTES = {
  DASHBOARD: '/manufacturer',
  PRODUCTS: '/manufacturer/products',
  PRODUCT_CREATE: '/manufacturer/products/create',
  PRODUCT_EDIT: '/manufacturer/products/:id/edit',
  LOT_PRODUCTION: '/manufacturer/lot-production',
  SHIPMENT: '/manufacturer/shipment',
  INVENTORY: '/manufacturer/inventory',
  HISTORY: '/manufacturer/history',
  SETTINGS: '/manufacturer/settings',
} as const

// Distributor Routes
export const DISTRIBUTOR_ROUTES = {
  DASHBOARD: '/distributor',
  RECEIVING: '/distributor/receiving',
  INVENTORY: '/distributor/inventory',
  HOSPITAL_SHIPMENT: '/distributor/hospital-shipment',
  RETURNS: '/distributor/returns',
  HISTORY: '/distributor/history',
} as const

// Hospital Routes
export const HOSPITAL_ROUTES = {
  DASHBOARD: '/hospital',
  TREATMENT: '/hospital/treatment',
  RECALL: '/hospital/recall',
  RECEIVING: '/hospital/receiving',
  INVENTORY: '/hospital/inventory',
  RETURN: '/hospital/return',
  DISPOSAL: '/hospital/disposal',
  HISTORY: '/hospital/history',
} as const

// Admin Routes
export const ADMIN_ROUTES = {
  DASHBOARD: '/admin',
  ORGANIZATIONS: '/admin/organizations',
  USERS: '/admin/users',
  PRODUCT_MASTER: '/admin/product-master',
  MONITORING: '/admin/monitoring',
} as const

// Mock Routes
export const MOCK_ROUTES = {
  KAKAOTALK: '/mock/kakaotalk',
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',

  // Products
  PRODUCTS: '/products',
  PRODUCT_BY_ID: '/products/:id',

  // Lots
  LOTS: '/lots',
  LOT_PRODUCTION: '/lots/production',

  // Shipments
  SHIPMENTS: '/shipments',
  SHIPMENT_CREATE: '/shipments/create',
  SHIPMENT_ACCEPT: '/shipments/:id/accept',
  SHIPMENT_REJECT: '/shipments/:id/reject',

  // Inventory
  INVENTORY: '/inventory',

  // Treatments
  TREATMENTS: '/treatments',
  TREATMENT_REGISTER: '/treatments/register',
  TREATMENT_RECALL: '/treatments/:id/recall',

  // Returns
  RETURNS: '/returns',
  RETURN_REQUEST: '/returns/request',
  RETURN_APPROVE: '/returns/:id/approve',
  RETURN_REJECT: '/returns/:id/reject',

  // History
  HISTORY: '/history',

  // Admin
  ORGANIZATIONS: '/admin/organizations',
  ORGANIZATION_APPROVE: '/admin/organizations/:id/approve',
  ORGANIZATION_REJECT: '/admin/organizations/:id/reject',
  USERS: '/admin/users',
  PRODUCT_MASTER: '/admin/product-master',

  // Notifications
  NOTIFICATIONS: '/notifications',
} as const

// Public Routes (no authentication required)
export const PUBLIC_ROUTES = [
  AUTH_ROUTES.LOGIN,
  AUTH_ROUTES.REGISTER,
  AUTH_ROUTES.FORGOT_PASSWORD,
  AUTH_ROUTES.RESET_PASSWORD,
  MOCK_ROUTES.KAKAOTALK,
] as const

// Protected Routes (authentication required)
export const PROTECTED_ROUTES = [
  ...Object.values(MANUFACTURER_ROUTES),
  ...Object.values(DISTRIBUTOR_ROUTES),
  ...Object.values(HOSPITAL_ROUTES),
  ...Object.values(ADMIN_ROUTES),
] as const
