-- 로컬 PostgreSQL에서 권한 테스트를 돌리기 위한 Supabase 흉내 (Supabase에는 실행하지 않는다)
-- Supabase에 원래 있는 것: anon·authenticated·service_role 역할, auth.users 테이블, auth.uid() 함수
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls; -- 서버 전용 관리자 (비밀 키)
create schema auth;
create table auth.users (id uuid primary key);
-- 로그인한 사람 = request.jwt.claim.sub 설정값 (테스트에서 set_config로 바꿔 가며 흉내)
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- 사진 보관함 흉내 (10/14 숙제 사진). Supabase에는 storage 스키마·buckets·objects가 원래 있고 objects에 RLS가 켜져 있다
create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
  name text not null, owner uuid default auth.uid(), created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
