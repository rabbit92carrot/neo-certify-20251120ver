# Phase 0.1: Git Repository 초기화

## 📋 개요

**목표**: Git repository 설정 및 기본 문서 커밋
**선행 조건**: 없음 (첫 단계)
**예상 소요 시간**: 30분

---

## 🎯 개발 원칙 준수 체크리스트

- [x] SSOT: 해당 없음 (인프라 설정)
- [x] No Magic Numbers: 해당 없음
- [x] No 'any' type: 해당 없음
- [x] Clean Code: `.gitignore` 파일 정리
- [ ] 테스트 작성: 해당 없음 (인프라)
- [x] Git commit: Conventional Commits 준수
- [ ] 원칙 8: 작업 범위 100% 완료 (시간 무관)
- [ ] 원칙 9: Context 메모리 부족 시 사용자 알림

---

## 📦 작업 내용

### 1. Git 초기화
```bash
cd /mnt/d/workspace/github/neo-certify-20251120ver
git init
git branch -m main
```

### 2. Git 사용자 설정
```bash
git config user.name "rabbit92carrot"
git config user.email "rabbit92carrot@gmail.com"
```

### 3. .gitignore 파일 생성

**파일 위치**: `/.gitignore`

**포함 항목**:
```gitignore
# Dependencies
node_modules/

# Environment variables (민감정보 보호)
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Production
/build
/dist

# Supabase
.supabase/

# Logs
*.log

# Editor
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store

# Sensitive files
*.pem
*.key
credentials.json
secrets.json
```

**보안 중요사항**:
- 모든 환경 변수 파일 제외
- API 키, 인증서 파일 제외
- 민감한 개인정보 파일 제외

### 4. 기존 문서 커밋

```bash
git add .gitignore
git commit -m "chore: Initialize git repository with gitignore"

git add neo-cert-prd-1.2.md UI-design-direction.png
git commit -m "docs: Add PRD v1.2 and UI design reference"
```

### 5. Remote Repository 연결

```bash
git remote add origin https://github.com/rabbit92carrot/neo-certify-20251120ver.git
```

**Note**: Push는 모든 기반 파일 작성 후 한 번에 수행 (Phase 0.5 이후)

---

## 📝 TypeScript 타입 정의

해당 없음 (인프라 설정)

---

## 🔧 Constants 정의

해당 없음

---

## 📁 생성/수정 파일 목록

- `/.git/` (생성)
- `/.gitignore` (생성)
- `/neo-cert-prd-1.2.md` (기존, git 추가)
- `/UI-design-direction.png` (기존, git 추가)

---

## ✅ 테스트 요구사항

해당 없음 (인프라 설정)

### 수동 검증
```bash
# Git 상태 확인
git status

# Remote 연결 확인
git remote -v

# 커밋 이력 확인
git log --oneline
```

**예상 출력**:
```
3319db2 chore: Initialize git repository with gitignore
590ca79 docs: Add PRD v1.2 and UI design reference
```

---

## 🔄 Git Commit

```bash
# Commit 1
git commit -m "chore: Initialize git repository with gitignore"

# Commit 2
git commit -m "docs: Add PRD v1.2 and UI design reference"
```

**Commit Convention**:
- Type: `chore` (인프라), `docs` (문서)
- Scope: 생략 가능
- Subject: 영어 또는 한글, 명령형

---

## ✔️ 완료 기준 (Definition of Done)

- [x] Git repository 초기화 완료
- [x] `.gitignore` 생성 (민감정보 보호 확인)
- [x] Git 사용자 정보 설정
- [x] 기존 문서 커밋 (2개 commit)
- [x] Remote repository 연결
- [ ] Push (Phase 0.5 이후)
- [x] 다음 Phase 진행 가능 상태

---

## 🔗 참고 자료

- [Git 공식 문서](https://git-scm.com/doc)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub .gitignore 템플릿](https://github.com/github/gitignore)

---

## ⚠️ 주의사항

1. **절대 커밋하지 말아야 할 것**:
   - `.env` 파일 (환경 변수)
   - API 키, 비밀번호
   - `node_modules/`
   - 개인정보 포함 파일

2. **실수 시 대처**:
   ```bash
   # 민감정보를 실수로 커밋한 경우
   git reset --soft HEAD~1  # 마지막 커밋 취소
   git rm --cached <file>   # Git에서만 제거
   ```

3. **Branch 전략**:
   - Main branch에서 직접 개발
   - Phase별 커밋으로 이력 관리

---

## ⏭️ 다음 단계

[Phase 0.2 - 프로젝트 생성](phase-0.2-project-setup.md)

**작업 내용**:
- Vite + React + TypeScript 프로젝트 초기화
- package.json 생성
- Tailwind CSS 설정
