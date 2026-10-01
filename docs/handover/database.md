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
1. Supabase 대시보드 → SQL Editor를 엽니다.
2. `supabase/migrations/` 안의 파일을 **이름 순서대로** 열어 내용을 붙여 넣고 실행합니다.
   - `20261002000000_core_people_classes.sql`: 1차 표·권한
3. Settings → API에서 "새 표 자동 노출"이 꺼져 있는지 확인합니다. 권한은 SQL 파일 안에서 직접 줍니다.

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
