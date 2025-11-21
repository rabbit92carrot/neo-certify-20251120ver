# Phase 6: 관리자 및 Mock KakaoTalk

## 📋 개요

**목표**: 관리자 기능 + Mock KakaoTalk 페이지 완성
**기간**: 4-6일
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
- **원칙 4 (Clean Code)**: 관리자 UI - 테이블 컬럼 정의 명확히 분리
- **원칙 7 (Frontend-First)**: Mock KakaoTalk - UI 먼저 DB 연동 나중
- **원칙 1 (SSOT)**: 알림 템플릿 - notifications.ts 상수 활용

**상세 내용**: [DEVELOPMENT_PRINCIPLES.md](../../DEVELOPMENT_PRINCIPLES.md)

---

## 세부 계획 (5개 유닛)

- **Phase 6.1**: 조직/사용자 관리
- **Phase 6.2**: 전체 이력 조회 (TanStack Table + 무한스크롤)
- **Phase 6.3**: 회수 이력 모니터링
- **Phase 6.4**: Mock KakaoTalk 알림 페이지
- **Phase 6.5**: 통합 테스트

## 주요 기능

1. **조직 관리**: 가입 승인, 비활성화, 삭제
2. **사용자 관리**: 전체 사용자 조회
3. **전체 이력**: Excel형 테이블, 고급 필터링
4. **회수 모니터링**: 24시간 이내 회수 이력 추적
5. **Mock 알림톡**: DB 메시지 카카오톡 형태로 표시

## Mock KakaoTalk 페이지

### 기능
- 카카오톡 UI 스타일 Mock 페이지
- `notification_messages` 테이블 데이터 조회
- 인증/회수 메시지 구분 표시
- 스크롤 가능한 메시지 목록

### 메시지 포맷
```typescript
// 인증 메시지
const authMessage = `
[네오인증서] 정품 인증 완료

안녕하세요.
{시술일}에 {병원명}에서 시술받으신 
제품의 정품 인증이 완료되었습니다.

■ 시술 정보
- 제품: {제품명} {수량}개
- 제조사: {제조사명}
- 시술일: {시술일}
- 시술 병원: {병원명}

본 제품은 정품임이 확인되었습니다.
`

// 회수 메시지
const recallMessage = `
[네오인증서] 정품 인증 회수 안내

안녕하세요.
{병원명}에서 발급한 정품 인증이 
회수되었음을 안내드립니다.

■ 회수 정보
- 병원: {병원명}
- 회수 사유: {회수사유}
- 회수 제품: {제품명} {수량}개

문의사항은 해당 병원으로 연락해주세요.
`
```

---

**다음**: [Phase 7 - 비즈니스 로직 통합](../phase-7/)
