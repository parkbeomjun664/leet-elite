@AGENTS.md

# LEET Elite (리트 엘리트) — 프로젝트 규칙

LEET영어학원 전용 학원 관리 앱(PWA). 에듀OK의 출결·숙제·소통 기능을 대신한다. 교육비·전체 관리는 에듀OK를 계속 쓴다 (10/1 원장님).
새 세션은 **`docs/progress.md`의 "세션 기록"을 먼저 읽고** 이어서 작업한다.

## 스택
- Next.js 16 (App Router, `src/`) + Supabase (서울 리전, Postgres·Auth·Storage·Realtime) + Tailwind v4 + Vercel, PWA + Web Push
- shadcn/ui는 초기화하지 않았다. `src/components/ui/`의 자체 부품을 쓰고, 필요한 shadcn 부품만 하나씩 가져온다 (10/5 결정)
- 아이콘 lucide-react, 폼 react-hook-form + zod, 테스트 vitest(단위)·Playwright(화면 흐름)
- Next 16은 이전 버전과 다르다(middleware → `proxy.ts` 등). 문서는 context7(Next.js·Supabase)로 확인한다

## 사용자와 권한
- 5종: 원장님(admin) · 선생님(teacher, 담당 반 학생만) · 학생(student, 본인만) · 학부모(parent, 자녀만) · 출결 키패드(kiosk, 출결 함수만)
- 권한은 화면에서 숨기는 것으로 판단하지 않는다. Supabase RLS로 막는다 (`supabase/migrations/`, 테스트 `supabase/tests/rls_check.sql`)
- 범위 제외: 교육비 청구·수납, 클래스카드 연동, 문자·알림톡, 구글 로그인

## 문서 (필요한 부분만 찾아 읽기)
| 문서 | 내용 |
|---|---|
| `docs/progress.md` | 세션 기록, 단계별 일정 |
| `docs/requirements.md` | 요구사항 (ID: AUTH, HOME, STU, CLS, TCH, ATT, KIOSK, HW, MKP, MSG, NOTI) |
| `docs/data-model.md` | 표 구조, RLS 원칙 |
| `docs/screens.md` | 화면별 구성·동작 |
| `docs/decisions.md` | 확정된 결정 — 여기와 다르게 구현하지 않는다 |
| `docs/requests-2026-10-02.md` | 원장님 추가 요청 1~7 (계획만, 미반영) |
| `docs/handover/` | 납품 문서 (DB 구조·초기화 등) |

## 디자인
- 색은 `src/app/globals.css`의 토큰만 쓴다. 임의의 hex 금지
  - 휴대폰(학생·학부모): 바탕 `mpage` #F7F6F4 · 카드 `surface` #FFFFFF · 테두리 `border` #ECEAE6 · 브랜드 `brand` #B3262E(로고·주요 버튼만)
  - 상태: `status-ok` #EAF5EE/#2E7D4F(등원·제출함) · `status-warn` #FDF3E1/#A6650A(미제출) · `status-alert` #FCEBEC/#B3262E(결석, 분홍은 결석에만)
  - 상태→색은 `src/lib/status-colors.ts` 함수 하나로
  - 관리 화면(원장님·선생님): 흰 바탕, 회색 `bg`/`line`/`sub`, 상태색 `ok`/`warn`/`info`
- 테두리 대신 바탕색 단차·여백으로 구분. 그라데이션·짙은 그림자 금지. 모서리 관리 화면 6~8px, 휴대폰 카드 12px
- 글씨 위계: 라벨 13px 회색 / 본문 14~15px / 핵심 숫자·제목 22~24px
- 화면은 `src/components/ui/`, `src/components/mobile/`의 공통 부품을 쓴다

## 코드 규칙
- 날짜·시간은 한국 시간: `src/lib/date.ts`의 `todayKST()`, `nowTimeKST()`. `toISOString().slice(0,10)` 금지
- 학생은 이름이 아니라 ID로 연결한다 (동명이인)
- 주석과 화면 문구는 한국어
- Supabase 작업은 `supabase`·`supabase-postgres-best-practices` 스킬, React 성능은 `vercel-react-best-practices` 기준을 따른다

## 작업 규칙
- 기능 단위나 되돌리기 어려운 작업(DB 적용·로그인·배포·외부 설정)은 **계획을 먼저 보여 주고 확인받는다**. 작은 수정은 바로 한다
- 기능을 추가하면 테스트를 함께 쓰고, 끝나면 테스트 결과를 보고한다
- 파일 전체를 다시 읽지 말고 필요한 부분만 읽는다 (Grep으로 찾고 범위를 정해 Read)
- 기능마다 검사(tsc·eslint·test) 후 로컬 커밋. **GitHub 푸시는 매번 범준님께 묻는다** (main 푸시 = 시연 주소 자동 배포)
- 작업을 마치면 `docs/progress.md` 세션 기록에 한 일·결정사항·남은 일을 적는다

## 개인정보·보안 (중요)
- 저장소는 Public이다. 실제 학생 이름·전화번호·원장님 계정·Supabase 키를 코드·문서·커밋에 넣지 않는다
- 개발은 `src/lib/mock/` 가상 데이터만 쓴다 (전화번호 010-5550~5559 대역)
- 실제 명단 시험: 명단은 저장소 밖 `../_private/eduok-students.json`에만 둔다. 있으면 화면에 "실제 명단 사용 중"이 뜬다
  - 이 상태의 화면은 밖으로 보내지 않는다. 문서·확인서 캡처는 `LEET_REAL_DATA=0`으로 켠 서버에서 찍는다
  - `_private` 내용을 코드·문서·커밋 메시지에 옮겨 적지 않는다
- 원장님 원본 자료(`../요구사항_원장님.txt`, `../_beta-src/`)는 참고만 한다
- 키는 `.env.local`에만. Supabase MCP는 dev 프로젝트 read-only로만 (`.mcp.json`), 운영 프로젝트 키는 쓰지 않는다
- 커밋 전 검사: `git diff --cached | grep -nE "sb_secret_|sb_publishable_[A-Za-z0-9]{10}|010-?[0-9]{4}-?[0-9]{4}"` (010-555x 제외)

## 명령어
| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 http://localhost:3000 (시연 시각: `/teacher?at=16:00`) |
| `npm run build` | 빌드 |
| `npm test` | 단위 테스트 (vitest) |
| `npm run test:e2e` | 화면 흐름 테스트 (Playwright, 설치된 Chrome 사용, 가상 데이터) |
| `npm run lint` / `npx tsc --noEmit` | 코드 규칙·타입 검사 |
| 권한 테스트 | `docs/handover/database.md` 4번 |

시연 주소: https://leet-elite.vercel.app (로그인 1234/1234, 가상 데이터)
