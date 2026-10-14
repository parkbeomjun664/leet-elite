# 데이터베이스 구조 및 초기화 방법

리트 엘리트의 데이터는 Supabase(PostgreSQL)에 저장됩니다. 이 문서는 표 구성, 권한 규칙, 처음 설치하는 방법, 권한 테스트 방법을 설명합니다. 자세한 칸(컬럼) 설명은 [data-model.md](../data-model.md)에 있습니다.

## 1. 표 구성 (1차, 2026-10-02)
| 표 | 내용 |
|---|---|
| profiles | 로그인 계정 (역할: 원장님·선생님·학생·학부모·키패드) |
| login_attempts | 로그인 실패 기록 (5번 실패 시 10분 잠금). 서버만 사용 |
| teachers | 선생님 실명·닉네임 |
| students | 학생 정보, 출결 번호, 사용 프로그램 |
| student_schedules | 학생별 요일·수업 시간 |
| guardians / guardian_students | 보호자, 보호자-학생 연결 (형제는 보호자 하나에 여러 학생) |
| classes / class_members | 반, 반 소속 (한 학생 여러 반 가능, 반을 옮겨도 기록 유지) |
| teacher_public (보기) | 학생·학부모에게 보여 주는 선생님 닉네임 목록 |

출결·숙제·보강·메시지 표는 해당 단계(3~5단계)에서 추가합니다.

## 2. 권한 규칙 (RLS)
모든 표에서 "누가 어떤 줄을 볼 수 있는지"를 DB가 직접 검사합니다. 화면에서 숨기는 것과 상관없이 막힙니다.

| 역할 | 학생 정보 |
|---|---|
| 원장님 | 전체 보기·수정 |
| 선생님 | 담당 반 학생만 보기. 수정은 사용 프로그램만 (`set_student_programs`) |
| 학생 | 본인만 |
| 학부모 | 자녀만 (형제 모두) |
| 키패드 | 직접 볼 수 없음 (출결 처리 함수만, 3단계) |
| 로그인 안 한 사람 | 아무것도 볼 수 없음 |

- 선생님 실명은 원장님만 봅니다. 학생·학부모에게는 닉네임만 보입니다.
- 출결 번호는 재원·예정 학생끼리만 겹치지 않으면 됩니다. 퇴원생 번호는 다시 쓸 수 있습니다.

## 3. 처음 설치하는 방법
1. 대시보드 Integrations → Data API → Settings에서 **"Automatically expose new tables"가 꺼져 있는지** 확인합니다. 권한은 SQL 파일 안에서 직접 줍니다. 새 표에 RLS를 자동으로 켜는 설정(이벤트 트리거 `ensure_rls`)도 켜 둡니다.
2. 대시보드 **Connect → Direct → Session pooler**의 연결 주소(URI)에 DB 비밀번호를 넣어, 컴퓨터의 사용자 환경변수 `SUPABASE_DEV_DB_URL`에 저장합니다 (파일·명령 기록에 남기지 않기 위해 "계정의 환경 변수 편집" 창 사용). Direct connection 주소는 IPv6 전용이라 집 인터넷에서 안 될 수 있습니다. 비밀번호는 영문·숫자만 쓰면 주소 인코딩 걱정이 없습니다
3. **새 PowerShell 창**에서 저장소 폴더로 이동한 뒤 실행합니다. CLI 로그인은 하지 않습니다.
   ```powershell
   npx supabase@2.119.0 db push --db-url $env:SUPABASE_DEV_DB_URL --skip-vault --dry-run   # 미리보기
   npx supabase@2.119.0 db push --db-url $env:SUPABASE_DEV_DB_URL --skip-vault             # 적용
   ```
   `supabase/migrations/` 안에서 아직 적용하지 않은 파일만 이름 순서대로 적용되고, 적용 기록이 DB에 남습니다
   - `20261002000000_core_people_classes.sql`: 1차 표·권한
   - `20261005235327_service_role_grants_policy_perf.sql`: 서버 전용 관리자(service_role) 표 권한(로그인 시도 기록·계정 만들기), 정책 성능(`(select auth.uid())`)
   - `20261006231930_login_attempt_atomic.sql`: 로그인 시도 제한을 DB 함수 한 번으로(`login_attempt_begin`·`login_attempt_success`, 서버만 호출). 동시 요청에도 횟수가 정확히 올라간다
   - `20261014000000_homework.sql`: 숙제 표 4개(`homework`·`homework_targets`·`submissions`·`submission_photos`), 비공개 사진 보관함 `homework-photos`(JPEG·5MB), 숙제·제출·사진 권한, 제출 지킴이 트리거(학생은 글만·선생님은 피드백만)
   - `20261014120000_homework_due_mode.sql`: 일반 숙제 마감일(`due_on`, 필수)·매일 숙제 요일(`weekdays`)·제출 방식(`submit_mode` 체크만/사진), 매일 숙제는 정한 요일에만 제출, 체크만 숙제엔 사진 불가, 숙제 읽기 정책에 "내가 만든 숙제" 직접 비교. 기존 일반 숙제는 등록일+2일을 마감으로 채움
5. (dev·시연 DB만) 시험 계정 + 가상 학원 명단 넣기 (10/7부터 `scripts/seed-dev.mts` 하나로)
   - 계정: `admin`·`teacher`(가상 Jenny 선생님)·`student`(가상 조나윤, 출결 1234)·`parent`(가상 표승현맘, 자녀 2명)·`kiosk`·`newbie`(첫 로그인 비밀번호 변경 시험)
   - 명단: 화면 개발용 가상 데이터(`src/lib/mock/data.ts`)의 선생님 4·반 9·학생 68·보호자 65와 시간표·반 소속·보호자 연결. 실제 명단 파일이 있어도 쓰지 않는다
   - 실행할 때마다 명단을 처음 가상 상태로 되돌린다 (시험으로 고친 내용 원상 복구). 비밀번호는 환경변수로만 받고 저장소에 남기지 않는다
   ```powershell
   $env:SEED_PASSWORD="시연 비밀번호"; node --env-file=.env.local --import tsx scripts/seed-dev.mts --ref=<dev 프로젝트 ref>
   # 비밀번호는 그대로 두고 명단만 되돌릴 때: SEED_PASSWORD 없이 (Remove-Item Env:SEED_PASSWORD 후) 같은 명령
   ```
   화면 흐름 테스트(`e2e/auth.spec.ts`)는 같은 비밀번호를 `.env.local`의 `E2E_PASSWORD`로 읽는다. 운영 DB에는 실행하지 않는다(`--ref` 확인)
4. 대시보드 Advisors(보안·성능)에서 새 경고가 없는지 봅니다. 일부러 둔 경고는 아래 표

- 적용 기록: dev 프로젝트 2026-10-06 (1·2차), 2026-10-07 (3차), 2026-10-09 (4차: 생년월일 열, 반·시간표 저장 함수 `save_student_classes_schedule`), 2026-10-14 (5차: 숙제·제출·사진 표, 사진 보관함 `homework-photos`), 2026-10-14 오후 (6차: 숙제 마감일·요일·제출 방식, 숙제 읽기 정책 수정). 앱이 새 DB 함수를 쓰게 바뀌는 경우 **DB 적용 → 푸시** 순서 (반대로 하면 로그인이 "지금은 로그인할 수 없어요"로 막힌다)

| 보안 경고 | 일부러 둔 이유 |
|---|---|
| `teacher_public` Security Definer View (ERROR) | 학생·학부모에게 선생님 실명 대신 닉네임만 보이도록, 선생님 표의 RLS를 거치지 않고 `id`·`nickname` 두 열만 보여 준다. 권한 테스트로 다른 열이 안 보이는 것을 확인 |
| `set_student_programs` 로그인 사용자 실행 가능 (WARN) | 선생님이 담당 학생의 사용 프로그램만 바꾸는 함수. 안에서 원장님·담당 선생님인지 확인하고, 비로그인은 실행 불가 |
| `login_attempts` 정책 없음 (INFO) | 서버(서비스 키)만 쓰는 표라서 일부러 아무도 직접 접근 못 하게 둠 |
| `rls_auto_enable` 실행 가능 (WARN) | 자동 RLS용으로 Supabase가 만든 함수. 우리 코드가 아님 |

성능 알림(10/14 숙제 적용 뒤): "정책 여러 개(Multiple Permissive Policies)"는 원장님 정책(admin_all)과 역할별 정책을 나눠 둔 설계라 그대로 둔다. `submissions.teacher_comment_by` 인덱스 없음(INFO)은 이 열로 찾는 화면이 없어 두고, 생기면 그때 더한다

## 4. 권한 테스트 방법 (내 컴퓨터에서)
Supabase를 건드리지 않고, 컴퓨터에 설치된 PostgreSQL에 임시 DB를 만들어 검사합니다.

```bash
# 임시 DB 만들기 → 시작
initdb -D ./pgtest -U postgres --auth=trust -E UTF8
pg_ctl -D ./pgtest -o "-p 54329" start
# Supabase 흉내 → 표·권한 → 권한 테스트 순서로 실행
psql -h localhost -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f supabase/tests/local_auth_stub.sql \
  -f supabase/migrations/20261002000000_core_people_classes.sql \
  -f supabase/tests/rls_check.sql
# 끝나면 정리
pg_ctl -D ./pgtest stop && rm -rf ./pgtest
```

마지막에 "모든 권한 테스트 통과"가 나오면 정상입니다. 하나라도 틀리면 `FAIL [역할] 항목`이 나오고 멈춥니다.

- 2026-10-02 결과: 22개 항목 모두 통과
- 2026-10-06 결과: 32개 항목 모두 통과 (출결 코드 4자리 3개, 선생님 공개 보기 열·접근 5개, security definer 함수 search_path 고정 2개 추가)
- 2026-10-07 결과: 36개 항목 모두 통과 (서버만 로그인 기록 접근 2개, 로그인 시도 제한 함수 동작·호출 권한 2개 추가). 실행할 때 `supabase/migrations/*.sql`을 이름 순서대로 모두 넣는다
- 2026-10-09 결과: 45개 항목 모두 통과 (반·시간표 저장 함수: 원장님 저장·반에서 빠지면 기록 남김·같은 날 다시 넣기·시간표 교체, 선생님·학생·보호자·키패드 거부, 보호자 정보 수정 원장님만, 생년월일 1950년 이전 거부)
- 2026-10-12 결과: 46개 항목 모두 통과 (선생님은 학생 등록 불가 1개 추가)
- 2026-10-14 결과(5차): 90개 항목 모두 통과 (숙제·제출·사진 44개: 역할별 숙제 보기, 다른 반 학생 대상·남의 이름 등록·사용 중지 선생님 등록 거부, 대신 제출·대상 아닌 숙제·두 번 제출·매일 숙제 기간 밖 거부, 학생은 피드백 못 고침·선생님은 학생 글 못 고침, 사진 경로·10장 제한, 보관함 올리기·보기·지우기 역할별, 제출물 있는 숙제 삭제 막힘·보관 뒤 제출 막힘). 로컬 흉내에 storage 스키마 추가(`local_auth_stub.sql`)
- 2026-10-14 결과(6차): 96개 항목 모두 통과 (마감 없는 일반 숙제·요일 없는/이상한 요일 매일 숙제 거부, 정한 요일 밖 제출 거부, 체크만 숙제 사진 거부, 선생님 숙제 넣으면서 돌려받기)
