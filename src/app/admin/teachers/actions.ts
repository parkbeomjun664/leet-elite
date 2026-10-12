"use server";

import { revalidatePath } from "next/cache";
import { issueAccount, type IssueAccountResult } from "@/lib/accounts/issue";
import { isMockRequest } from "@/lib/data/source";
import { createClient } from "@/lib/supabase/server";

export type CreateTeacherResult =
  | { ok: true; id: string; realName: string; nickname: string }
  | { ok: false; error: string; field?: "realName" | "nickname" };

/**
 * 선생님 추가 (TCH-01, 10/13): 실명 + 학생·학부모에게 보이는 호칭. 계정은 추가한 뒤 바로 발급한다
 * - 원장님만 (RLS admin_all. 선생님 등은 DB가 거부)
 * - 담당 반·수정·퇴사 처리는 선생님 관리(10/26)
 */
export async function createTeacher(input: { realName: unknown; nickname: unknown }): Promise<CreateTeacherResult> {
  const realName = String(input.realName ?? "").trim().slice(0, 40);
  const nickname = String(input.nickname ?? "").trim().slice(0, 40);
  if (!realName) return { ok: false, field: "realName", error: "이름을 입력해 주세요" };
  if (!nickname) return { ok: false, field: "nickname", error: "학생에게 보일 호칭을 입력해 주세요" };

  if (await isMockRequest()) return { ok: true, id: `t-new-${Date.now()}`, realName, nickname };

  const supabase = await createClient();
  const { data, error } = await supabase.from("teachers").insert({ real_name: realName, nickname }).select("id").single();
  if (error || !data) {
    if (error?.code === "42501") return { ok: false, error: "선생님을 추가할 권한이 없어요." };
    console.error("[teacher] 추가하지 못함", error?.code, error?.message);
    return { ok: false, error: "추가하지 못했어요. 잠시 후 다시 눌러 주세요." };
  }
  revalidatePath("/admin/teachers");
  return { ok: true, id: data.id, realName, nickname };
}

/** 선생님 로그인 계정 발급 (AUTH-01~03, 10/13). 아이디는 보통 선생님 휴대폰 번호 */
export async function issueTeacherAccount(teacherId: string, loginId: string): Promise<IssueAccountResult> {
  const result = await issueAccount("teacher", String(teacherId), String(loginId));
  if (result.ok) revalidatePath("/admin/teachers");
  return result;
}
