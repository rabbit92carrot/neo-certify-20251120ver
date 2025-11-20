# Phase 4: 유통사 기능

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

### Pending 수락
```typescript
const acceptPending = async (pendingCodes: VirtualCode[]) => {
  // 1. 상태 변경: PENDING → IN_STOCK
  // 2. 소유권 이전: pending_to → owner_id
  // 3. pending_to 초기화
  // 4. History 기록

  await supabase
    .from('virtual_codes')
    .update({
      status: 'IN_STOCK',
      owner_id: currentOrg.id,
      pending_to: null,
    })
    .in('id', pendingCodes.map(c => c.id))
}
```

### Pending 반품
```typescript
const rejectPending = async (pendingCodes: VirtualCode[], reason: string) => {
  // 1. 상태 변경: PENDING → IN_STOCK
  // 2. 소유권 유지 (변경 없음)
  // 3. pending_to 초기화
  // 4. History 기록 (반품 사유 포함)
}
```

---

**다음**: [Phase 5 - 병원 기능](../phase-5/)
