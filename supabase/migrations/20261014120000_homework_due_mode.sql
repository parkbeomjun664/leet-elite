-- 리트 엘리트 DB 6차 (10/14 오후, 범준님 숙제 화면 개선)
--  1) 일반 숙제 마감일(due_on, 필수) · 매일 숙제 요일(weekdays, 0=일~6=토) · 제출 방식(submit_mode: 체크만 / 사진 첨부)
--  2) 매일 숙제 제출은 정한 요일에만 · "체크만" 숙제에는 사진을 붙일 수 없다
--  3) 숙제 읽기 정책에 "내가 만든 숙제"를 직접 비교 (넣으면서 돌려받기(insert…select)가 선생님만 막히던 문제, 10/14)

create type public.homework_submit_mode as enum ('check', 'photo');

alter table public.homework
  add column due_on date,
  add column weekdays smallint[],
  add column submit_mode public.homework_submit_mode not null default 'photo';

-- 이미 있는 숙제: 일반은 등록일 + 2일을 마감으로, 매일은 월~금
update public.homework set due_on = ((created_at at time zone 'Asia/Seoul')::date + 2) where kind = 'general' and due_on is null;
update public.homework set weekdays = '{1,2,3,4,5}' where kind = 'daily' and weekdays is null;

alter table public.homework
  add constraint homework_due_weekdays check (
    (kind = 'general' and due_on is not null and weekdays is null)
    or (kind = 'daily' and due_on is null and weekdays is not null and cardinality(weekdays) between 1 and 7
        and weekdays <@ '{0,1,2,3,4,5,6}'::smallint[])
  );

-- ── 제출 지킴이: 매일 숙제는 정한 요일에만 (나머지 규칙은 5차 그대로) ──
create or replace function private.submissions_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  hw public.homework;
begin
  select * into hw from public.homework where id = new.homework_id;
  if hw.kind = 'daily' and (new.for_date is null or new.for_date not between hw.starts_on and hw.ends_on) then
    raise exception '매일 숙제는 기간 안의 날짜로 제출해야 합니다' using errcode = '23514';
  end if;
  if hw.kind = 'daily' and not (extract(dow from new.for_date)::smallint = any (hw.weekdays)) then
    raise exception '매일 숙제를 내는 요일이 아닙니다' using errcode = '23514';
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

  if (new.homework_id, new.student_id, new.for_date) is distinct from (old.homework_id, old.student_id, old.for_date)
     or new.submitted_at is distinct from old.submitted_at then
    raise exception '제출 대상은 바꿀 수 없습니다' using errcode = '42501';
  end if;

  if private.is_me(new.student_id) then
    if (new.teacher_comment, new.teacher_comment_by, new.teacher_comment_at)
       is distinct from (old.teacher_comment, old.teacher_comment_by, old.teacher_comment_at) then
      raise exception '선생님 피드백은 고칠 수 없습니다' using errcode = '42501';
    end if;
    new.updated_at := now();
  elsif private.is_admin() or private.is_my_student(new.student_id) then
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

-- ── "체크만" 숙제에는 사진 줄을 못 넣는다 ──
drop policy student_insert_photo on public.submission_photos;
create policy student_insert_photo on public.submission_photos for insert to authenticated with check (
  exists (
    select 1 from public.submissions s join public.homework h on h.id = s.homework_id
    where s.id = submission_id and private.is_me(s.student_id) and h.submit_mode = 'photo'
  )
  and storage_path like (select s.student_id::text || '/' || s.id::text || '/%' from public.submissions s where s.id = submission_id)
);

-- ── 숙제 읽기: 내가 만든 숙제는 줄의 값으로 바로 (함수가 방금 넣은 줄을 못 보는 문제) ──
drop policy see_homework on public.homework;
create policy see_homework on public.homework for select to authenticated using (
  created_by = (select auth.uid()) or private.can_see_homework(id)
);
