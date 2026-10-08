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

-- security definer 함수는 모두 search_path가 비어 있게 고정 (다른 스키마의 같은 이름 함수·표로 바꿔치기 방지)
select pg_temp.expect('구조', 'search_path 고정 안 된 security definer 함수', (
  select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.prosecdef
    and not coalesce(p.proconfig @> array['search_path=""'], false)), 0);
select pg_temp.expect('구조', 'set_student_programs search_path 고정', (
  select count(*) from pg_proc where oid = 'public.set_student_programs(uuid, text[])'::regprocedure
    and prosecdef and proconfig @> array['search_path=""']), 1);

\echo '모든 권한 테스트 통과'
