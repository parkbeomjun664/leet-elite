import "server-only";
import { normalizeLoginId, toLoginEmail } from "@/lib/auth/login-id";
import { makeTempPassword } from "@/lib/auth/temp-password";
import { isMockRequest } from "@/lib/data/source";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 로그인 계정 발급 (STU-08, AUTH-01~03, 10/13). 학생·선생님 공통
// 계정 만들기는 관리자 키(RLS를 건너뜀)로만 되므로, 부른 사람이 원장님인지 여기서 먼저 확인한다

export type IssueAccountResult =
  | { ok: true; loginId: string; tempPassword: string }
  | { ok: false; error: string; field?: "loginId" };

export const LOGIN_ID_RULE = "휴대폰 번호(숫자만) 또는 영문 소문자·숫자로 2~40자로 정해 주세요";

/** 로그인한 사람이 사용 중인 원장님 계정인지. 토큰의 역할과 DB의 계정 줄을 둘 다 본다 (토큰은 최대 1시간 늦을 수 있어서) */
export async function isActiveAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || claims.app_metadata?.role !== "admin") return false;
  const { data: me } = await supabase.from("profiles").select("role, is_active").eq("id", claims.sub).maybeSingle();
  return me?.role === "admin" && me.is_active === true;
}

const TARGET = {
  student: { table: "students", nameColumn: "name" },
  teacher: { table: "teachers", nameColumn: "real_name" },
} as const;

/**
 * 학생(students) 또는 선생님(teachers) 한 줄에 로그인 계정을 만들어 연결한다
 *  1) 아이디 정리·중복 확인 2) 임시 비밀번호로 Supabase 계정 (첫 로그인 때 비밀번호 변경 강제)
 *  3) profiles 한 줄 4) 학생·선생님 줄의 profile_id 연결
 * - 3)·4)가 실패하면 2)에서 만든 계정을 지운다 (profiles는 계정을 따라 같이 지워진다). 반쯤 만든 계정이 남지 않게
 * - 임시 비밀번호는 저장하지 않고 돌려주기만 한다 (화면에 한 번 보여 줌)
 */
export async function issueAccount(role: "student" | "teacher", rowId: string, rawLoginId: string): Promise<IssueAccountResult> {
  const loginId = normalizeLoginId(String(rawLoginId ?? "").slice(0, 60));
  if (!loginId) return { ok: false, field: "loginId", error: LOGIN_ID_RULE };

  // 화면 흐름 테스트의 시험 모드(가상 데이터): DB를 건드리지 않고 성공으로
  if (await isMockRequest()) return { ok: true, loginId, tempPassword: makeTempPassword() };

  if (!(await isActiveAdmin())) return { ok: false, error: "계정을 발급할 권한이 없어요." };

  const { table, nameColumn } = TARGET[role];
  const admin = createAdminClient();
  const { data: row, error: rowError } =
    role === "student"
      ? await admin.from("students").select("name, phone, profile_id").eq("id", rowId).maybeSingle()
      : await admin.from("teachers").select("real_name, profile_id").eq("id", rowId).maybeSingle();
  if (rowError || !row) return { ok: false, error: role === "student" ? "학생을 찾지 못했어요." : "선생님을 찾지 못했어요." };
  if (row.profile_id) return { ok: false, error: "이미 계정이 있어요." };

  const taken = async () => {
    const { data } = await admin.from("profiles").select("id").eq("login_id", loginId).maybeSingle();
    return data !== null;
  };
  const duplicate: IssueAccountResult = { ok: false, field: "loginId", error: `${loginId}는 이미 쓰는 아이디예요. 다른 아이디로 정해 주세요` };
  if (await taken()) return duplicate;

  const tempPassword = makeTempPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: toLoginEmail(loginId),
    password: tempPassword,
    email_confirm: true,
    app_metadata: { role, must_change_password: true },
  });
  if (createError || !created.user) {
    if (createError?.code === "email_exists") return duplicate; // 계정 줄 없이 로그인 계정만 남은 경우도 같은 안내
    console.error("[account] 계정을 만들지 못함", createError?.code, createError?.message);
    return { ok: false, error: "계정을 만들지 못했어요. 잠시 후 다시 눌러 주세요." };
  }
  const userId = created.user.id;
  const undo = async (what: string, message?: string) => {
    console.error(`[account] ${what}`, message);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error("[account] 만든 계정을 지우지 못함", userId, error.message);
  };

  const name = role === "student" ? (row as { name: string }).name : (row as { real_name: string }).real_name;
  const phone = role === "student" ? (row as { phone: string | null }).phone : /^01\d{8,9}$/.test(loginId) ? loginId : null;
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    role,
    login_id: loginId,
    display_name: name,
    phone,
    is_active: true,
    must_change_password: true,
  });
  if (profileError) {
    await undo("계정 정보를 남기지 못함", profileError.message);
    return profileError.code === "23505" ? duplicate : { ok: false, error: "계정을 만들지 못했어요. 잠시 후 다시 눌러 주세요." };
  }

  // 다른 창에서 먼저 발급했으면(profile_id가 이미 채워짐) 0줄 → 방금 만든 계정은 지운다
  const { data: linked, error: linkError } = await admin
    .from(table)
    .update({ profile_id: userId })
    .eq("id", rowId)
    .is("profile_id", null)
    .select("id");
  if (linkError || !linked?.length) {
    await undo(`${nameColumn} 줄에 연결하지 못함`, linkError?.message);
    return { ok: false, error: linkError ? "계정을 연결하지 못했어요. 잠시 후 다시 눌러 주세요." : "이미 계정이 있어요." };
  }
  return { ok: true, loginId, tempPassword };
}
