# Phase 5: 병원 기능

## 세부 계획 (6개 유닛)

- **Phase 5.1**: 시술 등록 (장바구니 + 환자 전화번호)
- **Phase 5.2**: 회수 (24시간 제한)
- **Phase 5.3**: 반품
- **Phase 5.4**: 재고 조회
- **Phase 5.5**: 거래 이력 조회
- **Phase 5.6**: 통합 테스트

## 주요 기능

1. **시술 등록**: 다중 제품 + 환자 전화번호 → 인증 발급
2. **회수**: 24시간 이내 시술 취소 및 알림 발송
3. **반품**: 유통사로 제품 반품
4. **재고**: 보유 제품 조회
5. **이력**: 시술/회수/반품 이력

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
