# 코드 둘러보기 (공부용)

프로젝트를 하면서 계속 채워 가는 문서입니다. 끝나고 코드 공부할 때 이 순서대로 보면 됩니다.

## 1. 한 줄 요약
**Next.js**로 만든 웹 앱입니다. 화면(React 컴포넌트)과 서버 코드가 한 프로젝트에 같이 있고, 데이터는 **Supabase**(데이터베이스 서비스)에 저장합니다. 지금은 DB 연결 전이라 `src/lib/mock/`의 가상 데이터로 화면이 돌아갑니다.

## 2. 폴더 지도
```
leet-elite/
├ src/
│ ├ app/            ← 주소(URL) = 폴더 이름. 여기 있는 page.tsx가 곧 화면
│ │ ├ login/        → /login
│ │ ├ teacher/      → /teacher (선생님)
│ │ ├ admin/        → /admin (원장님)
│ │ ├ student/      → /student (학생)
│ │ ├ parent/       → /parent (학부모)
│ │ ├ kiosk/        → /kiosk (출결 키패드)
│ │ ├ design/       → /design (스타일 가이드)
│ │ ├ layout.tsx    ← 모든 화면을 감싸는 틀 (글꼴, 한국어 설정)
│ │ └ globals.css   ← 색·글씨 같은 디자인 기준값
│ ├ components/     ← 여러 화면에서 쓰는 조각
│ │ ├ ui/           ← 공통 부품 (버튼, 입력칸, 표 …) ★ 모든 화면이 이것만 씀
│ │ ├ attendance/   ← 출결 현황판, 출결 입력 창
│ │ ├ students/     ← 학생 상세, 재원생 표
│ │ ├ kiosk/        ← 키패드
│ │ ├ mobile/       ← 학생·학부모 휴대폰 화면 틀
│ │ └ top-bar.tsx   ← 상단 메뉴
│ └ lib/            ← 화면이 아닌 계산·도우미
│   ├ date.ts       ← 한국 시간 계산 ★
│   ├ attendance.ts ← 미등원 판정 ★
│   ├ nav.ts        ← 메뉴 목록
│   └ mock/         ← 가상 데이터 (나중에 DB로 교체)
├ docs/             ← 설계 문서
└ public/           ← 이미지 (로고)
```

## 3. 먼저 알아 둘 개념 5개
| 개념 | 쉽게 말하면 | 예시 파일 |
|---|---|---|
| **컴포넌트** | 화면을 레고 블록처럼 쪼갠 것. `<Button>`처럼 태그로 가져다 씀 | `src/components/ui/button.tsx` |
| **props** | 블록에 넘기는 설정값. `<Button variant="primary">`의 `variant` | 같은 파일 |
| **state (useState)** | 화면이 기억하는 값. 바뀌면 화면이 다시 그려짐 (선택한 반, 입력 중인 번호) | `src/components/kiosk/keypad.tsx` |
| **서버 컴포넌트 / 클라이언트 컴포넌트** | 서버에서 미리 그려 보내는 부분 / 브라우저에서 눌러서 반응하는 부분. 파일 맨 위 `"use client"`가 있으면 클라이언트 | `src/app/teacher/page.tsx`(서버) → `attendance-board.tsx`(클라이언트) |
| **Tailwind 클래스** | 스타일을 이름표로 붙이는 방식. `bg-brand`=버건디 배경, `text-sub`=회색 글씨, `px-4`=좌우 여백 16px | 모든 화면 |

## 4. 추천 공부 순서
1. `src/lib/date.ts` — 짧고, 순수한 계산이라 읽기 쉬움. "왜 한국 시간을 따로 계산하나"
2. `src/lib/attendance.ts` — 미등원 판정 규칙. 조건문 연습
3. `src/components/ui/button.tsx` → `field.tsx` — 컴포넌트와 props
4. `src/app/teacher/page.tsx` — 서버에서 데이터를 모아 화면에 넘기는 흐름
5. `src/components/attendance/attendance-board.tsx` — state, 필터, 클릭하면 창 열기
6. (2단계 이후) Supabase 연결, 로그인, 권한(RLS)

## 5. 기능별로 어디를 보면 되나
| 기능 | 파일 |
|---|---|
| 상단 메뉴 바꾸기 | `src/lib/nav.ts` (메뉴 목록), `src/components/top-bar.tsx` (모양) |
| 색 바꾸기 | `src/app/globals.css`의 `@theme` |
| 미등원 규칙 바꾸기 | `src/lib/attendance.ts`의 `studentDay` |
| 출결 입력 창 | `src/components/attendance/attendance-form.tsx` |
| 키패드 동작 | `src/components/kiosk/keypad.tsx` |

## 6. 날짜별 배운 것
- **9/29** 프로젝트 뼈대, 디자인 기준값(`globals.css`), 가상 데이터, 상단 메뉴, 출결 현황판
- **9/30** 공통 부품(`ui/`)으로 통일, 옆 창(Sheet), 화면 7개, 스타일 가이드
- **10/1** 화면 검토 반영 + 되돌아보기에서 찾은 버그 수정
  - **"지금"보다 뒤의 기록은 없는 것으로 본다**: 가상 데이터에는 저녁 제출이 미리 들어 있어서, 화면마다 `submittedAt <= "날짜 지금시각"`으로 걸러야 숫자가 맞는다 (`admin/page.tsx`, `teacher/page.tsx`). 한 화면만 빠뜨려도 원장님 화면과 학생 화면 숫자가 달라진다
  - **버튼을 누른 시각 vs 화면을 연 시각**: 서버가 넘긴 `nowTime`은 화면을 연 시각이라, [하원]은 누를 때 `nowTimeKST()`로 다시 잰다 (`attendance-board.tsx`)
  - **같은 부품이 두 번 그려지면 id가 겹친다**: PC 칸과 휴대폰 창에 학생 상세가 둘 다 있어서 `useId()`로 입력칸 id를 만든다 (`student-detail.tsx`)
  - **서버는 화면 너비를 모른다**: `useMediaReady`는 첫 화면에서 `null`(모름)을 돌려줘서, PC에서 휴대폰용 창이 한 순간 뜨는 것을 막는다 (`use-media.ts`)
  - **키패드 바로 처리 규칙**: 번호로 학생이 한 명만 정해지고 그 번호로 시작하는 더 긴 번호가 없으면 바로 처리, 누르다 만 번호는 10초 뒤 지움 (`keypad.tsx`)
- **10/5** 원장님 요청 1·2·3·3' (학생 상세 정리)
  - **표의 가는 선은 "틈"으로 그린다**: 칸마다 테두리를 주면 이웃 칸 선이 겹쳐 2px이 된다. 표 바탕을 선 색(`bg-line`)으로 칠하고 칸 사이를 1px 띄우면(`gap-px`) 틈으로 바탕이 비쳐 어디서나 1px 선이 된다 (`student-detail.tsx`의 `InfoGrid`)
  - **"use client"는 입구에만**: 이 표시가 붙은 파일은 서버가 직접 부를 수 있는 입구라서, 함수를 props로 받으면 Next가 경고한다(함수는 서버→브라우저로 못 보냄). 학생 상세는 이미 클라이언트 부품(`attendance-board.tsx`) 안에서만 쓰이므로 표시를 뗐다. 안쪽 부품은 바깥이 클라이언트면 저절로 클라이언트가 된다
  - **화면 흐름 테스트로 요청을 확인한다**: `e2e/student-detail.spec.ts`가 2열 표 라벨 순서, "최근 2주 출결" 없음, 메시지 최대 4개, 원장님 홈 이름 굵기(700)를 실제 브라우저에서 확인한다
- **10/5** 디자인 시스템 (`docs/design.md`, 미리보기 `/design-system`)
  - **누르는 즉시 반영 = 낙관적 업데이트**: 식당에서 주문하면 점원이 주방 확인 전에 "네!" 하고 주문표에 먼저 적는 것과 같다. 주방에서 안 된다고 하면 지우고 알려 준다. React 19의 `useOptimistic`이 "먼저 적은 주문표"(화면에 보이는 값)를 맡고, 저장이 끝나기 전까지만 보인다. 성공하면 진짜 상태에 반영하고, 실패하면 아무것도 안 해도 원래대로 돌아간다 (`src/lib/use-optimistic-save.ts`)
  - **동시에 진행 중인 저장은 함께 끝난다**: React 19는 진행 중인 비동기 전환을 한 묶음으로 보고, 모두 끝난 뒤 한꺼번에 확정한다. 화면은 이미 바뀌어 있어서 사용자는 기다림을 못 느낀다. 테스트에서 저장 하나를 끝내지 않고 남기면 다음 테스트까지 묶여서 멈춘다 (`use-optimistic-save.test.tsx`)
  - **움직임은 크기·위치(transform)와 투명도만**: 폭·높이를 움직이면 브라우저가 매 순간 배치를 다시 계산해서 저가 태블릿에서 끊긴다. 탭 밑줄은 1px 막대를 `translateX`로 옮기고 `scaleX`로 늘려서 그린다 (`segment.tsx`의 `Tabs`). Tailwind v4의 `translate-x-6`은 `transform`이 아니라 `translate` 속성이라 `transition-[translate]`로 적어야 움직인다 (`sheet.tsx`)
  - **닫힘 움직임은 "닫아 달라고 부탁"하는 방식**: 창을 바로 없애면 닫히는 모습을 보여 줄 수 없다. 창(`Sheet`)이 먼저 0.15초 동안 빠지는 모습을 보여 준 뒤 `onClose`를 부른다. 창 밖의 버튼은 `closeRef`, 창 안의 버튼은 `useSheetClose()`로 부탁한다
  - **화면 흐름 테스트는 "준비 끝"을 기다린다**: 서버가 먼저 그린 화면은 React가 연결(하이드레이션)되기 전에는 눌러도 반영되지 않거나 되돌아간다. 그리고 `loading.tsx`가 있으면 스켈레톤이 먼저 오고 본문이 뒤따른다. 그래서 `<html data-hydrated>` 표시와 스켈레톤(`aria-busy`)이 사라지는 것을 기다린 뒤 누른다 (`e2e/ready.ts`)
  - **출결 완료 화면은 "한 번에 하나씩"**: 토스 송금 완료 화면처럼 체크 원 → 이름 → "등원했어요" → 시각 순으로 0.1초씩 늦게 올라온다. 각 줄에 같은 움직임(`rise-in`)을 주고 시작 시각(delay)만 다르게 한다. 체크 원은 살짝 넘쳤다 돌아오는 곡선(`cubic-bezier(0.34, 1.56, 0.64, 1)`)이라 튕기는 느낌이 난다 (`src/components/kiosk/result-overlay.tsx`)
  - **소리는 파일 없이 만든다**: Web Audio로 음 높이(Hz)와 길이를 정해 짧은 음을 낸다. 도(1046)-미(1318)-솔(1568)이 등원, 거꾸로 내려가면 하원. 브라우저는 사람이 화면을 한 번 누르기 전에는 소리를 막아서 첫 키를 누를 때 소리 장치를 켠다 (`keypad.tsx`의 `playSound`)
