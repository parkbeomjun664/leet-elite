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

\echo '모든 권한 테스트 통과'
