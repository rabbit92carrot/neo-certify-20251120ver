# Phase 3: 제조사 기능

## 📋 개요

**목표**: 제품 관리, 생산, 출고, 재고 기능 완성
**기간**: 7-10일
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
- **원칙 5 (Test-Driven)**: FIFO 알고리즘 테스트 - 모든 엣지 케이스 검증
- **원칙 8 (범위 완료)**: Virtual Code 생성 로직 - 충돌 재시도, sequence_number 정확성 완전 구현
- **원칙 8 (범위 완료)**: 트랜잭션 처리 - Lot 생성 + Virtual Code 생성 원자성 완전 보장

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
- [ ] **PRD 용어 준수**: '제품 종류' (NOT '제품'), 'Lot' (NOT '배치')

---

## 세부 계획 (8개 유닛)

- **Phase 3.1**: 제품 목록 조회 UI
- **Phase 3.2**: 제품 CRUD (등록/수정/비활성화)
- **Phase 3.3**: 제조사 설정 (Lot 정규식, 사용기한)
- **Phase 3.4**: Lot 생산 등록 (자동 번호 생성)
- **Phase 3.5**: 출고 (장바구니 + FIFO/Lot 선택)
- **Phase 3.6**: 재고 조회 (제품별/일자별)
- **Phase 3.7**: 거래 이력 조회
- **Phase 3.8**: 통합 테스트

## 주요 기능

1. **제품 관리**: 제품 종류 등록, 수정, 비활성화
2. **Lot 생산**: 자동 Lot 번호 생성, Virtual Code 생성
3. **출고**: FIFO 기반 자동 할당 또는 특정 Lot 선택
4. **재고**: 제품별 총량 + 일자별 상세 조회
5. **이력**: 생산/출고 이력 추적

## 핵심 비즈니스 로직

### FIFO 알고리즘
```typescript
// 먼저 생산된 Lot부터 우선 출고
const allocateVirtualCodes = (quantity: number, productId: string) => {
  const lots = await getLotsByProduct(productId)
    .orderBy('manufacture_date', 'asc')

  // Lot별로 순차 할당
  let remaining = quantity
  const allocated = []

  for (const lot of lots) {
    const available = await getAvailableCodesInLot(lot.id)
    const take = Math.min(remaining, available.length)
    allocated.push(...available.slice(0, take))
    remaining -= take
    if (remaining === 0) break
  }

  return allocated
}
```

### Virtual Code 생성
```typescript
const generateVirtualCodes = (lot: Lot, quantity: number) => {
  const codes = []
  for (let i = 0; i < quantity; i++) {
    codes.push({
      code: generateUniqueCode(), // UUID 또는 간결한 형식
      lot_id: lot.id,
      status: 'IN_STOCK',
      owner_type: 'organization',
      owner_id: manufacturer.id,
    })
  }
  return codes
}
```

---

**각 세부 계획은 별도 markdown 파일로 작성 예정**

**다음**: [Phase 4 - 유통사 기능](../phase-4/)
