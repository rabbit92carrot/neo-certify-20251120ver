# Phase 7: 비즈니스 로직 및 통합

## 세부 계획 (6개 유닛)

- **Phase 7.1**: FIFO 알고리즘 구현 및 테스트
- **Phase 7.2**: Virtual Code 생성 및 할당 로직
- **Phase 7.3**: Pending 상태 워크플로우
- **Phase 7.4**: 동시성 처리 (락 메커니즘)
- **Phase 7.5**: E2E 테스트 (Playwright)
- **Phase 7.6**: 성능 최적화 및 버그 수정

## 주요 작업

### 1. FIFO 알고리즘 완성
- Lot 정렬 로직
- Virtual Code 할당 로직
- 재고 부족 처리
- 테스트 (여러 시나리오)

### 2. 동시성 처리
```typescript
// PostgreSQL Advisory Lock 사용
const withLock = async (lockId: number, fn: () => Promise<void>) => {
  await supabase.rpc('pg_advisory_lock', { lock_id: lockId })
  try {
    await fn()
  } finally {
    await supabase.rpc('pg_advisory_unlock', { lock_id: lockId })
  }
}

// 제품 출고 시 락 사용
const shipProduct = async (productId: string, quantity: number) => {
  const lockId = hashProductId(productId) // 제품별 고유 락
  await withLock(lockId, async () => {
    // 재고 확인 및 할당
    const available = await getAvailableStock(productId)
    if (available < quantity) throw new Error('재고 부족')

    // 출고 처리
    await allocateAndShip(productId, quantity)
  })
}
```

### 3. E2E 테스트 시나리오
1. **제조사 → 유통사 → 병원 → 환자** 전체 플로우
2. **Pending 승인/거부** 플로우
3. **회수** (24시간 이내)
4. **반품** 플로우
5. **동시 출고** (동시성 테스트)

---

**다음**: [Phase 8 - 프로덕션 준비](../phase-8/)
