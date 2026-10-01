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
