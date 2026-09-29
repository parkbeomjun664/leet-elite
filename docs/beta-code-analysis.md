# 원장님 베타 코드 분석 (2026-09-29)

원본: 원장님 개인 GitHub 저장소 (private, 61 commits, 마지막 수정 약 2주 전)
로컬 사본: `OneDrive/바탕 화면/범/리트영어학원 홈페이지/_beta-src/` (저장소 밖. 실제 학생 이름·전화번호가 들어 있으니 저장소에 넣지 말 것)

저장소 안에는 서로 다른 시도 세 개가 들어 있다.

| # | 위치 | 시기 | 스택 | 상태 |
|---|---|---|---|---|
| A | `leet-academy-app-source.zip` 루트 | 9/7~9/8 | Next.js 15 + NextAuth v5 + Prisma + zod + bcrypt | 1단계만 구현: 로그인, 권한, 학생 관리, 비밀번호 재설정 |
| B | 같은 zip 안 `leet-beta/` | 9/9 | Next.js + shadcn/ui + Drizzle(Cloudflare D1) | 빈 뼈대, 회색 플레이스홀더 화면만 있음 |
| C | `beta/` + `api/` (**실제 배포 중**) | ~9/15 | 순수 HTML 1파일 + Vercel 함수 3개 + Postgres(`pg`) | 관리자 기능 일부 동작 |

## C. 배포 중인 베타 (vercel)
- `api/login.js`: 계정 5개(학생 3, 학부모 1, 관리자 1)가 **코드에 하드코딩**, 비밀번호 전부 `1234`. 세션·토큰 없음
- `api/homework.js`, `api/academy.js`: 요청마다 adminId/password 문자열 비교로 인증. 앱 시작 시 `CREATE TABLE IF NOT EXISTS`로 테이블 생성(마이그레이션 없음)
- **`GET /api/homework?all=1`은 인증 없음** → 모든 숙제 + 학생 제출 사진(base64) + 선생님 코멘트가 누구에게나 노출
- `GET /api/homework?student=이름`도 인증 없음 → 이름만 알면 그 학생 숙제 조회
- 사진은 base64 문자열로 DB(JSONB)에 저장, 요청당 3.3MB 제한
- 숙제 대상은 `"|학생A|학생B|"` 같은 문자열, 제출은 학생 **이름**으로 연결 → 동명이인 불가
- 출결 `day`는 DB `CURRENT_DATE`(UTC) 기준 → 한국 시간 오전 9시 전 기록이 전날로 저장
- 테이블: homework, homework_submissions, homework_teacher_comments, academy_students, academy_classes, academy_class_members, academy_attendance, academy_makeups, academy_messages, academy_teacher_work_logs
- 학생 관리의 `parent_phone`은 있지만 학부모 계정과 연결 안 됨. 선생님 계정 개념 없음(이름 텍스트)

## A. Next.js + Prisma 시도 (가장 설계가 좋음)
- README에 단계별 계획과 보안 원칙(API마다 역할·소유권 검사, 파일은 private storage + 서명 URL)이 정리되어 있음
- 인증: 전화번호 + bcrypt 해시, JWT 세션, `mustChangePassword`(첫 로그인 시 변경)
- 선생님은 자기 반 학생만 조회하도록 서버에서 필터링
- Prisma 스키마 엔터티: User, Student, Parent, ParentStudent(N:M), Teacher, Class, ClassMember, Homework, HomeworkAssignment, HomeworkSubmission, HomeworkFeedback, Attendance, MakeupClass, Message, Notification, TeacherWorkLog
- 한계: datasource가 `sqlite`(README는 Postgres), 제출 사진이 `imageKey` 1개(요구사항은 10장), 코멘트·매일 숙제·사용 프로그램·수납·등원요일 없음. 화면은 대시보드·학생 목록 정도
- seed 초기 비밀번호 `1111`, 학생 계정 생성 시에도 `1111` 고정

## 재구축 시 판단
- **A의 설계(역할 모델, ParentStudent, 반 담당 필터, 단계 계획)를 출발점으로 삼는다.** 스키마는 에듀OK 필드(보호자 여러 명, 등원요일, 인증번호=전화 뒷4자리, 수납일)와 요구사항(사진 10장, 코멘트 수정, 매일 숙제, 사용 프로그램, 메시지 예약)을 반영해 확장
- C에서는 화면 흐름·문구·사진 뷰어·이미지 압축 아이디어만 가져온다. 코드는 재사용하지 않는다
- 배포 중인 C의 무인증 API는 실제 학생 데이터를 노출하고 있으므로 원장님께 알리고 빨리 막아야 함
