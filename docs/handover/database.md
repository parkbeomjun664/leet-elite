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
4. 대시보드 Advisors(보안·성능)에서 새 경고가 없는지 봅니다. 일부러 둔 경고는 아래 표

- 적용 기록: dev 프로젝트 2026-10-06 (1차)

| 보안 경고 | 일부러 둔 이유 |
|---|---|
| `teacher_public` Security Definer View (ERROR) | 학생·학부모에게 선생님 실명 대신 닉네임만 보이도록, 선생님 표의 RLS를 거치지 않고 `id`·`nickname` 두 열만 보여 준다. 권한 테스트로 다른 열이 안 보이는 것을 확인 |
| `set_student_programs` 로그인 사용자 실행 가능 (WARN) | 선생님이 담당 학생의 사용 프로그램만 바꾸는 함수. 안에서 원장님·담당 선생님인지 확인하고, 비로그인은 실행 불가 |
| `login_attempts` 정책 없음 (INFO) | 서버(서비스 키)만 쓰는 표라서 일부러 아무도 직접 접근 못 하게 둠 |
| `rls_auto_enable` 실행 가능 (WARN) | 자동 RLS용으로 Supabase가 만든 함수. 우리 코드가 아님 |

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
