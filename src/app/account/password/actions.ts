"use server";

import { redirect } from "next/navigation";
import { passwordProblem } from "@/lib/auth/password-rule";
import { isRole, safeNext } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_EMAIL_DOMAIN } from "@/lib/auth/login-id";

export type PasswordState = { error?: string; field?: "password" | "confirm" };

// 비밀번호 바꾸기 (AUTH-03). 바꾸면 "바꿔야 함" 표시를 DB(profiles)와 로그인 토큰(app_metadata) 모두에서 끈다
export async function changePassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const next = String(form.get("next") ?? "");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const loginId = user.email?.replace(`@${LOGIN_EMAIL_DOMAIN}`, "") ?? "";
  const problem = passwordProblem(password, loginId);
  if (problem) return { error: problem, field: "password" };
  if (password !== confirm) return { error: "두 칸의 비밀번호가 달라요.", field: "confirm" };

  // 사용 중지된 계정은 바꿀 수 없다 (AUTH-05). 내 계정 줄은 RLS(own_profile)로 읽힌다
  const { data: profile } = await supabase.from("profiles").select("is_active, must_change_password").eq("id", user.id).single();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    redirect("/login");
  }
  // 지난번에 비밀번호는 바뀌고 표시만 덜 꺼진 경우(DB는 꺼짐, 토큰은 켜짐): 비밀번호는 다시 바꾸지 않고 마무리만 한다
  const onlyFinish = !profile.must_change_password && user.app_metadata?.must_change_password === true;

  const { error } = onlyFinish ? { error: null } : await supabase.auth.updateUser({ password });
  if (error) {
    // 지금 비밀번호와 같으면 Supabase가 거절한다
    if (error.code === "same_password") return { error: "지금 비밀번호와 다르게 정해 주세요.", field: "password" };
    console.error("[password] 바꾸지 못함", error.message);
    return { error: "비밀번호를 바꾸지 못했어요. 다시 눌러 주세요." };
  }

  const admin = createAdminClient();
  const [profileUpdate, meta] = await Promise.all([
    admin.from("profiles").update({ must_change_password: false, updated_at: new Date().toISOString() }).eq("id", user.id),
    admin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, must_change_password: false } }),
  ]);
  if (profileUpdate.error || meta.error) {
    console.error("[password] 표시를 끄지 못함", profileUpdate.error?.message, meta.error?.message);
    return { error: "비밀번호는 바뀌었지만 마무리하지 못했어요. 다시 눌러 주세요." };
  }
  // 토큰을 새로 받아야 proxy가 바뀐 표시를 본다
  await supabase.auth.refreshSession();

  const role = user.app_metadata?.role;
  redirect(isRole(role) ? safeNext(next, role) : "/");
}
