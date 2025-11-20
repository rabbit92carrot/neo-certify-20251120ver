# Phase 3: 제조사 기능

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
