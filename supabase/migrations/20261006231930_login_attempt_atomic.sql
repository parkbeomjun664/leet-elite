-- 리트 엘리트 DB 3차 (10/7): 로그인 시도 제한을 한 문장으로 (AUTH-10)
-- 왜: "기록 읽기 → 비밀번호 확인 → 기록 쓰기"를 따로 하면, 같은 아이디로 요청을 한꺼번에 많이 보낼 때
--     모두 "0번 틀림"을 읽고 통과해 잠금이 뚫린다(10/7 코드 리뷰). 비밀번호를 확인하기 "전에" 횟수를 먼저 올리고,
--     그 결과로 들여보낼지 정한다. 같은 줄을 동시에 고치는 요청은 DB가 차례로 세운다
-- 규칙: 아이디 30분 안에 5번 → 10분 잠금 / 같은 IP 10분 안에 20번 → 10분 잠금. 성공하면 아이디 기록은 지우고 IP는 한 번 덜어 낸다
-- 서버(service_role)만 부른다. 로그인한 사람·비로그인은 부를 수 없다

-- 한 열쇠(아이디 또는 "ip:주소")의 횟수를 올리고 결과를 돌려준다
--   allowed: 이번 시도를 해 봐도 되는가 (이미 잠겨 있으면 false, 횟수는 올리지 않는다)
--   locked: 이번 시도로 잠금이 걸렸거나 이미 잠겨 있는가 (화면에 "잠시 후" 안내)
create function private.bump_login_attempt(p_key text, p_limit int, p_window interval, p_lock interval)
returns table (allowed boolean, locked boolean)
language plpgsql security definer set search_path = '' as $$
declare
  was_locked boolean;
  new_count int;
  new_lock timestamptz;
begin
  select a.locked_until > now() into was_locked from public.login_attempts a where a.login_id = p_key for update;
  if coalesce(was_locked, false) then
    return query select false, true;
    return;
  end if;
  insert into public.login_attempts as a (login_id, fail_count, locked_until, updated_at)
  values (p_key, 1, case when 1 >= p_limit then now() + p_lock end, now())
  on conflict (login_id) do update set
    -- 잠금이 끝났거나 기간이 지난 기록은 1부터 다시 센다
    fail_count = case when a.locked_until is not null or a.updated_at < now() - p_window then 1 else a.fail_count + 1 end,
    locked_until = case
      when (case when a.locked_until is not null or a.updated_at < now() - p_window then 1 else a.fail_count + 1 end) >= p_limit
      then now() + p_lock
    end,
    updated_at = now()
  returning a.fail_count, a.locked_until into new_count, new_lock;
  return query select true, new_lock is not null;
end;
$$;

-- 로그인 시도 시작: 아이디·IP 둘 다 올린다. IP를 모르면(null) IP 규칙은 건너뛴다
create function public.login_attempt_begin(p_id text, p_ip text)
returns table (allowed boolean, locked boolean)
language plpgsql security definer set search_path = '' as $$
declare
  id_res record;
  ip_res record;
begin
  select * into id_res from private.bump_login_attempt(p_id, 5, interval '30 minutes', interval '10 minutes');
  if p_ip is null then
    return query select id_res.allowed, id_res.locked;
    return;
  end if;
  select * into ip_res from private.bump_login_attempt('ip:' || p_ip, 20, interval '10 minutes', interval '10 minutes');
  return query select id_res.allowed and ip_res.allowed, id_res.locked or ip_res.locked;
end;
$$;

-- 로그인 성공: 아이디 기록은 지우고, IP는 한 번 덜어 낸다 (학원 와이파이에서 여러 학생이 로그인해도 막히지 않게)
create function public.login_attempt_success(p_id text, p_ip text)
returns void
language sql security definer set search_path = '' as $$
  delete from public.login_attempts where login_id = p_id;
  update public.login_attempts set fail_count = greatest(fail_count - 1, 0)
  where p_ip is not null and login_id = 'ip:' || p_ip and (locked_until is null or locked_until <= now());
$$;

revoke all on function private.bump_login_attempt(text, int, interval, interval) from public, anon, authenticated;
revoke all on function public.login_attempt_begin(text, text) from public, anon, authenticated;
revoke all on function public.login_attempt_success(text, text) from public, anon, authenticated;
grant execute on function public.login_attempt_begin(text, text) to service_role;
grant execute on function public.login_attempt_success(text, text) to service_role;
