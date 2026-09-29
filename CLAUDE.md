@AGENTS.md

# LEET Elite (리트 엘리트) — 프로젝트 규칙

LEET영어학원 전용 학원 관리 앱. 원장님(총괄관리자)·선생님·학생·학부모·키패드(학원 입구 태블릿)가 한 앱을 역할별로 쓴다. 에듀OK를 대체한다.

## 문서 (먼저 읽기)
- `docs/requirements.md` 요구사항 정의서 (기능 ID: AUTH, HOME, STU, CLS, TCH, ATT, KIOSK, HW, MKP, MSG, NOTI)
- `docs/data-model.md` 데이터 구조, RLS 원칙
- `docs/screens.md` 화면 명세 (화면별 구성·동작·요구사항 ID)
- `docs/decisions.md` 확정된 결정 사항 — 여기와 다르게 구현하지 않는다
- `docs/progress.md` 단계별 진행 현황

## 스택
Next.js 16 (App Router, `src/`), Tailwind v4, Supabase (Postgres·Auth·Storage·Realtime), Vercel, PWA + Web Push.
Next 16은 이전 버전과 다르다: 코드를 쓰기 전에 `node_modules/next/dist/docs/`를 확인한다 (middleware → `proxy.ts` 등).

## 디자인
- 화면은 `src/components/ui/`의 공통 부품만 쓴다. 새 모양이 필요하면 부품을 추가하고 `/design` 스타일 가이드에 등록한다
- 색은 `globals.css`의 토큰만 쓴다 (`brand`, `brand-dark`, `ink`, `sub`, `line`, 상태색 `ok/warn/info`). 임의의 hex 금지
- 기본 글씨 14px, 본문 정보 14~15px, 이름·제목 16px 이상. 11~12px 글씨는 쓰지 않는다
- 모서리 6px(버튼·입력) / 8px(패널). 알약 모양·과한 그림자·그라데이션 금지
- 원장님이 익숙한 에듀OK 구성을 따른다: 3단 상단 메뉴, 상태별 색 타일, 하단 일괄 처리 줄

## 코드 규칙
- 날짜·시간은 항상 한국 시간: `src/lib/date.ts`의 `todayKST()`, `nowTimeKST()`를 쓴다. `toISOString().slice(0,10)` 금지
- 학생은 이름이 아니라 ID로 연결한다 (동명이인)
- 권한은 화면에서 숨기는 것만으로 판단하지 않는다. 서버·RLS에서 검증한다
- 주석과 화면 문구는 한국어

## 개인정보·보안 (중요)
- 저장소는 Public이다. 실제 학생 이름·전화번호·원장님 계정·Supabase 키를 코드나 문서에 넣지 않는다
- 개발은 `src/lib/mock/`의 가상 데이터만 쓴다 (전화번호는 010-5550~5559 대역)
- 원장님 원본 자료(`../요구사항_원장님.txt`, `../_beta-src/`)는 저장소 밖에 있고, 참고만 한다
- 커밋 전에 반드시 검사: `git diff --cached | grep -nE "sb_secret_|sb_publishable_[A-Za-z0-9]{10}|010-?[0-9]{4}-?[0-9]{4}"` (010-555x 제외)

## 확인 명령
- `npx tsc --noEmit` / `npx eslint src --quiet` / `npm run build`
- 화면 확인: `npm run dev` 후 http://localhost:3000 (시연용 시각 지정: `/teacher?at=16:00`)
