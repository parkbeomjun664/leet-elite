-- 리트 엘리트 DB 5차 (10/14): 숙제·제출·사진 저장 기반 (HW-01~12, 원장님 "숙제 먼저" 10/12)
--  표 4개: homework(숙제 공지) · homework_targets(누구에게) · submissions(학생 제출·선생님 피드백) · submission_photos(제출 사진)
--  사진 보관함: 비공개 버킷 homework-photos, 경로 {student_id}/{submission_id}/{파일}.jpg. 화면은 짧은 서명 주소로만 본다
--  권한: 원장님 전체 · 선생님은 담당 반 학생 것 · 학생은 본인 것 · 학부모는 자녀 것(사진 포함, HW-08 10/12 원장님)
--  퇴원생 사진 삭제(NF-10)는 서버가 보관함 파일을 지운 뒤 제출 줄을 지운다 (10/23 휴원·퇴원 때). 여기서는 지울 수 있는 구조만

create type public.homework_kind as enum ('general', 'daily');

-- ── 표 ────────────────────────────────────────────────────
-- 숙제 공지 (HW-01~03). 매일 숙제는 기간(하루짜리는 시작 = 끝)
create table public.homework (
  id uuid primary key default gen_random_uuid(),
  kind public.homework_kind not null,
  title text not null check (length(btrim(title)) between 1 and 100),
  body text not null default '' check (length(body) <= 2000),
  starts_on date,
  ends_on date,
  created_by uuid references public.profiles (id) on delete set null,
  archived_at timestamptz, -- 제출물이 있으면 삭제 대신 보관 (HW-12)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint homework_daily_period check (
    (kind = 'daily' and starts_on is not null and ends_on is not null and ends_on >= starts_on)
    or (kind = 'general' and starts_on is null and ends_on is null)
  )
);

-- 숙제 × 대상 학생. "반 전체·전체"는 등록할 때의 학생 목록으로 펼쳐 저장 (나중에 들어온 학생에게 예전 숙제가 생기지 않게)
create table public.homework_targets (
  homework_id uuid not null references public.homework (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  primary key (homework_id, student_id)
);

-- 학생 제출 (HW-06·10). 매일 숙제는 날짜마다 한 번, 일반 숙제는 한 번 (for_date null)
-- 대상에서 빠지거나 숙제를 지우려 하면 제출물이 있는 한 막힌다(restrict) → 화면은 삭제 대신 보관 (HW-12)
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null,
  student_id uuid not null,
  for_date date,
  comment text not null default '' check (length(comment) <= 1000),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  teacher_comment text check (length(teacher_comment) <= 1000),
  teacher_comment_by uuid references public.profiles (id) on delete set null,
  teacher_comment_at timestamptz,
  foreign key (homework_id, student_id) references public.homework_targets (homework_id, student_id) on delete restrict,
  constraint submissions_once unique nulls not distinct (homework_id, student_id, for_date)
);

-- 제출 사진 (HW-06~08). 한 제출에 최대 10장 (순서 0~9)
create table public.submission_photos (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  storage_path text not null unique,
  sort_order smallint not null check (sort_order between 0 and 9),
  width integer check (width > 0),
  height integer check (height > 0),
  created_at timestamptz not null default now(),
  constraint submission_photos_order unique (submission_id, sort_order)
);

-- 정책·화면에서 자주 찾는 열 (외래 키의 앞 열은 위 기본 키·unique가 이미 덮는다)
create index on public.homework (created_by);
create index on public.homework_targets (student_id);
create index on public.submissions (student_id, submitted_at);
create index on public.submissions (submitted_at) where teacher_comment is null; -- 원장 홈 "피드백 안 한 숙제"

-- ── 권한 판단 함수 (private, 정책 안에서만) ─────────────────
-- 이 숙제를 볼 수 있는가: 원장님 · 만든 사람 · 대상 학생을 볼 수 있는 사람(담당 선생님·본인·보호자)
create function private.can_see_homework(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
    or exists (select 1 from public.homework h where h.id = hid and h.created_by = auth.uid() and private.my_role() in ('admin', 'teacher'))
    or exists (select 1 from public.homework_targets t where t.homework_id = hid and private.can_see_student(t.student_id))
$$;

-- 이 숙제를 고칠 수 있는가: 원장님, 또는 사용 중인 선생님이 직접 만든 숙제
create function private.can_edit_homework(hid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
    or exists (select 1 from public.homework h where h.id = hid and h.created_by = auth.uid() and private.my_teacher_id() is not null)
$$;

-- 보관함 파일 경로의 첫 칸(학생 id). 모양이 틀리면 null (정책에서 오류 대신 거부)
create function private.photo_student(path text) returns uuid
language sql immutable set search_path = '' as $$
  select case when split_part(path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(path, '/', 1)::uuid end
$$;

-- 보관함 파일 경로의 둘째 칸(제출 id)이 그 학생의 제출인가
create function private.photo_submission_ok(path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select split_part(path, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1 from public.submissions s
      where s.id = split_part(path, '/', 2)::uuid and s.student_id = private.photo_student(path)
    )
$$;

grant execute on all functions in schema private to authenticated;

-- ── 제출 지킴이: 학생은 자기 글만, 선생님은 피드백만 고친다 ─────
-- 같은 "로그인한 사람" 역할이라 열 단위 권한으로 나눌 수 없어 트리거로 막는다
create function private.submissions_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  hw public.homework;
begin
  select * into hw from public.homework where id = new.homework_id;
  -- 매일 숙제는 기간 안의 날짜로, 일반 숙제는 날짜 없이
  if hw.kind = 'daily' and (new.for_date is null or new.for_date not between hw.starts_on and hw.ends_on) then
    raise exception '매일 숙제는 기간 안의 날짜로 제출해야 합니다' using errcode = '23514';
  end if;
  if hw.kind = 'general' and new.for_date is not null then
    raise exception '일반 숙제는 날짜 없이 제출합니다' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if hw.archived_at is not null then
      raise exception '보관된 숙제에는 제출할 수 없습니다' using errcode = '42501';
    end if;
    new.submitted_at := now();
    new.updated_at := now();
    if not private.is_admin() then
      new.teacher_comment := null;
      new.teacher_comment_by := null;
      new.teacher_comment_at := null;
    end if;
    return new;
  end if;

  -- 어느 숙제·학생·날짜의 제출인지는 바꿀 수 없다
  if (new.homework_id, new.student_id, new.for_date) is distinct from (old.homework_id, old.student_id, old.for_date)
     or new.submitted_at is distinct from old.submitted_at then
    raise exception '제출 대상은 바꿀 수 없습니다' using errcode = '42501';
  end if;

  if private.is_me(new.student_id) then
    -- 학생: 자기 코멘트만 (피드백 칸은 그대로)
    if (new.teacher_comment, new.teacher_comment_by, new.teacher_comment_at)
       is distinct from (old.teacher_comment, old.teacher_comment_by, old.teacher_comment_at) then
      raise exception '선생님 피드백은 고칠 수 없습니다' using errcode = '42501';
    end if;
    new.updated_at := now();
  elsif private.is_admin() or private.is_my_student(new.student_id) then
    -- 원장님·담당 선생님: 피드백만 (학생 글은 그대로). 누가·언제 남겼는지는 DB가 채운다
    if new.comment is distinct from old.comment then
      raise exception '학생 제출 내용은 고칠 수 없습니다' using errcode = '42501';
    end if;
    if new.teacher_comment is distinct from old.teacher_comment then
      new.teacher_comment_by := auth.uid();
      new.teacher_comment_at := case when new.teacher_comment is null then null else now() end;
    else
      new.teacher_comment_by := old.teacher_comment_by;
      new.teacher_comment_at := old.teacher_comment_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger submissions_guard before insert or update on public.submissions
  for each row execute function private.submissions_guard();

-- ── RLS 켜기 + 표 권한 (실제 범위는 정책이) ────────────────
alter table public.homework enable row level security;
alter table public.homework_targets enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_photos enable row level security;

grant select, insert, update, delete on
  public.homework, public.homework_targets, public.submissions, public.submission_photos
to authenticated, service_role;

-- ── 정책 ──────────────────────────────────────────────────
-- 원장님: 전체
create policy admin_all on public.homework for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.homework_targets for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.submissions for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.submission_photos for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- 숙제: 볼 수 있는 사람은 읽기, 선생님은 자기가 만든 숙제만 등록·수정·삭제
create policy see_homework on public.homework for select to authenticated using (private.can_see_homework(id));
create policy teacher_insert_homework on public.homework for insert to authenticated
  with check (created_by = (select auth.uid()) and private.my_teacher_id() is not null);
create policy teacher_update_homework on public.homework for update to authenticated
  using (private.can_edit_homework(id)) with check (created_by = (select auth.uid()));
create policy teacher_delete_homework on public.homework for delete to authenticated using (private.can_edit_homework(id));

-- 대상: 볼 수 있는 학생만 읽기, 선생님은 자기 숙제에 자기 담당 학생만 넣고 뺀다
create policy see_target on public.homework_targets for select to authenticated using (private.can_see_student(student_id));
create policy teacher_insert_target on public.homework_targets for insert to authenticated
  with check (private.can_edit_homework(homework_id) and private.is_my_student(student_id));
create policy teacher_delete_target on public.homework_targets for delete to authenticated
  using (private.can_edit_homework(homework_id) and private.is_my_student(student_id));

-- 제출: 원장님·담당 선생님·본인·보호자 읽기 / 학생 본인만 제출 / 본인(코멘트)·담당 선생님(피드백)만 수정 (나머지는 트리거)
create policy see_submission on public.submissions for select to authenticated using (private.can_see_student(student_id));
create policy student_insert_submission on public.submissions for insert to authenticated with check (private.is_me(student_id));
create policy update_submission on public.submissions for update to authenticated
  using (private.is_me(student_id) or private.is_my_student(student_id))
  with check (private.is_me(student_id) or private.is_my_student(student_id));

-- 사진 줄: 그 제출을 볼 수 있으면 읽기 / 학생 본인만 추가·삭제
create policy see_photo on public.submission_photos for select to authenticated using (
  exists (select 1 from public.submissions s where s.id = submission_id and private.can_see_student(s.student_id))
);
create policy student_insert_photo on public.submission_photos for insert to authenticated with check (
  exists (select 1 from public.submissions s where s.id = submission_id and private.is_me(s.student_id))
  and storage_path like (select s.student_id::text || '/' || s.id::text || '/%' from public.submissions s where s.id = submission_id)
);
create policy student_delete_photo on public.submission_photos for delete to authenticated using (
  exists (select 1 from public.submissions s where s.id = submission_id and private.is_me(s.student_id))
);

-- ── 사진 보관함 (비공개) ─────────────────────────────────────
-- 긴 변 1600px JPEG로 줄여 올린다(HW-07, 보통 0.3~0.6MB). 여유를 두고 한 장 5MB까지, JPEG만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homework-photos', 'homework-photos', false, 5242880, array['image/jpeg']);

-- 보기: 그 학생을 볼 수 있는 사람 (원장님·담당 선생님·본인·보호자)
create policy homework_photos_select on storage.objects for select to authenticated using (
  bucket_id = 'homework-photos' and private.can_see_student(private.photo_student(name))
);
-- 올리기: 학생 본인이, 자기 제출 폴더에만
create policy homework_photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'homework-photos' and private.is_me(private.photo_student(name)) and private.photo_submission_ok(name)
);
-- 지우기: 학생 본인(제출 고치기) · 원장님. 퇴원생 일괄 삭제는 서버(서비스 키)가
create policy homework_photos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'homework-photos' and (private.is_me(private.photo_student(name)) or private.is_admin())
);
