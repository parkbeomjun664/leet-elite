"use server";

import { revalidatePath } from "next/cache";
import { isMockRequest } from "@/lib/data/source";
import { todayKST } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import { parseHomework, type HomeworkField } from "./form";

export type CreateHomeworkResult = { ok: true; id: string; title: string; targetCount: number } | { ok: false; error: string; field?: HomeworkField };

/**
 * 숙제 등록 (HW-01~03, 10/14). 원장님·선생님 공통
 *  1) 숙제 한 줄 (만든 사람 = 로그인한 사람)  2) 대상 학생 줄들 (반 전체를 골라도 지금 학생으로 펼쳐 저장)
 * - 권한은 DB(RLS)가 막는다: 선생님은 담당 반 학생만 대상에 넣을 수 있고, 사용 중지된 선생님은 등록 못 함
 * - 2)가 실패하면 1)을 지운다 (대상 없는 숙제가 남지 않게)
 */
export async function createHomework(input: unknown): Promise<CreateHomeworkResult> {
  const parsed = parseHomework(input, todayKST());
  if (!parsed.ok) return parsed;
  const v = parsed.value;

  if (await isMockRequest()) return { ok: true, id: `hw-new-${Date.now()}`, title: v.title, targetCount: v.studentIds.length };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const me = auth?.claims?.sub;
  if (!me) return { ok: false, error: "다시 로그인해 주세요." };

  // id는 여기서 만든다: 넣으면서 돌려받으면(insert…select) 읽기 권한 검사 함수가 같은 문장에서 방금 넣은 줄을 못 봐서
  // 선생님 등록이 "권한 없음"으로 막힌다 (원장님은 그 검사를 건너뛰어 통과). 10/14 시험에서 발견
  const hw = { id: crypto.randomUUID() };
  const { error } = await supabase
    .from("homework")
    .insert({ id: hw.id, kind: v.kind, title: v.title, body: v.body, starts_on: v.startsOn, ends_on: v.endsOn, created_by: me });
  if (error) {
    if (error?.code === "42501") return { ok: false, error: "숙제를 등록할 권한이 없어요." };
    console.error("[homework] 등록하지 못함", error?.code, error?.message);
    return { ok: false, error: "등록하지 못했어요. 잠시 후 다시 눌러 주세요." };
  }

  const { error: targetError } = await supabase.from("homework_targets").insert(v.studentIds.map((sid) => ({ homework_id: hw.id, student_id: sid })));
  if (targetError) {
    await supabase.from("homework").delete().eq("id", hw.id);
    if (targetError.code === "42501") return { ok: false, field: "targets", error: "담당하지 않는 학생이 섞여 있어요. 대상을 다시 골라 주세요" };
    console.error("[homework] 대상을 저장하지 못함", targetError.code, targetError.message);
    return { ok: false, error: "등록하지 못했어요. 잠시 후 다시 눌러 주세요." };
  }

  revalidatePath("/admin/homework");
  revalidatePath("/teacher/homework");
  return { ok: true, id: hw.id, title: v.title, targetCount: v.studentIds.length };
}
