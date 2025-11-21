# Phase 4: 유통사 기능

## 📋 개요

**목표**: 입고 처리, 병원 출고, 재고 및 반품 기능 완성
**기간**: 5-7일
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
- **원칙 4 (Clean Code)**: Pending 워크플로우 - accept/reject 로직 명확히 분리
- **원칙 8 (범위 완료)**: 소유권 이전 모델 - owner_id, pending_to, previous_owner_id 완벽 추적
- **원칙 8 (범위 완료)**: 반품 상태 관리 - PENDING_RETURN, RETURNED 상태 전환 완전 검증

**상세 내용**: [DEVELOPMENT_PRINCIPLES.md](../../DEVELOPMENT_PRINCIPLES.md)

---

## 세부 계획 (6개 유닛)

- **Phase 4.1**: Pending 목록 조회 UI
- **Phase 4.2**: 입고 수락/반품 처리
- **Phase 4.3**: 출고 (장바구니 + FIFO)
- **Phase 4.4**: 재고 조회
- **Phase 4.5**: 거래 이력 조회
- **Phase 4.6**: 통합 테스트

## 주요 기능

1. **Pending 관리**: 입고 대기 제품 조회 및 수락/반품
2. **출고**: 다른 유통사 또는 병원으로 출고 (FIFO 자동)
3. **재고**: 보유 제품 조회
4. **이력**: 입고/출고 이력 추적

## 핵심 워크플로우

### Pending 수락 ⭐ 업데이트: 즉시 소유권 이전 모델
```typescript
const acceptPending = async (pendingCodes: VirtualCode[]) => {
  // ⭐ 출고 시 이미 owner_id = 유통사로 이전되었음
  // 수락: pending_to만 초기화하면 됨

  // 1. 상태 변경: PENDING → IN_STOCK
  // 2. owner_id는 이미 현재 조직 (변경 불필요)
  // 3. pending_to 초기화
  // 4. History 기록

  await supabase
    .from(DATABASE_CONSTANTS.TABLES.VIRTUAL_CODES)
    .update({
      [DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.STATUS]: 'IN_STOCK',
      [DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.PENDING_TO]: null,
    })
    .in('id', pendingCodes.map(c => c.id))
}
```

### Pending 반품 ⭐ 업데이트: previous_owner_id 활용
```typescript
const rejectPending = async (pendingCodes: VirtualCode[], reason: string) => {
  // ⭐ previous_owner_id를 사용하여 이전 소유자에게 반품

  // 1. 상태 변경: PENDING → IN_STOCK
  // 2. 소유권 복원: owner_id = previous_owner_id
  // 3. previous_owner_id 초기화
  // 4. pending_to 초기화
  // 5. History 기록 (반품 사유 포함)

  await supabase
    .from(DATABASE_CONSTANTS.TABLES.VIRTUAL_CODES)
    .update({
      [DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.STATUS]: 'IN_STOCK',
      [DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.OWNER_ID]: pendingCodes[0].previous_owner_id,
      [DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.PREVIOUS_OWNER_ID]: null,
      [DATABASE_CONSTANTS.COLUMNS.VIRTUAL_CODES.PENDING_TO]: null,
    })
    .in('id', pendingCodes.map(c => c.id))
}
```

---

**다음**: [Phase 5 - 병원 기능](../phase-5/)
