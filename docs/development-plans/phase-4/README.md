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

## ✅ 일관성 체크리스트

이 Phase 구현 시 다음 사항을 반드시 확인:

- [ ] **TERMINOLOGY 상수 사용**: 모든 UI 텍스트는 `@/constants/terminology` import
- [ ] **하드코딩 금지**: 한글/영문 텍스트 직접 입력 없음
- [ ] **표준 import 패턴**:
  ```typescript
  import { TERMINOLOGY, VALIDATION, ERROR_MESSAGES } from '@/constants'
  ```
- [ ] **'any' 타입 미사용**: 모든 타입 명시적 정의
- [ ] **PRD 용어 준수**: 'Virtual Code' (NOT '가상코드'), 'Pending' (NOT '대기')

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

### 🔥 Pending 소유권 모델 (실험적 접근 - Option 2)

**PRD Section 5.5 기반 + 최적화된 플로우**

#### 📌 모델 개요

전통적인 Pending 모델과 다르게, 본 시스템은 **출고 시점에 즉시 소유권을 이전**합니다.

```
전통적 모델 (Option 1):
출고 → owner_id 유지 (발송자) → 입고 수락 → owner_id 변경 (수신자)

본 시스템 (Option 2):
출고 → owner_id 즉시 변경 (수신자) → 입고 수락 → pending_to만 해제
```

#### 📌 상태 전이 다이어그램

**제조사 → 유통사 출고 시**:
```typescript
// Phase 1.3: shipment_transaction(p_to_org_type='DISTRIBUTOR')
{
  status: 'IN_STOCK' → 'PENDING',
  owner_id: '제조사 UUID' → '유통사 UUID',  // ⭐ 즉시 소유권 이전
  previous_owner_id: null → '제조사 UUID',  // 반품 시 복원용
  pending_to: null → '유통사 UUID',         // 승인 대기 표시
}
```

**유통사 입고 수락 시**:
```typescript
{
  status: 'PENDING' → 'IN_STOCK',
  owner_id: '유통사 UUID' (유지),      // ⭐ 이미 소유자
  previous_owner_id: '제조사 UUID',   // 유지
  pending_to: '유통사 UUID' → null,   // 승인 완료
}
```

**유통사 입고 거부 시**:
```typescript
{
  status: 'PENDING' → 'IN_STOCK',
  owner_id: '유통사 UUID' → '제조사 UUID',  // previous_owner_id로 복원
  previous_owner_id: '제조사 UUID' → null,
  pending_to: '유통사 UUID' → null,
}
```

#### 📌 장점

1. **반품 로직 단순화**: `previous_owner_id`로 즉시 복원
2. **RLS 정책 최적화**: `owner_id` 기반 단일 필터링
3. **재고 조회 성능**: PENDING 상태도 소유자 재고로 집계 가능
4. **트랜잭션 일관성**: 출고 시점에 소유권 결정 완료

#### 📌 주의사항

- "Pending" = 물리적 소유 대기가 **아닌** "승인 대기"
- 법적 책임은 `owner_id`가 아닌 물리적 위치 기준 (별도 정책 필요)
- 전통적 플로우 기대 시 혼란 가능 (문서화 중요)

---

### Pending 수락 구현

```typescript
const acceptPending = async (virtualCodeIds: string[]) => {
  // Phase 1.3: shipment_transaction() 사용 시 이미 owner_id = 유통사

  await supabase
    .from('virtual_codes')
    .update({
      status: 'IN_STOCK',      // 승인 완료
      pending_to: null,         // 대기 해제
      // owner_id는 변경 불필요 (이미 소유자)
    })
    .in('id', virtualCodeIds)

  // History 기록 (RECEIVE 액션)
  await supabase.from('history').insert(
    virtualCodeIds.map(vcId => ({
      virtual_code_id: vcId,
      action_type: 'RECEIVE',
      from_owner_type: 'organization',
      from_owner_id: manufacturerId,
      to_owner_type: 'organization',
      to_owner_id: distributorId,
    }))
  )
}
```

### Pending 반품 구현

```typescript
const rejectPending = async (virtualCodeIds: string[], reason: string) => {
  // 1. Virtual Code 조회 (previous_owner_id 확인)
  const { data: virtualCodes } = await supabase
    .from('virtual_codes')
    .select('*, previous_owner_id')
    .in('id', virtualCodeIds)

  if (!virtualCodes[0].previous_owner_id) {
    throw new Error('이전 소유자 정보가 없습니다.')
  }

  // 2. 소유권 복원
  await supabase
    .from('virtual_codes')
    .update({
      status: 'IN_STOCK',
      owner_id: virtualCodes[0].previous_owner_id,  // ⭐ 복원
      previous_owner_id: null,
      pending_to: null,
    })
    .in('id', virtualCodeIds)

  // 3. History 기록 (RETURN 액션)
  await supabase.from('history').insert(
    virtualCodeIds.map(vcId => ({
      virtual_code_id: vcId,
      action_type: 'RETURN',
      from_owner_type: 'organization',
      from_owner_id: distributorId,
      to_owner_type: 'organization',
      to_owner_id: virtualCodes[0].previous_owner_id,
    }))
  )
}
```

---

**다음**: [Phase 5 - 병원 기능](../phase-5/)
