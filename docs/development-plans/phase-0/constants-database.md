# SSOT 상수: database.ts

## 📋 개요

**목적**: 데이터베이스 관련 모든 상수를 중앙 집중화 (테이블명, 컬럼명, 함수명, 인덱스명)
**SSOT 원칙**: 데이터베이스 스키마 요소에 대한 단일 진실 공급원
**파일 위치**: `src/constants/database.ts`

---

## 🎯 포함 내용

1. **테이블명**: 모든 Supabase 테이블 이름
2. **컬럼명**: 자주 사용되는 컬럼명 (특히 조인, 정렬, 필터링에 사용되는 컬럼)
3. **함수명**: PostgreSQL 저장 함수/프로시저 이름
4. **인덱스명**: 주요 인덱스 이름 (마이그레이션 참조용)

---

## 📝 파일 내용

**src/constants/database.ts**:
```typescript
/**
 * 데이터베이스 테이블, 컬럼, 함수명 상수
 * SSOT: 데이터베이스 스키마 요소에 대한 단일 진실 공급원
 *
 * 사용 예:
 * supabase.from(DATABASE_CONSTANTS.TABLES.VIRTUAL_CODES).select('*')
 * .order(DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.SEQUENCE_NUMBER)
 */

export const DATABASE_CONSTANTS = {
  /**
   * 테이블명
   */
  TABLES: {
    // Core
    ORGANIZATIONS: 'organizations',
    USERS: 'users',
    PRODUCTS: 'products',
    LOTS: 'lots',

    // Relations
    VIRTUAL_CODES: 'virtual_codes',
    MANUFACTURER_SETTINGS: 'manufacturer_settings',
    PATIENTS: 'patients',
    TREATMENT_RECORDS: 'treatment_records',
    TREATMENT_DETAILS: 'treatment_details',

    // History & Notifications
    HISTORY: 'history',
    NOTIFICATION_MESSAGES: 'notification_messages',

    // Returns
    RETURN_REQUESTS: 'return_requests',
  },

  /**
   * 컬럼명 - 자주 사용되는 컬럼만 정의
   */
  COLUMNS: {
    /**
     * virtual_codes 테이블
     * - FIFO 정렬에 중요한 컬럼들
     */
    VIRTUAL_CODES: {
      ID: 'id',
      CODE: 'code',
      LOT_ID: 'lot_id',
      SEQUENCE_NUMBER: 'sequence_number', // FIFO 내부 정렬용
      STATUS: 'status',
      OWNER_TYPE: 'owner_type',
      OWNER_ID: 'owner_id',
      PENDING_TO: 'pending_to',
      PREVIOUS_OWNER_ID: 'previous_owner_id', // 반품 추적용
      CREATED_AT: 'created_at',
      UPDATED_AT: 'updated_at',
    },

    /**
     * lots 테이블
     * - FIFO 정렬에 중요한 컬럼들
     */
    LOTS: {
      ID: 'id',
      PRODUCT_ID: 'product_id',
      LOT_NUMBER: 'lot_number',
      MANUFACTURE_DATE: 'manufacture_date', // FIFO 1차 정렬
      EXPIRY_DATE: 'expiry_date',           // FIFO 2차 정렬
      QUANTITY: 'quantity',
      CREATED_AT: 'created_at',
    },

    /**
     * organizations 테이블
     */
    ORGANIZATIONS: {
      ID: 'id',
      NAME: 'name',
      TYPE: 'type',
      STATUS: 'status',
      BUSINESS_NUMBER: 'business_number',
      CREATED_AT: 'created_at',
    },

    /**
     * products 테이블
     */
    PRODUCTS: {
      ID: 'id',
      NAME: 'name',
      MODEL_NUMBER: 'model_number',
      MANUFACTURER_ID: 'manufacturer_id',
      CREATED_AT: 'created_at',
    },

    /**
     * patients 테이블
     */
    PATIENTS: {
      PHONE_NUMBER: 'phone_number', // PK, 정규화 필요
      NAME: 'name',
      CREATED_AT: 'created_at',
    },

    /**
     * history 테이블
     */
    HISTORY: {
      ID: 'id',
      ACTION: 'action',
      VIRTUAL_CODE_ID: 'virtual_code_id',
      FROM_ORG: 'from_org',
      TO_ORG: 'to_org',
      PERFORMED_BY: 'performed_by',
      CREATED_AT: 'created_at',
    },

    /**
     * notification_messages 테이블
     */
    NOTIFICATION_MESSAGES: {
      ID: 'id',
      TYPE: 'type',
      PATIENT_PHONE: 'patient_phone',
      CONTENT: 'content',
      IS_SENT: 'is_sent',
      CREATED_AT: 'created_at',
    },
  },

  /**
   * 인덱스명 - 마이그레이션 및 성능 모니터링 참조용
   */
  INDEXES: {
    VIRTUAL_CODES_FIFO: 'idx_vc_fifo',
    VIRTUAL_CODES_PREVIOUS_OWNER: 'idx_vc_previous_owner',
    VIRTUAL_CODES_CODE_UNIQUE: 'unique_virtual_code',
    LOTS_PRODUCT_MANUFACTURE: 'idx_lots_product_manufacture',
    HISTORY_CREATED_AT: 'idx_history_created_at',
  },
} as const;

/**
 * PostgreSQL 저장 함수명
 */
export const DATABASE_FUNCTIONS = {
  /**
   * Virtual Code 생성 함수
   * - 12자리 고유 코드 생성 (충돌 시 재시도)
   */
  GENERATE_VIRTUAL_CODE: 'generate_unique_virtual_code',

  /**
   * Lot 생산 트랜잭션 함수
   * - Lot 생성 + quantity개의 Virtual Code 생성 (sequence_number 할당)
   *
   * @param p_product_id UUID
   * @param p_lot_number TEXT
   * @param p_manufacture_date DATE
   * @param p_expiry_date DATE
   * @param p_quantity INTEGER
   * @param p_organization_id UUID
   * @returns UUID (lot_id)
   */
  CREATE_LOT_WITH_CODES: 'create_lot_with_virtual_codes',

  /**
   * 출고 트랜잭션 함수
   * - 즉시 소유권 이전 모델 (owner_id → 수신자, previous_owner_id ← 발신자)
   *
   * @param p_virtual_code_ids UUID[]
   * @param p_from_org_id UUID
   * @param p_to_org_id UUID
   * @param p_to_org_type TEXT ('DISTRIBUTOR' | 'HOSPITAL')
   * @returns VOID
   */
  SHIPMENT_TRANSACTION: 'shipment_transaction',

  /**
   * 시술 트랜잭션 함수
   * - Treatment Record 생성 + Virtual Code 상태 변경 (USED)
   *
   * @param p_virtual_code_ids UUID[]
   * @param p_hospital_id UUID
   * @param p_patient_phone TEXT
   * @param p_treatment_date DATE
   * @returns UUID (treatment_id)
   */
  TREATMENT_TRANSACTION: 'treatment_transaction',

  /**
   * 전화번호 정규화 함수
   * - 하이픈 제거, 11자리 검증
   *
   * @param p_phone TEXT
   * @returns TEXT (정규화된 전화번호)
   */
  NORMALIZE_PHONE: 'normalize_phone_number',

  /**
   * Advisory Lock 획득 함수
   * - organization_id + product_id 범위 Lock
   *
   * @param p_organization_id UUID
   * @param p_product_id UUID
   * @returns VOID (Lock 획득 시까지 대기)
   */
  ACQUIRE_ORG_PRODUCT_LOCK: 'acquire_org_product_lock',

  /**
   * Advisory Lock 해제 함수
   *
   * @param p_organization_id UUID
   * @param p_product_id UUID
   * @returns VOID
   */
  RELEASE_ORG_PRODUCT_LOCK: 'release_org_product_lock',
} as const;

/**
 * RLS Policy명 - 참조용
 *
 * 전체 정책 목록: Phase 1.4에 정의된 모든 RLS 정책
 * 사용처: 정책 이름 참조, 디버깅, 문서화
 */
export const RLS_POLICIES = {
  // Organizations
  ORGANIZATIONS_VIEW_OWN: 'Users can view their own organization',
  ORGANIZATIONS_UPDATE_OWN: 'Users can update their own organization',
  ORGANIZATIONS_ADMIN_MANAGE: 'Admins can manage all organizations',

  // Users
  USERS_VIEW_COLLEAGUES: 'Users can view colleagues',
  USERS_UPDATE_OWN: 'Users can update own profile',
  USERS_ADMIN_MANAGE: 'Admins can manage all users',

  // Manufacturer Settings
  MANUFACTURER_SETTINGS_MANAGE: 'Manufacturers can manage own settings',

  // Products
  PRODUCTS_MANAGE_OWN: 'Organizations can manage own products',

  // Lots
  LOTS_VIEW_OWN: 'Organizations can view own lots',
  LOTS_MANAGE_OWN: 'Organizations can manage own lots',

  // Virtual Codes (Critical)
  VIRTUAL_CODES_VIEW_OWNED: 'Organizations can view owned virtual_codes',
  VIRTUAL_CODES_VIEW_PENDING: 'Organizations can view pending virtual_codes',
  VIRTUAL_CODES_MANAGE_OWNED: 'Organizations can manage owned virtual_codes',

  // Patients
  PATIENTS_HOSPITAL_VIEW: 'Hospitals can view patients',
  PATIENTS_HOSPITAL_INSERT: 'Hospitals can insert patients',
  PATIENTS_ADMIN_MANAGE: 'Admins can manage all patients',

  // History
  HISTORY_VIEW_RELATED: 'Organizations can view related history',
  HISTORY_INSERT_RELATED: 'Organizations can insert related history',

  // Treatment Records
  TREATMENT_RECORDS_MANAGE: 'Hospitals can manage own treatment_records',

  // Treatment Details
  TREATMENT_DETAILS_VIEW: 'Hospitals can view own treatment_details',
  TREATMENT_DETAILS_INSERT: 'Hospitals can insert own treatment_details',

  // Return Requests
  RETURN_REQUESTS_VIEW_RELATED: 'Organizations can view related return_requests',
  RETURN_REQUESTS_INSERT: 'Organizations can create return_requests',
  RETURN_REQUESTS_UPDATE_RECEIVER: 'Receivers can update return_requests',
  RETURN_REQUESTS_ADMIN_MANAGE: 'Admins can manage all return_requests',

  // Return Details
  RETURN_DETAILS_VIEW_RELATED: 'Organizations can view related return_details',
  RETURN_DETAILS_INSERT: 'Requesters can insert return_details',

  // Notification Messages
  NOTIFICATION_MESSAGES_HOSPITAL_MANAGE: 'Hospitals can manage patient notifications',
  NOTIFICATION_MESSAGES_ADMIN_MANAGE: 'Admins can manage all notifications',
} as const;

/**
 * RLS Helper 함수명
 */
export const RLS_HELPERS = {
  /**
   * 현재 사용자의 organization_id 반환
   * @returns UUID | NULL (Admin인 경우)
   */
  USER_ORGANIZATION_ID: 'user_organization_id',

  /**
   * 현재 사용자가 Admin인지 확인
   * @returns BOOLEAN
   */
  IS_ADMIN: 'is_admin',
} as const;

/**
 * TypeScript 타입 추론 헬퍼
 */
export type TableName = typeof DATABASE_CONSTANTS.TABLES[keyof typeof DATABASE_CONSTANTS.TABLES];
export type FunctionName = typeof DATABASE_FUNCTIONS[keyof typeof DATABASE_FUNCTIONS];
```

---

## 🔧 사용 예시

### 1. 쿼리에서 테이블명 사용
```typescript
import { DATABASE_CONSTANTS } from '@/constants/database';

// Before (하드코딩)
const { data } = await supabase.from('virtual_codes').select('*');

// After (SSOT)
const { data } = await supabase
  .from(DATABASE_CONSTANTS.TABLES.VIRTUAL_CODES)
  .select('*');
```

### 2. 정렬 컬럼 사용
```typescript
import { DATABASE_CONSTANTS } from '@/constants/database';

const { COLUMNS } = DATABASE_CONSTANTS;

// FIFO 정렬
const { data } = await supabase
  .from(DATABASE_CONSTANTS.TABLES.VIRTUAL_CODES)
  .select('*')
  .order(COLUMNS.LOTS.MANUFACTURE_DATE, { ascending: true })
  .order(COLUMNS.VIRTUAL_CODES.SEQUENCE_NUMBER, { ascending: true });
```

### 3. 함수 호출
```typescript
import { DATABASE_FUNCTIONS } from '@/constants/database';

const { data, error } = await supabase.rpc(
  DATABASE_FUNCTIONS.CREATE_LOT_WITH_CODES,
  {
    p_product_id: productId,
    p_lot_number: lotNumber,
    p_manufacture_date: manufactureDate,
    p_expiry_date: expiryDate,
    p_quantity: quantity,
    p_organization_id: orgId,
  }
);
```

---

## ✅ 완료 기준

- [x] 모든 테이블명 정의 (13개)
- [x] FIFO 관련 컬럼명 정의
- [x] sequence_number, previous_owner_id 포함
- [x] 트랜잭션 함수명 정의 (7개)
- [x] 전화번호 정규화 함수 정의
- [x] Lock 함수명 정의 (2개)
- [x] RLS 정책명 전체 목록 정의 (30개)
- [x] RLS Helper 함수명 정의 (2개)
- [x] JSDoc 주석으로 각 함수 파라미터 설명
- [x] Phase 1.4와 완전 동기화

---

## 🔗 관련 문서

- [Phase 1.2 - Core Tables](../phase-1/phase-1.2-core-tables.md)
- [Phase 1.3 - Relations Tables](../phase-1/phase-1.3-relations-tables.md)
- [Phase 7.1 - FIFO Algorithm](../phase-7/phase-7.1-fifo-algorithm.md)
