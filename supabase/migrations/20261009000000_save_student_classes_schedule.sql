-- 학생의 반 소속·수업 시간표를 한 번에 저장 (CLS-02, STU-04, 10/9)
-- "기존 시간표 지우고 새로 넣기"가 중간에 끊겨 시간표가 반만 남지 않도록 함수 하나(한 트랜잭션)로 처리한다
-- security invoker: 부른 사람의 권한(RLS)이 그대로 적용된다. 원장님만 (admin_all 정책) + 안에서 한 번 더 확인해 알아보기 쉬운 오류로
-- 반에서 빠지면 줄을 지우지 않고 left_on(오늘, 한국 날짜)을 채워 기록을 남긴다. 같은 날 다시 넣으면 그 줄을 되살린다
create function public.save_student_classes_schedule(sid uuid, new_class_ids uuid[], new_slots jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if not private.is_admin() then
    raise exception '권한이 없습니다' using errcode = '42501';
  end if;
  if not exists (select 1 from public.students where id = sid) then
    raise exception '학생을 찾을 수 없습니다' using errcode = 'P0002';
  end if;

  -- 반: 빠진 반은 오늘 날짜로 나간 것으로, 새 반은 오늘부터
  update public.class_members
     set left_on = today
   where student_id = sid and left_on is null and class_id <> all (new_class_ids);

  insert into public.class_members (class_id, student_id, joined_on)
  select c, sid, today
    from (select distinct unnest(new_class_ids) as c) as picked
   where not exists (
     select 1 from public.class_members m
      where m.class_id = picked.c and m.student_id = sid and m.left_on is null)
  on conflict (class_id, student_id, joined_on) do update set left_on = null;

  -- 시간표: 통째로 바꾼다 (요일·시작 시간·수업 시간(분))
  delete from public.student_schedules where student_id = sid;
  insert into public.student_schedules (student_id, weekday, start_time, duration_min)
  select sid, x.weekday, x.start_time, x.duration_min
    from jsonb_to_recordset(new_slots) as x (weekday smallint, start_time time, duration_min smallint);

  update public.students set updated_at = now() where id = sid;
end;
$$;

revoke all on function public.save_student_classes_schedule(uuid, uuid[], jsonb) from public, anon;
grant execute on function public.save_student_classes_schedule(uuid, uuid[], jsonb) to authenticated;
