"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { afterFailure, type Attempt, ID_RULE, IP_RULE, isLocked } from "@/lib/auth/lockout";
import { normalizeLoginId, toLoginEmail } from "@/lib/auth/login-id";
import { isRole, safeNext } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { KEEP_COOKIE, KEEP_MAX_AGE } from "@/lib/supabase/cookies";
import { createClient } from "@/lib/supabase/server";
import { LOCKED_HINT, LOGIN_ERROR, type LoginState, UNAVAILABLE } from "./messages";

// 로그인 (AUTH-01·06·09·10). 실패 이유(없는 아이디·틀린 비밀번호·사용 중지·잠금)는 화면에서 구분하지 않는다

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const rawId = String(form.get("loginId") ?? "").slice(0, 60);
  const id = normalizeLoginId(rawId);
  const password = String(form.get("password") ?? "");
  const keep = form.get("keepSignedIn") === "on";
  const next = String(form.get("next") ?? "");

  const admin = createAdminClient();
  const now = new Date();
  // 아이디 기록과 IP 기록은 같은 표에 열쇠만 달리해 둔다 ("ip:1.2.3.4")
  const ipKey = `ip:${await clientIp()}`;
  const idKey = id ?? "(invalid)";
  const again = { loginId: rawId, keep };
  const { data: rows, error: readError } = await admin.from("login_attempts").select("login_id, fail_count, locked_until, updated_at").in("login_id", [idKey, ipKey]);
  if (readError) {
    console.error("[login] 시도 기록을 읽지 못함", readError.message);
    return { error: UNAVAILABLE, ...again };
  }
  const rec = (key: string) => rows.find((r) => r.login_id === key) as Attempt | undefined;

  if (isLocked(rec(idKey), now) || isLocked(rec(ipKey), now)) {
    return { error: LOGIN_ERROR, hint: LOCKED_HINT, ...again };
  }

  const fail = async (): Promise<LoginState> => {
    const nextId = afterFailure(rec(idKey), now, ID_RULE);
    const nextIp = afterFailure(rec(ipKey), now, IP_RULE);
    const { error: writeError } = await admin.from("login_attempts").upsert([
      { login_id: idKey, ...nextId },
      { login_id: ipKey, ...nextIp },
    ]);
    if (writeError) console.error("[login] 시도 기록을 쓰지 못함", writeError.message);
    return isLocked(nextId, now) || isLocked(nextIp, now) ? { error: LOGIN_ERROR, hint: LOCKED_HINT, ...again } : { error: LOGIN_ERROR, ...again };
  };

  if (!id || !password) return fail();

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

  // 성공하면 그 아이디의 틀린 횟수를 지운다 (IP 기록은 남긴다)
  await admin.from("login_attempts").delete().eq("login_id", idKey);

  // 첫 로그인이면 비밀번호부터 바꾼다 (AUTH-03)
  if (profile.must_change_password) redirect(`/account/password?next=${encodeURIComponent(safeNext(next, role))}`);
  redirect(safeNext(next, role));
}

/** 로그아웃 (AUTH-07): 로그인 쿠키와 상태 유지 표시를 지우고 로그인 화면으로 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(KEEP_COOKIE);
  redirect("/login");
}
