-- 권한(RLS) 테스트: 역할마다 볼 수 있는 학생 수가 맞는지 확인한다. 하나라도 틀리면 오류로 멈춘다
-- 등장인물: 원장님 / 선생님 A(반 A: 학생1, 학생2) / 선생님 B(반 B: 학생3) / 학생1 / 학생1·학생2 형제의 보호자 / 키패드
\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000e1');
insert into public.profiles (id, role, login_id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'admin', 'admin', '원장님'),
  ('00000000-0000-0000-0000-0000000000a1', 'teacher', 'tA', '선생님A'),
  ('00000000-0000-0000-0000-0000000000b1', 'teacher', 'tB', '선생님B'),
  ('00000000-0000-0000-0000-0000000000c1', 'student', 's1', '학생1'),
  ('00000000-0000-0000-0000-0000000000d1', 'parent', 'p1', '보호자'),
  ('00000000-0000-0000-0000-0000000000e1', 'kiosk', 'kiosk', '키패드');
insert into public.teachers (id, profile_id, real_name, nickname) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '김실명', 'Amy'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', '이실명', 'Ben');
insert into public.students (id, profile_id, name, attendance_code) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '학생1', '1001'),
  ('20000000-0000-0000-0000-000000000002', null, '학생2', '1002'),
  ('20000000-0000-0000-0000-000000000003', null, '학생3', '1003');
insert into public.classes (id, name, teacher_id) values
  ('30000000-0000-0000-0000-00000000000a', '반A', '10000000-0000-0000-0000-0000000000a1'),
  ('30000000-0000-0000-0000-00000000000b', '반B', '10000000-0000-0000-0000-0000000000b1');
insert into public.class_members (class_id, student_id) values
  ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000003');
insert into public.guardians (id, profile_id, name) values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', '형제맘');
insert into public.guardian_students (guardian_id, student_id) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');

-- 검사 도우미: (누구로, 무엇을, 기대값)
create function pg_temp.expect(who text, label text, got bigint, want bigint) returns void language plpgsql as $$
begin
  if got <> want then raise exception 'FAIL [%] % : % (기대 %)', who, label, got, want; end if;
  raise notice 'ok   [%] % = %', who, label, got;
end $$;

-- 로그인한 사람을 바꾸는 도우미
create function pg_temp.login(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;

set role authenticated;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect('원장님', '볼 수 있는 학생', (select count(*) from public.students), 3);
select pg_temp.expect('원장님', '선생님 실명 조회', (select count(*) from public.teachers), 2);

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('선생님A', '볼 수 있는 학생 (담당 반만)', (select count(*) from public.students), 2);
select pg_temp.expect('선생님A', '다른 반 학생3', (select count(*) from public.students where name = '학생3'), 0);
select pg_temp.expect('선생님A', '볼 수 있는 반', (select count(*) from public.classes), 1);
select pg_temp.expect('선생님A', '담당 학생의 보호자', (select count(*) from public.guardians), 1);
select pg_temp.expect('선생님A', '다른 선생님 실명', (select count(*) from public.teachers), 1);
-- 선생님은 학생 정보를 직접 고칠 수 없다 (0줄 수정)
with u as (update public.students set memo = 'x' returning 1) select pg_temp.expect('선생님A', '학생 정보 직접 수정', (select count(*) from u), 0);
-- 새 학생 등록도 원장님만 (10/12 STU-01)
do $$ begin
  insert into public.students (name, attendance_code) values ('몰래등록', '7777');
  raise exception 'FAIL [선생님A] 학생 등록이 허용됨';
exception when insufficient_privilege then raise notice 'ok   [선생님A] 학생 등록 거부';
end $$;
-- 대신 담당 학생의 사용 프로그램은 함수로 바꿀 수 있다
select public.set_student_programs('20000000-0000-0000-0000-000000000001', array['클래스카드']);
do $$ begin
  perform public.set_student_programs('20000000-0000-0000-0000-000000000003', array['클래스5']);
  raise exception 'FAIL [선생님A] 다른 반 학생 프로그램 변경이 허용됨';
exception when insufficient_privilege then raise notice 'ok   [선생님A] 다른 반 학생 프로그램 변경 거부';
end $$;

select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('학생1', '볼 수 있는 학생 (본인만)', (select count(*) from public.students), 1);
select pg_temp.expect('학생1', '선생님 실명 테이블', (select count(*) from public.teachers), 0);
select pg_temp.expect('학생1', '선생님 닉네임 (공개 보기)', (select count(*) from public.teacher_public), 2);
select pg_temp.expect('학생1', '보호자 정보', (select count(*) from public.guardians), 0);
select pg_temp.expect('학생1', '자기 반', (select count(*) from public.classes), 1);

select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select pg_temp.expect('보호자', '볼 수 있는 학생 (자녀 2명)', (select count(*) from public.students), 2);
select pg_temp.expect('보호자', '자녀 반', (select count(*) from public.classes), 1);
select pg_temp.expect('보호자', '선생님 실명 테이블', (select count(*) from public.teachers), 0);

select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect('키패드', '볼 수 있는 학생 (직접 접근 없음)', (select count(*) from public.students), 0);
select pg_temp.expect('키패드', '계정 정보 (자기 것만)', (select count(*) from public.profiles), 1);

-- 반 소속·시간표 저장 함수 (10/9): 원장님만. 반에서 빠지면 기록은 남기고(left_on) 지금 소속에서만 빠진다
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select public.save_student_classes_schedule('20000000-0000-0000-0000-000000000003',
  array['30000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000b']::uuid[],
  '[{"weekday":2,"start_time":"15:00","duration_min":90},{"weekday":4,"start_time":"15:10","duration_min":90}]');
select pg_temp.expect('원장님', '학생3 지금 소속 반 (A·B)', (select count(*) from public.class_members where student_id = '20000000-0000-0000-0000-000000000003' and left_on is null), 2);
select pg_temp.expect('원장님', '학생3 시간표', (select count(*) from public.student_schedules where student_id = '20000000-0000-0000-0000-000000000003'), 2);
select public.save_student_classes_schedule('20000000-0000-0000-0000-000000000003',
  array['30000000-0000-0000-0000-00000000000a']::uuid[], '[{"weekday":1,"start_time":"16:00","duration_min":60}]');
select pg_temp.expect('원장님', '반B에서 빠진 뒤 지금 소속', (select count(*) from public.class_members where student_id = '20000000-0000-0000-0000-000000000003' and left_on is null), 1);
select pg_temp.expect('원장님', '반B 기록은 남음 (left_on)', (select count(*) from public.class_members where student_id = '20000000-0000-0000-0000-000000000003' and class_id = '30000000-0000-0000-0000-00000000000b' and left_on is not null), 1);
select pg_temp.expect('원장님', '시간표 통째 교체', (select count(*) from public.student_schedules where student_id = '20000000-0000-0000-0000-000000000003'), 1);
-- 같은 날 다시 반B에 넣으면 그 줄을 되살린다 (기록이 두 줄로 늘지 않음)
select public.save_student_classes_schedule('20000000-0000-0000-0000-000000000003',
  array['30000000-0000-0000-0000-00000000000b']::uuid[], '[]');
select pg_temp.expect('원장님', '같은 날 다시 넣은 반B (한 줄, 소속 중)', (select count(*) from public.class_members where student_id = '20000000-0000-0000-0000-000000000003' and class_id = '30000000-0000-0000-0000-00000000000b' and left_on is null), 1);
-- 보호자 정보는 원장님이 고칠 수 있다
with u as (update public.guardians set phone1 = '010-5550-0000' returning 1) select pg_temp.expect('원장님', '보호자 정보 수정', (select count(*) from u), 1);
-- 생년월일: 1950년 이전은 저장 거부 (10/8 A3)
do $$ begin
  update public.students set birth_date = '1949-12-31' where id = '20000000-0000-0000-0000-000000000003';
  raise exception 'FAIL 1950년 이전 생년월일이 허용됨';
exception when check_violation then raise notice 'ok   생년월일 1950년 이전 거부';
end $$;

-- 원장님이 아니면 반·시간표 저장 함수 거부, 보호자 정보도 못 고침
do $$
declare uid text; n int;
begin
  foreach uid in array array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1'] loop
    perform set_config('request.jwt.claim.sub', uid, false);
    begin
      perform public.save_student_classes_schedule('20000000-0000-0000-0000-000000000001', array[]::uuid[], '[]');
      raise exception 'FAIL [%] 반·시간표 저장이 허용됨', uid;
    exception when insufficient_privilege then null;
    end;
    with u as (update public.guardians set name = 'x' returning 1) select count(*) into n from u;
    if n > 0 then
      raise exception 'FAIL [%] 보호자 정보 수정이 허용됨', uid;
    end if;
  end loop;
  raise notice 'ok   [선생님·학생·보호자·키패드] 반·시간표 저장 거부, 보호자 정보 수정 0줄';
end $$;

-- 로그인하지 않은 사람(anon): 테이블 자체에 권한이 없다
reset role;
set role anon;
do $$ begin
  perform count(*) from public.students;
  raise exception 'FAIL [비로그인] 학생 테이블 접근이 허용됨';
exception when insufficient_privilege then raise notice 'ok   [비로그인] 학생 테이블 접근 거부';
end $$;
reset role;

-- 출결 코드: 재원생끼리 겹치면 저장 거부, 퇴원생 코드는 다시 쓸 수 있음
do $$ begin
  insert into public.students (name, attendance_code) values ('겹침', '1001');
  raise exception 'FAIL 재원생 출결 코드 중복이 허용됨';
exception when unique_violation then raise notice 'ok   재원생 출결 코드 중복 거부';
end $$;
update public.students set status = 'withdrawn' where name = '학생3';
insert into public.students (name, attendance_code) values ('새학생', '1003');
select pg_temp.expect('원장(설정)', '퇴원생 코드 재사용', (select count(*) from public.students where attendance_code = '1003'), 2);

-- 출결 코드는 숫자 4자리만 (10/5): 5자리·3자리·숫자 아닌 값은 저장 거부
do $$
declare c text;
begin
  foreach c in array array['12345', '123', '12a4'] loop
    begin
      insert into public.students (name, attendance_code) values ('자리수', c);
      raise exception 'FAIL 출결 코드 % 허용됨', c;
    exception when check_violation then raise notice 'ok   출결 코드 % 거부', c;
    end;
  end loop;
end $$;

-- 선생님 공개 보기(teacher_public): 열은 id·nickname 둘뿐, 학생·학부모는 실명·계정 연결을 볼 수 없고 고칠 수도 없다
select pg_temp.expect('구조', 'teacher_public 열이 id,nickname뿐', (
  select count(*) from (
    select string_agg(attname, ',' order by attnum) as cols from pg_attribute
    where attrelid = 'public.teacher_public'::regclass and attnum > 0 and not attisdropped
  ) t where cols = 'id,nickname'), 1);

set role authenticated;
do $$
declare
  uid text;
  sql text;
begin
  -- 학생1, 보호자
  foreach uid in array array['00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1'] loop
    perform pg_temp.login(uid);
    if (select string_agg(nickname, ',' order by nickname) from public.teacher_public) <> 'Amy,Ben' then
      raise exception 'FAIL [%] teacher_public 닉네임이 다름', uid;
    end if;
    foreach sql in array array[
      'select real_name from public.teacher_public',
      'select profile_id from public.teacher_public',
      'select is_active from public.teacher_public'
    ] loop
      begin
        execute sql;
        raise exception 'FAIL [%] 숨긴 열이 보임: %', uid, sql;
      exception when undefined_column then null;
      end;
    end loop;
    begin
      update public.teacher_public set nickname = 'x';
      raise exception 'FAIL [%] teacher_public 수정이 허용됨', uid;
    exception when insufficient_privilege then null;
    end;
    raise notice 'ok   [%] teacher_public: 닉네임만 보이고 실명·계정·사용 여부 열 없음, 수정 거부', uid;
  end loop;
end $$;
reset role;

-- 사용 중지된 선생님은 공개 보기에서 빠진다
update public.teachers set is_active = false where nickname = 'Ben';
set role authenticated;
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('학생1', '사용 중지 선생님 숨김', (select count(*) from public.teacher_public), 1);
reset role;

-- 비로그인(anon)은 공개 보기도 못 본다
set role anon;
do $$ begin
  perform count(*) from public.teacher_public;
  raise exception 'FAIL [비로그인] teacher_public 접근이 허용됨';
exception when insufficient_privilege then raise notice 'ok   [비로그인] teacher_public 접근 거부';
end $$;
reset role;

-- 로그인 시도 기록(login_attempts): 서버 전용 관리자(service_role)만 읽고 쓴다. 로그인한 사람·비로그인은 접근 불가 (2차)
set role service_role;
insert into public.login_attempts (login_id, fail_count) values ('ip:test', 1);
select pg_temp.expect('서버(service_role)', '로그인 시도 기록 쓰기·읽기', (select count(*) from public.login_attempts where login_id = 'ip:test'), 1);
delete from public.login_attempts where login_id = 'ip:test';
reset role;
set role authenticated;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin
  perform count(*) from public.login_attempts;
  raise exception 'FAIL [원장님] 로그인 시도 기록을 직접 볼 수 있음';
exception when insufficient_privilege then raise notice 'ok   [원장님] 로그인 시도 기록 직접 접근 거부 (서버만)';
end $$;
reset role;

-- 로그인 시도 제한 함수 (3차): 아이디 5번째에 잠금 표시, 6번째는 시도 자체를 막음, 성공하면 초기화, IP 20번
set role service_role;
do $$
declare r record; i int;
begin
  for i in 1..4 loop
    select * into r from public.login_attempt_begin('e2e-x', null);
    if not r.allowed or r.locked then raise exception 'FAIL 로그인 시도 %번째가 막힘', i; end if;
  end loop;
  select * into r from public.login_attempt_begin('e2e-x', null);
  if not (r.allowed and r.locked) then raise exception 'FAIL 5번째: 시도는 되고 잠금 표시여야 함'; end if;
  select * into r from public.login_attempt_begin('e2e-x', null);
  if r.allowed then raise exception 'FAIL 잠긴 뒤에도 시도가 허용됨'; end if;
  if (select fail_count from public.login_attempts where login_id = 'e2e-x') <> 5 then raise exception 'FAIL 잠긴 동안 횟수가 더 올라감'; end if;
  perform public.login_attempt_success('e2e-y', null);
  -- 성공하면 그 아이디 기록이 지워진다
  perform public.login_attempt_begin('e2e-y', null);
  perform public.login_attempt_success('e2e-y', null);
  if exists (select 1 from public.login_attempts where login_id = 'e2e-y') then raise exception 'FAIL 성공했는데 기록이 남음'; end if;
  -- IP: 서로 다른 아이디 20번이면 잠금, 성공하면 IP 횟수를 하나 덜어 낸다
  for i in 1..19 loop perform public.login_attempt_begin('e2e-ip' || i, '1.2.3.4'); end loop;
  perform public.login_attempt_success('e2e-ip1', '1.2.3.4');
  if (select fail_count from public.login_attempts where login_id = 'ip:1.2.3.4') <> 18 then raise exception 'FAIL 성공했는데 IP 횟수가 그대로'; end if;
  perform public.login_attempt_begin('e2e-ip20', '1.2.3.4');
  select * into r from public.login_attempt_begin('e2e-ip21', '1.2.3.4');
  if not r.locked then raise exception 'FAIL IP 20번째에 잠금 표시가 없음'; end if;
  select * into r from public.login_attempt_begin('e2e-ip22', '1.2.3.4');
  if r.allowed then raise exception 'FAIL IP가 잠긴 뒤에도 허용됨'; end if;
  raise notice 'ok   [서버] 로그인 시도 제한: 5번째 잠금 표시·6번째 거부·성공 초기화·IP 20번';
end $$;
delete from public.login_attempts;
reset role;

-- 로그인 시도 제한 함수는 서버만 부른다
set role authenticated;
do $$ begin
  perform public.login_attempt_begin('x', null);
  raise exception 'FAIL [로그인한 사람] 로그인 시도 함수를 부를 수 있음';
exception when insufficient_privilege then raise notice 'ok   [로그인한 사람] 로그인 시도 함수 부르기 거부';
end $$;
reset role;

-- ── 숙제·제출·사진 (10/14, HW-01~12) ──────────────────────────
-- 숙제 H1: 선생님A가 학생1·2에게 / H2: 선생님B가 학생3에게 / H3: 원장님이 학생1에게 매일 숙제(10/1~10/3)
-- 반 소속은 위 시험 뒤 상태: 반A = 학생1·2, 반B = 학생3. 선생님B는 위에서 사용 중지됨
set role authenticated;
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  insert into public.homework (kind, title, created_by) values ('general', '퇴사 뒤 숙제', '00000000-0000-0000-0000-0000000000b1');
  raise exception 'FAIL [선생님B 사용 중지] 숙제 등록이 허용됨';
exception when insufficient_privilege then raise notice 'ok   [선생님B 사용 중지] 숙제 등록 거부';
end $$;
reset role;
update public.teachers set is_active = true where nickname = 'Ben';
set role authenticated;
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
insert into public.homework (id, kind, title, created_by) values ('50000000-0000-0000-0000-000000000001', 'general', 'H1 단어 시험', '00000000-0000-0000-0000-0000000000a1');
insert into public.homework_targets values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'), ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
-- 다른 반 학생은 대상에 넣을 수 없다
do $$ begin
  insert into public.homework_targets values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003');
  raise exception 'FAIL [선생님A] 다른 반 학생을 숙제 대상에 넣음';
exception when insufficient_privilege then raise notice 'ok   [선생님A] 다른 반 학생 숙제 대상 거부';
end $$;
-- 남의 이름으로 숙제를 만들 수 없다
do $$ begin
  insert into public.homework (kind, title, created_by) values ('general', '가짜', '00000000-0000-0000-0000-0000000000b1');
  raise exception 'FAIL [선생님A] 다른 사람 이름으로 숙제 등록';
exception when insufficient_privilege then raise notice 'ok   [선생님A] 다른 사람 이름으로 숙제 등록 거부';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
insert into public.homework (id, kind, title, created_by) values ('50000000-0000-0000-0000-000000000002', 'general', 'H2 독해', '00000000-0000-0000-0000-0000000000b1');
insert into public.homework_targets values ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003');
with u as (update public.homework set title = '바꿈' where id = '50000000-0000-0000-0000-000000000001' returning 1)
  select pg_temp.expect('선생님B', '다른 선생님 숙제 수정', (select count(*) from u), 0);
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
insert into public.homework (id, kind, title, starts_on, ends_on, created_by) values ('50000000-0000-0000-0000-000000000003', 'daily', 'H3 매일 듣기', '2026-10-01', '2026-10-03', '00000000-0000-0000-0000-00000000000a');
insert into public.homework_targets values ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001');
do $$ begin
  insert into public.homework (kind, title) values ('daily', '기간 없는 매일 숙제');
  raise exception 'FAIL 기간 없는 매일 숙제가 허용됨';
exception when check_violation then raise notice 'ok   매일 숙제는 기간이 있어야 함';
end $$;

select pg_temp.expect('원장님', '숙제 전체', (select count(*) from public.homework), 3);
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('선생님A', '숙제 (담당 학생 대상 H1·H3)', (select count(*) from public.homework), 2);
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('선생님B', '숙제 (H2만)', (select count(*) from public.homework), 1);
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect('학생1', '내 숙제 (H1·H3)', (select count(*) from public.homework), 2);
select pg_temp.expect('학생1', '숙제 대상 줄 (내 것만)', (select count(*) from public.homework_targets), 2);
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select pg_temp.expect('보호자', '자녀 숙제 (H1·H3)', (select count(*) from public.homework), 2);
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect('키패드', '숙제', (select count(*) from public.homework), 0);

-- 학생 제출: 본인 것만, 피드백 칸은 못 채운다
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
insert into public.submissions (id, homework_id, student_id, comment, teacher_comment)
  values ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '다 했어요', '셀프 칭찬');
select pg_temp.expect('학생1', '제출하며 넣은 피드백은 지워짐', (select count(*) from public.submissions where teacher_comment is not null), 0);
do $$ begin
  insert into public.submissions (homework_id, student_id) values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
  raise exception 'FAIL [학생1] 형제 숙제를 대신 제출';
exception when insufficient_privilege then raise notice 'ok   [학생1] 다른 학생 이름으로 제출 거부';
end $$;
do $$ begin
  insert into public.submissions (homework_id, student_id) values ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001');
  raise exception 'FAIL [학생1] 내 숙제가 아닌 것에 제출';
exception when foreign_key_violation then raise notice 'ok   [학생1] 대상이 아닌 숙제 제출 거부';
end $$;
do $$ begin
  insert into public.submissions (homework_id, student_id) values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
  raise exception 'FAIL [학생1] 같은 숙제 두 번 제출';
exception when unique_violation then raise notice 'ok   [학생1] 일반 숙제는 한 번만 제출 (그 뒤는 수정)';
end $$;
-- 매일 숙제: 기간 안 날짜로 하루 한 번
insert into public.submissions (homework_id, student_id, for_date) values ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '2026-10-01');
do $$ begin
  insert into public.submissions (homework_id, student_id, for_date) values ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '2026-10-09');
  raise exception 'FAIL 매일 숙제 기간 밖 제출';
exception when check_violation then raise notice 'ok   매일 숙제 기간 밖 날짜 거부';
end $$;
do $$ begin
  insert into public.submissions (homework_id, student_id) values ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001');
  raise exception 'FAIL 매일 숙제를 날짜 없이 제출';
exception when check_violation then raise notice 'ok   매일 숙제는 날짜가 있어야 함';
end $$;
-- 학생은 자기 글만 고친다
with u as (update public.submissions set comment = '고쳤어요' where id = '60000000-0000-0000-0000-000000000001' returning 1)
  select pg_temp.expect('학생1', '내 제출 글 수정', (select count(*) from u), 1);
do $$ begin
  update public.submissions set teacher_comment = '참 잘했어요' where id = '60000000-0000-0000-0000-000000000001';
  raise exception 'FAIL [학생1] 선생님 피드백을 고침';
exception when insufficient_privilege then raise notice 'ok   [학생1] 선생님 피드백 수정 거부';
end $$;

-- 선생님 피드백: 담당 선생님만, 학생 글은 못 고침, 누가·언제는 DB가 채움
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
with u as (update public.submissions set teacher_comment = '남의 반' where id = '60000000-0000-0000-0000-000000000001' returning 1)
  select pg_temp.expect('선생님B', '다른 반 학생 제출에 피드백', (select count(*) from u), 0);
select pg_temp.expect('선생님B', '다른 반 학생 제출 보기', (select count(*) from public.submissions), 0);
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
update public.submissions set teacher_comment = '잘했어요', teacher_comment_by = null where id = '60000000-0000-0000-0000-000000000001';
select pg_temp.expect('선생님A', '피드백 남긴 사람·시각이 자동으로', (select count(*) from public.submissions
  where id = '60000000-0000-0000-0000-000000000001' and teacher_comment_by = '00000000-0000-0000-0000-0000000000a1' and teacher_comment_at is not null), 1);
do $$ begin
  update public.submissions set comment = '대신 고침' where id = '60000000-0000-0000-0000-000000000001';
  raise exception 'FAIL [선생님A] 학생 제출 글을 고침';
exception when insufficient_privilege then raise notice 'ok   [선생님A] 학생 제출 글 수정 거부';
end $$;
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select pg_temp.expect('보호자', '자녀 제출 보기', (select count(*) from public.submissions), 2);
do $$ begin
  insert into public.submissions (homework_id, student_id) values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
  raise exception 'FAIL [보호자] 자녀 대신 제출';
exception when insufficient_privilege then raise notice 'ok   [보호자] 자녀 대신 제출 거부';
end $$;

-- 사진 줄: 학생 본인 폴더 경로만, 최대 10장
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
insert into public.submission_photos (submission_id, storage_path, sort_order) values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/a.jpg', 0);
do $$ begin
  insert into public.submission_photos (submission_id, storage_path, sort_order) values
    ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002/60000000-0000-0000-0000-000000000001/b.jpg', 1);
  raise exception 'FAIL [학생1] 다른 학생 폴더 경로로 사진 줄';
exception when insufficient_privilege then raise notice 'ok   [학생1] 다른 학생 폴더 경로 사진 줄 거부';
end $$;
do $$ begin
  insert into public.submission_photos (submission_id, storage_path, sort_order) values
    ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/k.jpg', 10);
  raise exception 'FAIL 11번째 사진이 허용됨';
exception when check_violation then raise notice 'ok   사진은 한 제출에 10장까지';
end $$;

-- 사진 보관함 (storage.objects): 학생 본인 제출 폴더에만 올리고, 볼 수 있는 사람만 본다
insert into storage.objects (bucket_id, name) values ('homework-photos', '20000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/a.jpg');
do $$ begin
  insert into storage.objects (bucket_id, name) values ('homework-photos', '20000000-0000-0000-0000-000000000002/60000000-0000-0000-0000-000000000001/x.jpg');
  raise exception 'FAIL [학생1] 다른 학생 폴더에 파일 올림';
exception when insufficient_privilege then raise notice 'ok   [학생1] 다른 학생 폴더에 올리기 거부';
end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('homework-photos', '20000000-0000-0000-0000-000000000001/69999999-0000-0000-0000-000000000000/x.jpg');
  raise exception 'FAIL [학생1] 없는 제출 폴더에 파일 올림';
exception when insufficient_privilege then raise notice 'ok   [학생1] 없는 제출 폴더 거부';
end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('homework-photos', '../x.jpg');
  raise exception 'FAIL [학생1] 이상한 경로로 파일 올림';
exception when insufficient_privilege then raise notice 'ok   [학생1] 이상한 경로 거부';
end $$;
select pg_temp.expect('학생1', '내 숙제 사진 파일', (select count(*) from storage.objects where bucket_id = 'homework-photos'), 1);
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('선생님A', '담당 학생 사진 파일', (select count(*) from storage.objects where bucket_id = 'homework-photos'), 1);
select pg_temp.expect('선생님A', '담당 학생 사진 줄', (select count(*) from public.submission_photos), 1);
with d as (delete from storage.objects where bucket_id = 'homework-photos' returning 1) select pg_temp.expect('선생님A', '학생 사진 파일 지우기', (select count(*) from d), 0);
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('선생님B', '다른 반 학생 사진 파일', (select count(*) from storage.objects where bucket_id = 'homework-photos'), 0);
select pg_temp.expect('선생님B', '다른 반 학생 사진 줄', (select count(*) from public.submission_photos), 0);
select pg_temp.login('00000000-0000-0000-0000-0000000000d1');
select pg_temp.expect('보호자', '자녀 숙제 사진 파일 (HW-08)', (select count(*) from storage.objects where bucket_id = 'homework-photos'), 1);
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect('키패드', '숙제 사진 파일', (select count(*) from storage.objects where bucket_id = 'homework-photos'), 0);

-- 제출물이 있는 숙제는 지워지지 않는다 → 보관(HW-12). 보관된 숙제에는 새로 제출할 수 없다
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin
  delete from public.homework where id = '50000000-0000-0000-0000-000000000001';
  raise exception 'FAIL 제출물이 있는 숙제가 지워짐';
exception when restrict_violation then raise notice 'ok   제출물이 있는 숙제는 삭제 대신 보관'; -- 23001: 앱은 이 코드로 "삭제 대신 보관" 안내
end $$;
update public.homework set archived_at = now() where id = '50000000-0000-0000-0000-000000000003';
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  insert into public.submissions (homework_id, student_id, for_date) values ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '2026-10-02');
  raise exception 'FAIL 보관된 숙제에 제출';
exception when insufficient_privilege then raise notice 'ok   보관된 숙제에 새 제출 거부';
end $$;
-- 선생님A는 원장님 숙제는 못 지우고, 제출물이 없는 자기 숙제는 지울 수 있다
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
with d as (delete from public.homework where id = '50000000-0000-0000-0000-000000000003' returning 1) select pg_temp.expect('선생님A', '원장님이 만든 숙제 삭제', (select count(*) from d), 0);
insert into public.homework (id, kind, title, created_by) values ('50000000-0000-0000-0000-000000000009', 'general', '지울 숙제', '00000000-0000-0000-0000-0000000000a1');
with d as (delete from public.homework where id = '50000000-0000-0000-0000-000000000009' returning 1) select pg_temp.expect('선생님A', '제출물 없는 내 숙제 삭제', (select count(*) from d), 1);
reset role;

-- 비로그인은 숙제·사진에 접근 못 한다
set role anon;
do $$ begin
  perform 1 from public.homework;
  raise exception 'FAIL [비로그인] 숙제 읽기 가능';
exception when insufficient_privilege then raise notice 'ok   [비로그인] 숙제 읽기 거부';
end $$;
reset role;

-- security definer 함수는 모두 search_path가 비어 있게 고정 (다른 스키마의 같은 이름 함수·표로 바꿔치기 방지)
select pg_temp.expect('구조', 'search_path 고정 안 된 security definer 함수', (
  select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.prosecdef
    and not coalesce(p.proconfig @> array['search_path=""'], false)), 0);
select pg_temp.expect('구조', 'set_student_programs search_path 고정', (
  select count(*) from pg_proc where oid = 'public.set_student_programs(uuid, text[])'::regprocedure
    and prosecdef and proconfig @> array['search_path=""']), 1);

\echo '모든 권한 테스트 통과'
