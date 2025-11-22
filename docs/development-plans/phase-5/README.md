# Phase 5: 병원 기능

## 📋 개요

**목표**: 시술 등록, 회수, 병원 입고, 재고, 반품, 폐기 기능 완성
**기간**: 6-8일
**완료 상태**: ⏳ 문서화 완료 (구현 대기)

---

## 🎯 개발 원칙 (Development Principles)

이 Phase 작업 시 다음 9가지 개발 원칙을 준수해야 합니다:

### 핵심 원칙
1. **SSOT**: 모든 상수는 `src/constants/`에 정의
2. **No Magic Numbers**: 리터럴 값 금지
3. **No 'any' Type**: TypeScript strict mode
4. **Clean Code**: 명확한 네이밍, 단일 책임
5. **Test-Driven**: 테스트 작성 필수 (커버리지 80%+)
6. **Conventional Commits**: `<type>(<scope>): <subject>`
7. **Frontend-First**: UI 먼저, 백엔드 나중
8. **Complete Task Execution**: 시간 무관 작업 범위 100% 완료 ⭐
9. **Context Memory Alert**: 메모리 부족 시 사용자 알림 ⭐

### 이 Phase 중점 원칙
- **원칙 5 (Test-Driven)**: 시술 등록 핵심 로직 - FIFO 할당, 전화번호 정규화 테스트
- **원칙 8 (범위 완료)**: Recall 규칙 - 24시간 이내 검증 (RECALL_RULES.isRecallable) 완전 구현
- **원칙 8 (범위 완료)**: 트랜잭션 완전성 - treatment_transaction 함수 원자성 완전 보장

**상세 내용**: [DEVELOPMENT_PRINCIPLES.md](../../DEVELOPMENT_PRINCIPLES.md)

---

## ✅ 일관성 체크리스트

이 Phase 구현 시 다음 사항을 반드시 확인:

- [ ] **TERMINOLOGY 상수 사용**: 모든 UI 텍스트는 `@/constants/terminology` import
- [ ] **하드코딩 금지**: 한글/영문 텍스트 직접 입력 없음
- [ ] **표준 import 패턴**:
  ```typescript
  import { TERMINOLOGY, VALIDATION, ERROR_MESSAGES } from '@/constants'
  ```
- [ ] **'any' 타입 미사용**: 모든 타입 명시적 정의
- [ ] **PRD 용어 준수**: '시술' (NOT '수술'), '회수' (NOT '취소'), '환자' (NOT '고객')

---

## 세부 계획 (8개 유닛)

- **Phase 5.1**: [시술 등록](phase-5.1-treatment-registration.md) - 장바구니 + 환자 전화번호
- **Phase 5.2**: [회수](phase-5.2-recall.md) - 24시간 제한
- **Phase 5.3**: [입고 이력 조회](phase-5.3-hospital-receiving.md) - 과거 입고 내역 조회 (읽기 전용)
- **Phase 5.4**: [재고 조회](phase-5.4-hospital-inventory.md) - 보유 제품 현황
- **Phase 5.5**: [반품](phase-5.5-hospital-return.md) - 유통사로 제품 반품
- **Phase 5.6**: [폐기](phase-5.6-disposal.md) - 불량/만료 제품 처리
- **Phase 5.7**: [거래 이력 조회](phase-5.7-hospital-history.md) - 시술/회수/반품 이력
- **Phase 5.8**: [통합 테스트](phase-5.8-integration-tests.md) - 병원 기능 E2E 테스트

## 주요 기능

1. **시술 등록** (Phase 5.1): 제품 종류 선택 + 수량 입력 → 장바구니 → 환자 전화번호 입력 → FIFO 자동 할당 → 인증 발급
   - ⚠️ **중요**: 가상 코드는 실물이 없으므로 스캔 방식 불가, 제품 선택 + 수량 입력 필수
2. **회수** (Phase 5.2): 24시간 이내 시술 취소 및 알림 발송
3. **입고 이력 조회** (Phase 5.3): 과거 입고 내역 조회 (읽기 전용)
   - ⚠️ **PRD 참조**: PRD Section 5.3에 따라 병원은 유통사/제조사 출고 시 **즉시 소유권 이전** (Pending 없음)
   - 입고 수락 액션 불필요, Phase 4.3에서 출고 시 자동으로 병원 재고 반영
4. **재고 조회** (Phase 5.4): 보유 제품 현황 및 사용기한 관리
5. **반품** (Phase 5.5): 유통사로 제품 반품 (승인 필요)
6. **폐기** (Phase 5.6): 불량/만료 제품 처리
7. **이력** (Phase 5.7): 시술/회수/반품/폐기 이력 조회

## 핵심 비즈니스 로직

### 시술 등록
```typescript
const registerTreatment = async (
  products: { productId: string; quantity: number }[],
  patientPhone: string
) => {
  // 1. Patient 생성 (없으면)
  // 2. TreatmentRecord 생성
  // 3. Virtual Codes 할당 (FIFO)
  // 4. 상태 변경: IN_STOCK → USED
  // 5. 소유권 이전: organization → patient
  // 6. TreatmentDetails 생성
  // 7. NotificationMessage 생성 (인증)
  // 8. History 기록
}
```

### 회수 (24시간 제한)
```typescript
const recallTreatment = async (treatmentId: string, codes: VirtualCode[]) => {
  const treatment = await getTreatment(treatmentId)
  const elapsed = Date.now() - new Date(treatment.created_at).getTime()

  if (elapsed > TIME_LIMITS.RECALL_WINDOW) {
    throw new Error(ERROR_MESSAGES.RECALL_TIME_EXCEEDED)
  }

  // 1. 상태 변경: USED → IN_STOCK
  // 2. 소유권 복귀: patient → organization
  // 3. NotificationMessage 생성 (회수)
  // 4. History 기록
}
```

---

**다음**: [Phase 6 - 관리자 기능](../phase-6/)
