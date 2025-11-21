# Phase 7.2: Virtual Code 생성 및 할당 로직

## 📋 Overview

**목표**: Virtual Code (QR 코드) 생성 규칙을 구현하고, 제조사/유통사/병원 각 단계에서 Virtual Code 검증 로직을 완성합니다.

**PRD 참조**:
- Section 10: Virtual Code 명세
- Section 5.3: 공급망 플로우 (제조사 → 유통사 → 병원 → 환자)

**예상 소요 시간**: 1-2일

---

## 🎯 Development Principles Checklist

- [ ] **SSOT (Single Source of Truth)**: 모든 리터럴은 constants에서 관리
- [ ] **No Magic Numbers**: 하드코딩된 숫자 없이 상수 사용
- [ ] **No 'any' Type**: 모든 타입을 명시적으로 정의
- [ ] **Clean Code**: 함수는 단일 책임, 명확한 변수명
- [ ] **Test-Driven Development**: 테스트 시나리오 우선 작성
- [ ] **Git Conventional Commits**: feat/fix/docs/test 등 규칙 준수
- [ ] **Frontend-First Development**: API 호출 전 타입 및 인터페이스 정의
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 🎯 핵심 요구사항

### 1. Virtual Code 생성 규칙 (PRD Section 10)

**포맷**:
```
VC-{organization_type}-{organization_id}-{timestamp}-{random}
```

**예시**:
- 제조사: `VC-MFR-abc123-1705123456789-x7k2`
- 유통사: `VC-DST-def456-1705123456790-m9n1`
- 병원: `VC-HSP-ghi789-1705123456791-p3q8`

**생성 시점**:
- **제조사**: Lot 생산 시 (각 제품마다 개별 Virtual Code)
- **유통사**: 병원 출고 시 (각 출고 아이템마다 새 Virtual Code 생성)
- **병원**: 환자 투여 시 (사용 기록에 Virtual Code 저장)

### 2. Virtual Code 생성 함수

**파일**: `src/utils/virtualCode.ts` (신규 생성)

```typescript
import { v4 as uuidv4 } from 'uuid'

export type OrganizationType = 'MFR' | 'DST' | 'HSP'

export function generateVirtualCode(
  organizationType: OrganizationType,
  organizationId: string
): string {
  const timestamp = Date.now()
  const random = uuidv4().split('-')[0] // 첫 8자리만 사용

  return `VC-${organizationType}-${organizationId}-${timestamp}-${random}`
}

/**
 * Virtual Code 유효성 검증
 * @returns true if valid format
 */
export function validateVirtualCodeFormat(code: string): boolean {
  const pattern = /^VC-(MFR|DST|HSP)-[a-zA-Z0-9]+-\d{13}-[a-f0-9]{8}$/
  return pattern.test(code)
}

/**
 * Virtual Code에서 조직 타입 추출
 */
export function extractOrganizationType(code: string): OrganizationType | null {
  const match = code.match(/^VC-(MFR|DST|HSP)-/)
  return match ? (match[1] as OrganizationType) : null
}
```

### 3. QR 코드 생성

**라이브러리**: `qrcode` (npm install qrcode @types/qrcode)

```typescript
import QRCode from 'qrcode'

export async function generateQRCode(virtualCode: string): Promise<string> {
  try {
    // Base64 데이터 URL 반환
    const qrDataUrl = await QRCode.toDataURL(virtualCode, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    return qrDataUrl
  } catch (error) {
    console.error('QR Code 생성 실패:', error)
    throw new Error('QR Code 생성에 실패했습니다.')
  }
}
```

---

## 🔄 공급망별 Virtual Code 플로우

### 1. 제조사 → 유통사

**제조사 출고 시**:
```typescript
// Phase 3.5: ShipmentPage.tsx
const handleShipment = async (items: CartItem[]) => {
  const shipmentItems = items.map(item => ({
    lot_id: item.lot.id,
    quantity: item.quantity,
    virtual_code: generateVirtualCode('MFR', userData.organization_id), // 생성
  }))

  await supabase.from('shipments').insert({
    from_organization_id: userData.organization_id,
    to_organization_id: selectedDistributor.id,
    status: 'pending',
  })

  await supabase.from('shipment_items').insert(shipmentItems)
}
```

**유통사 입고 시 검증**:
```typescript
// Phase 4.1: ReceivingPage.tsx
const handleReceive = async (shipmentId: string) => {
  const { data: items } = await supabase
    .from('shipment_items')
    .select('*, lot(*)')
    .eq('shipment_id', shipmentId)

  // Virtual Code 검증
  for (const item of items) {
    if (!validateVirtualCodeFormat(item.virtual_code)) {
      throw new Error('잘못된 Virtual Code 형식')
    }

    const orgType = extractOrganizationType(item.virtual_code)
    if (orgType !== 'MFR') {
      throw new Error('제조사 Virtual Code가 아닙니다')
    }
  }

  // 입고 처리...
}
```

---

### 2. 유통사 → 병원

**유통사 출고 시**:
```typescript
// Phase 4.3: HospitalShipmentPage.tsx
const handleShipment = async (items: CartItem[]) => {
  const shipmentItems = items.map(item => ({
    inventory_id: item.inventory.id,
    quantity: item.quantity,
    virtual_code: generateVirtualCode('DST', userData.organization_id), // 새 VC 생성
    original_virtual_code: item.inventory.virtual_code, // 제조사 VC 보존
  }))

  // 출고 처리...
}
```

**병원 입고 시 검증**:
```typescript
// Phase 5.1: HospitalReceivingPage.tsx
const handleReceive = async (shipmentId: string) => {
  const { data: items } = await supabase
    .from('shipment_items')
    .select('*')
    .eq('shipment_id', shipmentId)

  // Virtual Code 검증
  for (const item of items) {
    const orgType = extractOrganizationType(item.virtual_code)
    if (orgType !== 'DST') {
      throw new Error('유통사 Virtual Code가 아닙니다')
    }
  }

  // 입고 처리...
}
```

---

### 3. 병원 → 환자

**환자 투여 시**:
```typescript
// Phase 5.3: UsagePage.tsx
const handleUsage = async (items: CartItem[], patientPhone: string) => {
  const usageRecords = items.map(item => ({
    inventory_id: item.inventory.id,
    quantity: item.quantity,
    patient_phone: patientPhone,
    virtual_code: item.inventory.virtual_code, // 병원 VC 유지
    used_at: new Date().toISOString(),
  }))

  await supabase.from('usage_records').insert(usageRecords)

  // 재고 차감
  await decrementInventory(items)
}
```

---

## 📂 데이터베이스 스키마 확인

### shipment_items 테이블

```sql
CREATE TABLE shipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES shipments(id),
  lot_id UUID REFERENCES lots(id),
  inventory_id UUID REFERENCES inventory(id),
  quantity INTEGER NOT NULL,
  virtual_code TEXT NOT NULL, -- 현재 조직이 생성한 VC
  original_virtual_code TEXT, -- 이전 조직의 VC (추적용)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shipment_items_virtual_code ON shipment_items(virtual_code);
```

### usage_records 테이블

```sql
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES inventory(id),
  quantity INTEGER NOT NULL,
  patient_phone TEXT NOT NULL,
  virtual_code TEXT NOT NULL, -- 병원 재고의 VC
  used_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_records_patient_phone ON usage_records(patient_phone);
CREATE INDEX idx_usage_records_virtual_code ON usage_records(virtual_code);
```

---

## 🧪 테스트 시나리오

### 시나리오 1: Virtual Code 생성 포맷 검증

```typescript
test('Virtual Code 생성 포맷 확인', () => {
  const code = generateVirtualCode('MFR', 'org-123')

  expect(code).toMatch(/^VC-MFR-org-123-\d{13}-[a-f0-9]{8}$/)
  expect(validateVirtualCodeFormat(code)).toBe(true)
  expect(extractOrganizationType(code)).toBe('MFR')
})
```

### 시나리오 2: QR 코드 생성

```typescript
test('QR 코드 Base64 생성', async () => {
  const code = 'VC-MFR-org-123-1705123456789-x7k2m9n1'
  const qrDataUrl = await generateQRCode(code)

  expect(qrDataUrl).toMatch(/^data:image\/png;base64,/)
})
```

### 시나리오 3: 잘못된 포맷 검증

```typescript
test('잘못된 Virtual Code 검증', () => {
  expect(validateVirtualCodeFormat('INVALID-CODE')).toBe(false)
  expect(validateVirtualCodeFormat('VC-XXX-123-456-abc')).toBe(false)
  expect(extractOrganizationType('INVALID-CODE')).toBeNull()
})
```

### 시나리오 4: 제조사 → 유통사 플로우

**Given**:
- 제조사가 Lot #1을 생산하여 VC 생성: `VC-MFR-mfr001-1705123456789-x7k2m9n1`

**When**:
- 유통사가 입고 승인

**Then**:
- 유통사 재고에 `virtual_code = VC-MFR-mfr001-1705123456789-x7k2m9n1` 저장
- Virtual Code 포맷 검증 통과
- Organization Type이 'MFR'임을 확인

### 시나리오 5: 유통사 → 병원 플로우

**Given**:
- 유통사가 병원에 출고하며 새 VC 생성: `VC-DST-dst001-1705123456790-m9n1p3q8`
- 원본 VC: `VC-MFR-mfr001-1705123456789-x7k2m9n1`

**When**:
- 병원이 입고 승인

**Then**:
- 병원 재고에 `virtual_code = VC-DST-dst001-1705123456790-m9n1p3q8` 저장
- `original_virtual_code = VC-MFR-mfr001-1705123456789-x7k2m9n1` 추적 정보 보존

---

## ✅ Definition of Done

### 코드 구현
- [ ] `src/utils/virtualCode.ts` 파일 생성
- [ ] `generateVirtualCode` 함수 구현
- [ ] `validateVirtualCodeFormat` 함수 구현
- [ ] `extractOrganizationType` 함수 구현
- [ ] `generateQRCode` 함수 구현
- [ ] Phase 3.5 제조사 출고 시 VC 생성 로직 추가
- [ ] Phase 4.1 유통사 입고 시 VC 검증 로직 추가
- [ ] Phase 4.3 유통사 출고 시 새 VC 생성 로직 추가
- [ ] Phase 5.1 병원 입고 시 VC 검증 로직 추가
- [ ] Phase 5.3 환자 투여 시 VC 저장 로직 추가

### 테스트 작성
- [ ] Jest 단위 테스트 (`src/utils/virtualCode.test.ts`)
- [ ] QR 코드 생성 테스트
- [ ] Virtual Code 포맷 검증 테스트
- [ ] 잘못된 포맷 거부 테스트

### UI 구현
- [ ] Virtual Code QR 코드 표시 컴포넌트
- [ ] 출고 확인서에 QR 코드 포함
- [ ] 입고 페이지에서 Virtual Code 스캔 기능 (선택사항)

### 검증
- [ ] 제조사 → 유통사 플로우 VC 생성/검증
- [ ] 유통사 → 병원 플로우 VC 생성/검증
- [ ] 병원 → 환자 플로우 VC 저장
- [ ] Virtual Code 중복 없음 확인
- [ ] QR 코드 스캔 가능 확인 (모바일 QR 스캐너 앱)

### 문서화
- [ ] `src/utils/virtualCode.ts` JSDoc 주석 완성
- [ ] Virtual Code 플로우 다이어그램 작성
- [ ] PRD Section 10 요구사항 충족 확인

---

## 🔗 관련 문서

- [Phase 3.5: 제조사 출고](../phase-3/phase-3.5-shipment.md)
- [Phase 4.1: 유통사 입고](../phase-4/phase-4.1-receiving.md)
- [Phase 4.3: 병원 출고](../phase-4/phase-4.3-hospital-shipment.md)
- [Phase 5.1: 병원 입고](../phase-5/phase-5.1-hospital-receiving.md)
- [Phase 5.3: 환자 투여](../phase-5/phase-5.3-usage.md)
- [PRD Section 10: Virtual Code](../../neo-cert-prd-1.2.md#10-virtual-code)

---

## ⏭️ Next Steps

**다음 단계**: [Phase 7.3 - Pending 상태 워크플로우](phase-7.3-pending-workflow.md)
