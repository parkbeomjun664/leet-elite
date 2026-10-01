-- 로컬 PostgreSQL에서 권한 테스트를 돌리기 위한 Supabase 흉내 (Supabase에는 실행하지 않는다)
-- Supabase에 원래 있는 것: anon·authenticated 역할, auth.users 테이블, auth.uid() 함수
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key);
-- 로그인한 사람 = request.jwt.claim.sub 설정값 (테스트에서 set_config로 바꿔 가며 흉내)
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
