# SSOT 상수: business-logic.ts

## 📋 개요

**목적**: 비즈니스 로직 관련 모든 상수 중앙화 (FIFO, Virtual Code 형식, 전화번호 형식, Recall 규칙)
**SSOT 원칙**: 비즈니스 규칙에 대한 단일 진실 공급원
**파일 위치**: `src/constants/business-logic.ts`

---

## 🎯 포함 내용

1. **Virtual Code 형식**: 코드 생성 규칙 (길이, 형식)
2. **FIFO 정렬 규칙**: Lot 정렬 우선순위 및 순서
3. **전화번호 형식**: 입력 형식, 정규화 형식, 검증 규칙
4. **Recall 규칙**: 24시간 회수 제한 규칙

---

## 📝 파일 내용

**src/constants/business-logic.ts**:
```typescript
/**
 * 비즈니스 로직 상수
 * SSOT: 비즈니스 규칙에 대한 단일 진실 공급원
 *
 * 포함 내용:
 * - Virtual Code 형식
 * - FIFO 정렬 규칙
 * - 전화번호 형식
 * - Recall 규칙
 */

/**
 * Virtual Code 형식 상수
 *
 * 형식: 12자리 영숫자 (대문자)
 * 생성: MD5 해시 기반 (타임스탬프 + 랜덤)
 */
export const VIRTUAL_CODE_FORMAT = {
  /**
   * 총 길이: 12자리
   */
  TOTAL_LENGTH: 12,

  /**
   * 문자 셋: 대문자 영숫자
   */
  CHARSET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',

  /**
   * 생성 알고리즘: MD5 해시
   */
  HASH_ALGORITHM: 'MD5',

  /**
   * 고유성 검증 최대 재시도 횟수
   */
  MAX_RETRIES: 10,

  /**
   * 표시 형식 (UI용)
   * 예: ABCD-EFGH-IJKL
   */
  DISPLAY_FORMAT: {
    SEPARATOR: '-',
    GROUPS: [4, 4, 4], // 4-4-4 형식
  },
} as const;

/**
 * FIFO (First In First Out) 정렬 규칙
 *
 * 우선순위:
 * 1. Lot 단위: manufacture_date ASC (제조일이 빠른 것 우선)
 * 2. Lot 내부: sequence_number ASC (sequence_number가 작은 것 우선)
 *
 * 예외:
 * - expiry_date가 가까운 Lot이 우선 (유통기한 관리)
 */
export const FIFO_SORT = {
  /**
   * 1차 정렬: manufacture_date (제조일)
   * - 오래된 제품 우선 출고
   */
  PRIMARY: {
    FIELD: 'manufacture_date',
    ORDER: 'ASC' as const,
    PRIORITY: 1,
    DESCRIPTION: '제조일 오름차순 (오래된 것 우선)',
  },

  /**
   * 2차 정렬 (Optional): expiry_date (유통기한)
   * - 유통기한이 가까운 것 우선 출고
   * - 제조일이 같을 경우에만 적용
   */
  SECONDARY: {
    FIELD: 'expiry_date',
    ORDER: 'ASC' as const,
    PRIORITY: 2,
    DESCRIPTION: '유통기한 오름차순 (가까운 것 우선)',
  },

  /**
   * 3차 정렬: sequence_number (Lot 내부 순서)
   * - 같은 Lot 내에서 순차 출고
   */
  TERTIARY: {
    FIELD: 'sequence_number',
    ORDER: 'ASC' as const,
    PRIORITY: 3,
    DESCRIPTION: 'Lot 내부 순서 번호 오름차순',
  },

  /**
   * 4차 정렬 (Fallback): created_at
   * - Lot 생성 시간 기준
   */
  FALLBACK: {
    FIELD: 'created_at',
    ORDER: 'ASC' as const,
    PRIORITY: 4,
    DESCRIPTION: 'Lot 생성 시간 오름차순',
  },
} as const;

/**
 * 전화번호 형식 상수
 *
 * 입력 형식: 010-1234-5678 (하이픈 포함)
 * 저장 형식: 01012345678 (하이픈 제거, 11자리)
 *
 * **주의**: 정규식은 validation.ts에 정의되어 있음 (SSOT)
 * 여기서는 validation.ts의 정규식을 참조만 함
 */

// validation.ts에서 정규식 import
import { REGEX } from './validation';

export const PHONE_FORMAT = {
  /**
   * 입력 시 검증 정규식 (하이픈 포함)
   * 형식: 01X-XXXX-XXXX 또는 01X-XXX-XXXX
   *
   * @source validation.ts REGEX.PHONE_INPUT
   */
  INPUT_REGEX: REGEX.PHONE_INPUT,

  /**
   * 정규화 후 검증 정규식 (하이픈 제거)
   * 형식: 01XXXXXXXXX (11자리)
   *
   * @source validation.ts REGEX.PHONE_NORMALIZED
   */
  NORMALIZED_REGEX: REGEX.PHONE_NORMALIZED,

  /**
   * 정규화 후 길이
   */
  NORMALIZED_LENGTH: 11,

  /**
   * 국가 코드 (국제 형식 변환 시)
   */
  COUNTRY_CODE: '+82',

  /**
   * 제거할 문자 정규식 (정규화 시)
   */
  REMOVE_PATTERN: /[^0-9]/g,

  /**
   * 표시 형식 (UI용)
   * 예: 010-1234-5678
   */
  DISPLAY_FORMAT: {
    SEPARATOR: '-',
    PATTERN: 'XXX-XXXX-XXXX',
  },
} as const;

/**
 * 시간 변환 상수
 * - 매직 넘버 제거를 위한 기본 시간 단위 정의
 */
export const TIME_CONVERSIONS = {
  /**
   * 1초 = 1000밀리초
   */
  SECOND_TO_MS: 1000,

  /**
   * 1분 = 60초
   */
  MINUTE_TO_SECONDS: 60,

  /**
   * 1시간 = 60분
   */
  HOUR_TO_MINUTES: 60,

  /**
   * 1일 = 24시간
   */
  DAY_TO_HOURS: 24,

  /**
   * 1시간을 밀리초로 (60 * 60 * 1000)
   */
  get HOUR_TO_MS(): number {
    return this.MINUTE_TO_SECONDS * this.MINUTE_TO_SECONDS * this.SECOND_TO_MS;
  },

  /**
   * 1일을 밀리초로 (24 * 60 * 60 * 1000)
   */
  get DAY_TO_MS(): number {
    return this.DAY_TO_HOURS * this.HOUR_TO_MS;
  },
} as const;

/**
 * Recall (회수) 규칙
 *
 * 규칙:
 * - 시술 후 24시간 이내만 자율 회수 가능
 * - 24시간 경과 시 관리자 개입 필요
 */
export const RECALL_RULES = {
  /**
   * 회수 가능 시간 (시간 단위)
   */
  WINDOW_HOURS: 24,

  /**
   * 회수 가능 시간 (밀리초 단위)
   * 계산: 24시간 * 1시간(ms)
   */
  WINDOW_MS: 24 * TIME_CONVERSIONS.HOUR_TO_MS,

  /**
   * 회수 가능 여부 판단 함수
   *
   * @param treatmentDate 시술일시 (ISO 8601)
   * @returns boolean (회수 가능 여부)
   */
  isRecallable: (treatmentDate: string | Date): boolean => {
    const treatment = new Date(treatmentDate);
    const now = new Date();
    const diff = now.getTime() - treatment.getTime();
    return diff <= RECALL_RULES.WINDOW_MS;
  },

  /**
   * 남은 시간 계산 함수 (밀리초)
   *
   * @param treatmentDate 시술일시 (ISO 8601)
   * @returns number (남은 밀리초, 음수면 만료)
   */
  getRemainingTime: (treatmentDate: string | Date): number => {
    const treatment = new Date(treatmentDate);
    const now = new Date();
    const diff = now.getTime() - treatment.getTime();
    return RECALL_RULES.WINDOW_MS - diff;
  },
} as const;

/**
 * Lot 번호 형식 상수
 *
 * 기본 형식: [PREFIX][모델번호][YYMMDD]
 * 예: ND12345250120 (ND + 12345 + 250120)
 */
export const LOT_NUMBER_FORMAT = {
  /**
   * 기본 PREFIX (제조사별 커스터마이징 가능)
   */
  DEFAULT_PREFIX: 'ND',

  /**
   * PREFIX 길이 제한
   */
  PREFIX_MAX_LENGTH: 5,

  /**
   * 모델번호 자릿수 범위
   */
  MODEL_DIGITS: {
    MIN: 3,
    MAX: 10,
  },

  /**
   * 날짜 형식 (YYMMDD)
   */
  DATE_FORMAT: 'yyMMdd',
  DATE_LENGTH: 6,

  /**
   * Lot 번호 생성 함수
   *
   * @param prefix 제조사 PREFIX
   * @param modelNumber 모델번호
   * @param date 제조일
   * @returns string (Lot 번호)
   */
  generate: (prefix: string, modelNumber: string, date: Date): string => {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    return `${prefix}${modelNumber}${dateStr}`;
  },
} as const;

/**
 * Pending 상태 유효 시간 (Optional, MVP 미사용)
 *
 * 향후 기능: Pending 상태가 일정 시간 지나면 자동 반품
 */
export const PENDING_TIMEOUT = {
  /**
   * 기본 대기 시간 (일 단위)
   */
  DEFAULT_DAYS: 7,

  /**
   * 밀리초 단위
   * 계산: 7일 * 1일(ms)
   */
  DEFAULT_MS: 7 * TIME_CONVERSIONS.DAY_TO_MS,
} as const;

/**
 * 재고 수량 제한
 */
export const STOCK_LIMITS = {
  /**
   * 최소 수량
   */
  MIN_QUANTITY: 1,

  /**
   * 최대 수량 (단일 거래)
   */
  MAX_QUANTITY: 1000000,

  /**
   * 경고 임계값 (재고 부족 알림)
   */
  LOW_STOCK_THRESHOLD: 10,
} as const;

/**
 * 제조사 설정 기본값
 *
 * 제조사 조직 생성 시 manufacturer_settings 테이블에 저장되는 기본값
 * PRD 참조: Section 6.1 (제조사 설정)
 */
export const MANUFACTURER_SETTINGS_DEFAULTS = {
  /**
   * Lot 번호 접두사 (PREFIX)
   * - 기본값: 'ND' (Neo Derm)
   * - 최대 길이: 5자
   */
  LOT_PREFIX: 'ND',

  /**
   * 모델 코드 자릿수
   * - 기본값: 5자리
   * - 범위: 3-10자리
   */
  LOT_MODEL_DIGITS: 5,

  /**
   * 날짜 형식
   * - 기본값: 'yymmdd' (년도 2자리 + 월 2자리 + 일 2자리)
   * - 예: 250120 (2025년 1월 20일)
   */
  LOT_DATE_FORMAT: 'yymmdd',

  /**
   * 기본 사용기한 (개월 수)
   * - 기본값: 24개월 (2년)
   * - 단위: 6개월 (6, 12, 18, 24, 30, 36)
   * - 최대: 36개월
   */
  EXPIRY_MONTHS: 24,

  /**
   * 사용기한 증감 단위 (개월)
   * - UI에서 사용기한 설정 시 증감 단위
   * - 예: 6개월 단위로 선택 가능 (6, 12, 18, 24, 30, 36)
   */
  EXPIRY_STEP: 6,

  /**
   * 사용기한 최소값 (개월)
   */
  EXPIRY_MIN_MONTHS: 6,

  /**
   * 사용기한 최대값 (개월)
   */
  EXPIRY_MAX_MONTHS: 36,
} as const;

/**
 * 사용기한 유효성 검증 함수
 *
 * @param expiryMonths 사용기한 (개월)
 * @returns boolean (유효 여부)
 */
export function isValidExpiryMonths(expiryMonths: number): boolean {
  const { EXPIRY_MIN_MONTHS, EXPIRY_MAX_MONTHS, EXPIRY_STEP } =
    MANUFACTURER_SETTINGS_DEFAULTS;

  // 범위 체크
  if (expiryMonths < EXPIRY_MIN_MONTHS || expiryMonths > EXPIRY_MAX_MONTHS) {
    return false;
  }

  // 6개월 단위 체크
  if (expiryMonths % EXPIRY_STEP !== 0) {
    return false;
  }

  return true;
}

/**
 * 사용 가능한 사용기한 옵션 목록 생성
 *
 * @returns number[] (6, 12, 18, 24, 30, 36)
 */
export function getExpiryMonthsOptions(): number[] {
  const { EXPIRY_MIN_MONTHS, EXPIRY_MAX_MONTHS, EXPIRY_STEP } =
    MANUFACTURER_SETTINGS_DEFAULTS;

  const options: number[] = [];
  for (let i = EXPIRY_MIN_MONTHS; i <= EXPIRY_MAX_MONTHS; i += EXPIRY_STEP) {
    options.push(i);
  }

  return options;
}
```

---

## 🔧 사용 예시

### 1. FIFO 정렬 적용
```typescript
import { FIFO_SORT, DATABASE_CONSTANTS } from '@/constants';

const { data: lots } = await supabase
  .from(DATABASE_CONSTANTS.TABLES.LOTS)
  .select('*, virtual_codes(*)')
  .order(FIFO_SORT.PRIMARY.FIELD, { ascending: true })
  .order(FIFO_SORT.SECONDARY.FIELD, { ascending: true });

// Lot 내부 정렬
const sortedCodes = lot.virtual_codes.sort((a, b) =>
  a[DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.SEQUENCE_NUMBER] -
  b[DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.SEQUENCE_NUMBER]
);
```

### 2. Virtual Code 형식 검증
```typescript
import { VIRTUAL_CODE_FORMAT } from '@/constants/business-logic';

const isValidLength = (code: string): boolean => {
  return code.length === VIRTUAL_CODE_FORMAT.TOTAL_LENGTH;
};

// 표시 형식 변환
const formatForDisplay = (code: string): string => {
  const { DISPLAY_FORMAT } = VIRTUAL_CODE_FORMAT;
  const groups = DISPLAY_FORMAT.GROUPS;
  let formatted = '';
  let pos = 0;

  for (const size of groups) {
    formatted += code.substring(pos, pos + size) + DISPLAY_FORMAT.SEPARATOR;
    pos += size;
  }

  return formatted.slice(0, -1); // 마지막 구분자 제거
};
// 결과: "ABCD-EFGH-IJKL"
```

### 3. 전화번호 정규화
```typescript
import { PHONE_FORMAT } from '@/constants/business-logic';

const normalizePhone = (phone: string): string => {
  return phone.replace(PHONE_FORMAT.REMOVE_PATTERN, '');
};

// Before: "010-1234-5678"
// After: "01012345678"
```

### 4. Recall 가능 여부 확인
```typescript
import { RECALL_RULES } from '@/constants/business-logic';

const treatmentDate = '2025-01-20T10:00:00Z';
const canRecall = RECALL_RULES.isRecallable(treatmentDate);

if (!canRecall) {
  throw new Error('24시간 경과하여 회수할 수 없습니다.');
}

// 남은 시간 표시
const remaining = RECALL_RULES.getRemainingTime(treatmentDate);
const hours = Math.floor(remaining / (60 * 60 * 1000));
console.log(`회수 가능 시간: ${hours}시간 남음`);
```

### 5. Lot 번호 생성
```typescript
import { LOT_NUMBER_FORMAT } from '@/constants/business-logic';

const lotNumber = LOT_NUMBER_FORMAT.generate(
  'ND',           // prefix
  '12345',        // model number
  new Date()      // manufacture date
);
// 결과: "ND12345250120"
```

### 6. 제조사 설정 기본값 사용
```typescript
import { MANUFACTURER_SETTINGS_DEFAULTS } from '@/constants/business-logic';
import { DATABASE_CONSTANTS } from '@/constants/database';

// 제조사 조직 생성 시 기본 설정 저장
async function createManufacturerOrganization(organizationId: string) {
  const { data, error } = await supabase
    .from(DATABASE_CONSTANTS.TABLES.MANUFACTURER_SETTINGS)
    .insert({
      organization_id: organizationId,
      lot_prefix: MANUFACTURER_SETTINGS_DEFAULTS.LOT_PREFIX,
      lot_model_digits: MANUFACTURER_SETTINGS_DEFAULTS.LOT_MODEL_DIGITS,
      lot_date_format: MANUFACTURER_SETTINGS_DEFAULTS.LOT_DATE_FORMAT,
      expiry_months: MANUFACTURER_SETTINGS_DEFAULTS.EXPIRY_MONTHS,
    });

  return data;
}
```

### 7. 사용기한 유효성 검증
```typescript
import {
  MANUFACTURER_SETTINGS_DEFAULTS,
  isValidExpiryMonths,
} from '@/constants/business-logic';

// 사용기한 입력 검증
const userInput = 18; // 18개월
if (isValidExpiryMonths(userInput)) {
  console.log('유효한 사용기한입니다.');
} else {
  throw new Error(
    `사용기한은 ${MANUFACTURER_SETTINGS_DEFAULTS.EXPIRY_MIN_MONTHS}-${MANUFACTURER_SETTINGS_DEFAULTS.EXPIRY_MAX_MONTHS}개월 범위에서 ${MANUFACTURER_SETTINGS_DEFAULTS.EXPIRY_STEP}개월 단위로 설정해야 합니다.`
  );
}

// 잘못된 예시
isValidExpiryMonths(10); // false (6개월 단위 아님)
isValidExpiryMonths(40); // false (최대 36개월 초과)
isValidExpiryMonths(3);  // false (최소 6개월 미만)
```

### 8. 사용기한 선택 드롭다운 (UI)
```typescript
import { getExpiryMonthsOptions } from '@/constants/business-logic';

// React 컴포넌트 예시
const ExpiryMonthsSelect = () => {
  const options = getExpiryMonthsOptions();
  // 결과: [6, 12, 18, 24, 30, 36]

  return (
    <select name="expiryMonths" defaultValue={24}>
      {options.map((months) => (
        <option key={months} value={months}>
          {months}개월
        </option>
      ))}
    </select>
  );
};
```

---

## ✅ 완료 기준

- [x] Virtual Code 형식 상수 정의
- [x] FIFO 정렬 규칙 정의 (4단계)
- [x] 전화번호 형식 상수 정의
- [x] Recall 규칙 정의 (함수 포함)
- [x] Lot 번호 형식 정의
- [x] 재고 수량 제한 정의
- [x] 제조사 설정 기본값 정의 (PRD Section 6.1)
- [x] 사용기한 유효성 검증 함수 (isValidExpiryMonths)
- [x] 사용기한 옵션 생성 함수 (getExpiryMonthsOptions)
- [x] JSDoc 주석으로 각 상수 설명
- [x] 사용 예시 8개 제공

---

## 🔗 관련 문서

- [Phase 7.1 - FIFO Algorithm](../phase-7/phase-7.1-fifo-algorithm.md)
- [Phase 3.4 - Lot Production](../phase-3/phase-3.4-lot-production.md)
- [Phase 5.2 - Recall](../phase-5/phase-5.2-recall.md)
- [Phase 3.3 - Manufacturer Settings](../phase-3/phase-3.3-manufacturer-settings.md)
- [validation.ts](./phase-0.5-constants-system.md) - 정규식 SSOT (전화번호 regex는 여기서 import)

---

## 📌 주의사항

### 1. 정규식 중복 제거 완료
- **전화번호 정규식**: `validation.ts`의 `REGEX.PHONE_INPUT`, `REGEX.PHONE_NORMALIZED` 사용
- **SSOT 준수**: 모든 정규식은 `validation.ts`에만 정의
- **Cross-reference**: `business-logic.ts`는 `validation.ts`를 import하여 사용

### 2. 제조사 설정 기본값
- PRD Section 6.1과 완전히 동기화
- UI에서 사용기한 선택 시 `getExpiryMonthsOptions()` 사용 권장
- 커스터마이징 필요 시 manufacturer_settings 테이블 수정
