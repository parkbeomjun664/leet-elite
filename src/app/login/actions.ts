"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeLoginId, toLoginEmail } from "@/lib/auth/login-id";
import { isRole, safeNext } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { KEEP_COOKIE, KEEP_MAX_AGE } from "@/lib/supabase/cookies";
import { createClient } from "@/lib/supabase/server";
import { LOCKED_HINT, LOGIN_ERROR, type LoginState, UNAVAILABLE } from "./messages";

// 로그인 (AUTH-01·06·09·10). 실패 이유(없는 아이디·틀린 비밀번호·사용 중지·잠금)는 화면에서 구분하지 않는다

// 요청한 기기의 IP. Vercel이 직접 채우는 머리글을 먼저 본다 (사용자가 꾸민 값이 아니게). 모르면 null → IP 제한은 건너뛴다
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const raw = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0];
  const ip = raw?.trim() ?? "";
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const rawId = String(form.get("loginId") ?? "").slice(0, 60);
  const id = normalizeLoginId(rawId);
  const password = String(form.get("password") ?? "");
  const keep = form.get("keepSignedIn") === "on";
  const next = String(form.get("next") ?? "");
  const again = { loginId: rawId, keep };

  // 비밀번호를 확인하기 "전에" 시도 횟수를 먼저 올리고(DB 함수 한 번, 동시 요청도 차례로 셈), 잠겨 있으면 확인하지 않는다
  // 규칙(아이디 30분 5번, IP 10분 20번, 10분 잠금)은 supabase/migrations/20261006231930_login_attempt_atomic.sql
  const admin = createAdminClient();
  const ip = await clientIp();
  const idKey = id ?? "(invalid)";
  const { data: attempt, error: attemptError } = await admin.rpc("login_attempt_begin", { p_id: idKey, p_ip: ip }).single<{ allowed: boolean; locked: boolean }>();
  if (attemptError || !attempt) {
    console.error("[login] 시도 기록을 남기지 못함", attemptError?.message);
    return { error: UNAVAILABLE, ...again };
  }
  const fail = (): LoginState => (attempt.locked ? { error: LOGIN_ERROR, hint: LOCKED_HINT, ...again } : { error: LOGIN_ERROR, ...again });
  if (!attempt.allowed || !id || !password) return fail();

  // "로그인 상태 유지"를 먼저 정해 두어야 아래에서 만드는 로그인 쿠키의 기한이 맞게 붙는다
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  if (keep) cookieStore.set(KEEP_COOKIE, "1", { maxAge: KEEP_MAX_AGE, httpOnly: true, sameSite: "lax", secure, path: "/" });
  else cookieStore.delete(KEEP_COOKIE);

  const supabase = await createClient({ keep });
  const { data, error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(id), password });
  if (error || !data.user) return fail();

  // 역할이 없거나 사용 중지된 계정은 들여보내지 않는다 (AUTH-05). 문구는 똑같이
  const role = data.user.app_metadata?.role;
  const { data: profile } = await supabase.from("profiles").select("is_active, must_change_password").eq("id", data.user.id).single();
  if (!isRole(role) || !profile?.is_active) {
    await supabase.auth.signOut();
    return fail();
  }

  // 성공: 그 아이디의 횟수를 지우고 IP 횟수는 하나 덜어 낸다 (학원 와이파이에서 여러 학생이 로그인해도 막히지 않게)
  const { error: successError } = await admin.rpc("login_attempt_success", { p_id: idKey, p_ip: ip });
  if (successError) console.error("[login] 성공 기록을 남기지 못함", successError.message);

  // 첫 로그인이면 비밀번호부터 바꾼다 (AUTH-03). 화면 출입(proxy)은 토큰 표시를 보므로 둘 중 하나라도 켜져 있으면
  if (profile.must_change_password || data.user.app_metadata?.must_change_password === true) {
    redirect(`/account/password?next=${encodeURIComponent(safeNext(next, role))}`);
  }
  redirect(safeNext(next, role));
}

/** 로그아웃 (AUTH-07): 로그인 쿠키와 상태 유지 표시를 지우고 로그인 화면으로 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(KEEP_COOKIE);
  redirect("/login");
}
