-- 리트 엘리트 DB 1단계: 계정 · 선생님 · 학생 · 시간표 · 보호자 · 반 (docs/data-model.md)
-- 원칙
--  1) 모든 테이블에 RLS(행 단위 보안)를 켠다. 화면에서 숨기는 것만으로 막지 않는다
--  2) 로그인하지 않은 사용자(anon)에게는 아무 권한도 주지 않는다
--  3) 권한 판단 함수는 API로 노출되지 않는 private 스키마에 둔다
-- 역할: admin(원장님) · teacher(담당 반 학생만) · student(본인만) · parent(자녀만) · kiosk(직접 접근 없음, 출결 함수만 - 3단계)

create schema if not exists private;

-- ── 종류(enum) ─────────────────────────────────────────────
create type public.user_role as enum ('admin', 'teacher', 'student', 'parent', 'kiosk');
create type public.student_status as enum ('enrolled', 'on_leave', 'withdrawn', 'pending');
create type public.guardian_relation as enum ('mother', 'father', 'other');

-- ── 테이블 ────────────────────────────────────────────────
-- 로그인 가능한 모든 사람 (Supabase 로그인 계정과 1:1)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  login_id text not null unique, -- 학원 발급 아이디 (보통 휴대폰 번호) AUTH-02
  display_name text not null,
  phone text,
  is_active boolean not null default true, -- AUTH-05 사용 중지
  must_change_password boolean not null default true, -- AUTH-03 첫 로그인 시 변경
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 로그인 시도 기록 (AUTH-10). 서버(서비스 키)만 읽고 쓴다 → 정책 없음 = 아무도 직접 접근 못 함
create table public.login_attempts (
  login_id text primary key,
  fail_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  real_name text not null, -- 원장님만 본다
  nickname text not null, -- 학생·학부모에게 보이는 이름
  is_active boolean not null default true
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  school text,
  grade text, -- "초6", "중3"
  phone text, -- 없거나 형제가 같이 쓸 수 있어 unique 아님
  status public.student_status not null default 'enrolled',
  enrolled_on date not null default current_date,
  left_on date,
  attendance_code text not null check (attendance_code ~ '^[0-9]{4,6}$'),
  programs text[] not null default '{}', -- 클래스카드·클래스5·오토보카 STU-03
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- 출결 코드는 재원·예정 학생끼리만 겹치면 안 된다 (퇴원생 코드는 다시 쓸 수 있음) STU-02
create unique index students_active_attendance_code on public.students (attendance_code)
  where status in ('enrolled', 'pending');

create table public.student_schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = 일요일
  start_time time not null,
  duration_min smallint not null check (duration_min > 0),
  unique (student_id, weekday, start_time)
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  name text not null, -- "OO맘" 같은 자유 텍스트
  relation public.guardian_relation,
  phone1 text,
  phone2 text
);

create table public.guardian_students (
  guardian_id uuid not null references public.guardians (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  is_primary boolean not null default false,
  notify_attendance boolean not null default true,
  primary key (guardian_id, student_id)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  teacher_id uuid references public.teachers (id) on delete set null,
  weekdays smallint[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0
);

-- 학생 한 명이 여러 반 가능 (N:M). 반을 옮기면 left_on을 채우고 기록은 남긴다
create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  joined_on date not null default current_date,
  left_on date,
  primary key (class_id, student_id, joined_on)
);

create index on public.student_schedules (student_id);
create index on public.guardian_students (student_id);
create index on public.class_members (student_id);
create index on public.classes (teacher_id);

-- ── 권한 판단 함수 (private, 정책 안에서만 쓴다) ──────────────
-- security definer: 정책이 다른 테이블을 볼 때 무한 반복(정책이 정책을 부르는 일)을 막는다
create function private.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_role() = 'admin', false)
$$;

create function private.my_teacher_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select t.id from public.teachers t
  where t.profile_id = auth.uid() and t.is_active and private.my_role() = 'teacher'
$$;

-- 선생님의 담당 학생 = 담당 반에 지금 소속된 학생
create function private.is_my_student(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.class_members m
    join public.classes c on c.id = m.class_id
    where m.student_id = sid and m.left_on is null
      and c.teacher_id = private.my_teacher_id()
  )
$$;

create function private.is_me(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s
    where s.id = sid and s.profile_id = auth.uid() and private.my_role() = 'student'
  )
$$;

create function private.is_my_child(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.guardian_students gs
    join public.guardians g on g.id = gs.guardian_id
    where gs.student_id = sid and g.profile_id = auth.uid() and private.my_role() = 'parent'
  )
$$;

-- 이 학생을 볼 수 있는가 (원장님 · 담당 선생님 · 본인 · 보호자)
create function private.can_see_student(sid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin() or private.is_my_student(sid) or private.is_me(sid) or private.is_my_child(sid)
$$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- ── RLS 켜기 + 로그인 사용자에게 테이블 권한 (실제 범위는 정책이 정한다) ──
alter table public.profiles enable row level security;
alter table public.login_attempts enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.student_schedules enable row level security;
alter table public.guardians enable row level security;
alter table public.guardian_students enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;

revoke all on public.login_attempts from anon, authenticated;
grant select, insert, update, delete on
  public.profiles, public.teachers, public.students, public.student_schedules,
  public.guardians, public.guardian_students, public.classes, public.class_members
to authenticated;

-- ── 정책 ──────────────────────────────────────────────────
-- 원장님: 모든 테이블 전체
create policy admin_all on public.profiles for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.teachers for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.students for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.student_schedules for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.guardians for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.guardian_students for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.classes for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.class_members for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- 누구나 자기 계정은 본다
create policy own_profile on public.profiles for select to authenticated using (id = auth.uid());

-- 선생님: 자기 정보
create policy own_teacher on public.teachers for select to authenticated using (profile_id = auth.uid());

-- 학생 정보: 담당 선생님 · 본인 · 보호자는 읽기만 (수정은 원장님. 선생님의 사용 프로그램 지정은 아래 함수로)
create policy see_student on public.students for select to authenticated using (private.can_see_student(id));
create policy see_schedule on public.student_schedules for select to authenticated using (private.can_see_student(student_id));

-- 보호자: 담당 선생님은 담당 학생의 보호자, 학부모는 자기 정보
create policy see_guardian on public.guardians for select to authenticated using (
  profile_id = auth.uid()
  or exists (select 1 from public.guardian_students gs where gs.guardian_id = guardians.id and private.is_my_student(gs.student_id))
);
create policy see_guardian_link on public.guardian_students for select to authenticated using (
  private.is_my_student(student_id) or private.is_my_child(student_id)
);

-- 반: 담당 선생님은 자기 반, 학생·학부모는 소속된 반
create policy see_class on public.classes for select to authenticated using (
  teacher_id = private.my_teacher_id()
  or exists (
    select 1 from public.class_members m
    where m.class_id = classes.id and m.left_on is null and (private.is_me(m.student_id) or private.is_my_child(m.student_id))
  )
);
create policy see_member on public.class_members for select to authenticated using (private.can_see_student(student_id));

-- ── 학생·학부모에게는 선생님 닉네임만 (실명 숨김) ─────────────
create view public.teacher_public with (security_barrier = true) as
  select id, nickname from public.teachers where is_active;
revoke all on public.teacher_public from anon;
grant select on public.teacher_public to authenticated;

-- ── 선생님이 담당 학생의 사용 프로그램만 바꾸는 함수 (STU-03) ──
create function public.set_student_programs(sid uuid, new_programs text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (private.is_admin() or private.is_my_student(sid)) then
    raise exception '권한이 없습니다' using errcode = '42501';
  end if;
  update public.students set programs = new_programs, updated_at = now() where id = sid;
end;
$$;
revoke all on function public.set_student_programs(uuid, text[]) from public, anon;
grant execute on function public.set_student_programs(uuid, text[]) to authenticated;
