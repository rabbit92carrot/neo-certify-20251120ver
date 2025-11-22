# Phase 7: 통합 테스트 및 최적화

## 📋 개요

**목표**: MVP 핵심 로직 구현 및 전체 기능 통합 테스트
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
- **원칙 5 (Test-Driven)**: E2E 테스트 - 전체 플로우 시나리오 100% 커버
- **원칙 9 (메모리 알림)**: 통합 테스트 실행 - 메모리 부족 시 사용자 알림
- **원칙 8 (범위 완료)**: 동시성 테스트 - 락 경합 상황 재현 및 검증 완전 구현

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
- [ ] **PRD 용어 준수**: 'FIFO' (NOT '선입선출'), 'Advisory Lock' (NOT '잠금')

---

## 세부 계획 (6개 유닛)

- **Phase 7.1**: [FIFO 알고리즘 구현 및 테스트](phase-7.1-fifo-algorithm.md)
- **Phase 7.2**: [Virtual Code 생성 및 할당 로직](phase-7.2-virtual-code.md)
- **Phase 7.3**: [Pending 상태 워크플로우](phase-7.3-pending-workflow.md)
- **Phase 7.4**: [동시성 처리 (락 메커니즘)](phase-7.4-concurrency.md)
- **Phase 7.5**: [E2E 테스트 (Playwright)](phase-7.5-e2e-test.md)
- **Phase 7.6**: [성능 최적화 및 버그 수정](phase-7.6-optimization.md)

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
