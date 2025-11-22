/**
 * Database Constants - SSOT for database schema
 * Table names, column names, function names, RLS policies
 */

// Table Names
export const TABLES = {
  ORGANIZATIONS: 'organizations',
  USERS: 'users',
  MANUFACTURER_SETTINGS: 'manufacturer_settings',
  PRODUCTS: 'products',
  LOTS: 'lots',
  VIRTUAL_CODES: 'virtual_codes',
  PATIENTS: 'patients',
  HISTORY: 'history',
  SHIPMENTS: 'shipments',
  SHIPMENT_DETAILS: 'shipment_details',
  TREATMENT_RECORDS: 'treatment_records',
  TREATMENT_DETAILS: 'treatment_details',
  RETURN_REQUESTS: 'return_requests',
  RETURN_DETAILS: 'return_details',
  NOTIFICATION_MESSAGES: 'notification_messages',
} as const

// Common Column Names
export const COLUMNS = {
  ID: 'id',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  ORGANIZATION_ID: 'organization_id',
  OWNER_ID: 'owner_id',
  PREVIOUS_OWNER_ID: 'previous_owner_id',
  PENDING_TO: 'pending_to',
  STATUS: 'status',
  LOT_ID: 'lot_id',
  PRODUCT_ID: 'product_id',
  VIRTUAL_CODE_ID: 'virtual_code_id',
  QUANTITY: 'quantity',
  CODE: 'code',
  NAME: 'name',
  MANUFACTURE_DATE: 'manufacture_date',
  EXPIRY_DATE: 'expiry_date',
  SEQUENCE_NUMBER: 'sequence_number',
} as const

// Database Functions (RPC)
export const DB_FUNCTIONS = {
  GENERATE_UNIQUE_VIRTUAL_CODE: 'generate_unique_virtual_code',
  GET_NEXT_LOT_NUMBER: 'get_next_lot_number',
  SHIPMENT_TRANSACTION: 'shipment_transaction',
  ACCEPT_SHIPMENT: 'accept_shipment',
  REJECT_SHIPMENT: 'reject_shipment',
  GET_FIFO_VIRTUAL_CODES: 'get_fifo_virtual_codes',
  CHECK_RECALL_ELIGIBLE: 'check_recall_eligible',
} as const

// RLS Policy Names (30 policies total)
export const RLS_POLICIES = {
  // Organizations (3 policies)
  ORGS_SELECT_OWN: 'organizations_select_own',
  ORGS_SELECT_ADMIN: 'organizations_select_admin',
  ORGS_UPDATE_ADMIN: 'organizations_update_admin',

  // Users (4 policies)
  USERS_SELECT_OWN_ORG: 'users_select_own_organization',
  USERS_SELECT_ADMIN: 'users_select_admin',
  USERS_INSERT_OWN: 'users_insert_own',
  USERS_UPDATE_OWN: 'users_update_own',

  // Manufacturer Settings (2 policies)
  MANU_SETTINGS_SELECT: 'manufacturer_settings_select',
  MANU_SETTINGS_UPDATE: 'manufacturer_settings_update',

  // Products (3 policies)
  PRODUCTS_SELECT: 'products_select_all',
  PRODUCTS_INSERT_MANU: 'products_insert_manufacturer',
  PRODUCTS_UPDATE_MANU: 'products_update_manufacturer',

  // Lots (3 policies)
  LOTS_SELECT_OWNER: 'lots_select_owner',
  LOTS_INSERT_MANU: 'lots_insert_manufacturer',
  LOTS_SELECT_ADMIN: 'lots_select_admin',

  // Virtual Codes (4 policies)
  VC_SELECT_OWNER: 'virtual_codes_select_owner',
  VC_SELECT_PENDING: 'virtual_codes_select_pending',
  VC_UPDATE_OWNER: 'virtual_codes_update_owner',
  VC_SELECT_ADMIN: 'virtual_codes_select_admin',

  // Patients (2 policies)
  PATIENTS_SELECT_HOSPITAL: 'patients_select_hospital',
  PATIENTS_INSERT_HOSPITAL: 'patients_insert_hospital',

  // History (3 policies)
  HISTORY_SELECT_OWN_ORG: 'history_select_own_organization',
  HISTORY_INSERT_OWN_ORG: 'history_insert_own_organization',
  HISTORY_SELECT_ADMIN: 'history_select_admin',

  // Shipments (3 policies)
  SHIPMENTS_SELECT_RELATED: 'shipments_select_related',
  SHIPMENTS_INSERT_OWN: 'shipments_insert_own',
  SHIPMENTS_SELECT_ADMIN: 'shipments_select_admin',

  // Shipment Details (1 policy)
  SHIPMENT_DETAILS_SELECT: 'shipment_details_select',

  // Return Requests (2 policies)
  RETURNS_SELECT_RELATED: 'return_requests_select_related',
  RETURNS_INSERT_OWN: 'return_requests_insert_own',

  // Notification Messages (1 policy - future)
  NOTIF_SELECT_OWN: 'notification_messages_select_own',
} as const

// Total: 30 RLS policies
