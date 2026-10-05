-- 리트 엘리트 DB 2차 (10/6)
--  1) 서버 전용 관리자 역할(service_role)에 표 권한. "새 테이블 자동 노출 끔"이라 직접 주지 않으면 서버도 못 쓴다
--     쓰는 곳: 로그인 시도 기록(login_attempts), 계정 만들기·비밀번호 재설정. 비밀 키는 서버에만 있다
--  2) 성능: 정책 안의 auth.uid()를 (select auth.uid())로 → 줄마다 다시 계산하지 않고 한 번만 (Supabase 성능 경고 3건)

grant select, insert, update, delete on
  public.profiles, public.login_attempts, public.teachers, public.students, public.student_schedules,
  public.guardians, public.guardian_students, public.classes, public.class_members
to service_role;
grant select on public.teacher_public to service_role;

drop policy own_profile on public.profiles;
create policy own_profile on public.profiles for select to authenticated using (id = (select auth.uid()));

drop policy own_teacher on public.teachers;
create policy own_teacher on public.teachers for select to authenticated using (profile_id = (select auth.uid()));

drop policy see_guardian on public.guardians;
create policy see_guardian on public.guardians for select to authenticated using (
  profile_id = (select auth.uid())
  or exists (select 1 from public.guardian_students gs where gs.guardian_id = guardians.id and private.is_my_student(gs.student_id))
);
