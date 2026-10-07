"use server";

import { revalidatePath } from "next/cache";
import { isMockRequest } from "@/lib/data/source";
import { parseStudentBasic, type StudentBasic, type StudentBasicField } from "@/lib/students/basic";
import { createClient } from "@/lib/supabase/server";

export type SaveStudentResult = { ok: true; student: StudentBasic } | { ok: false; error: string; field?: StudentBasicField };

// 재원·예정 학생끼리는 출결 번호가 겹치면 안 된다 (DB 부분 고유 인덱스 students_active_attendance_code)
const ACTIVE = ["enrolled", "pending"] as const;

/**
 * 학생 기본 정보 저장 (STU-01~03, 10/8): 이름·휴대폰·학교·학년·입학일·출결 번호·사용 프로그램·메모
 * - 로그인한 사람의 권한으로 고친다. 원장님만 고칠 수 있고, 선생님은 DB 권한(RLS)이 막는다 (0줄 수정 → 권한 없음)
 * - 출결 번호가 다른 재원생과 겹치면 그 학생 이름으로 안내한다. 동시에 같은 번호로 저장하면 DB가 막고 같은 안내
 * - 화면 흐름 테스트의 시험 모드(로그인 없음)에서는 DB 대신 검사만 하고 성공으로 돌려준다 (src/lib/data/source.ts)
 */
export async function saveStudentBasic(input: unknown): Promise<SaveStudentResult> {
  const parsed = parseStudentBasic(input);
  if (!parsed.ok) return parsed;
  const v = parsed.value;

  if (await isMockRequest()) return { ok: true, student: v };

  const supabase = await createClient();
  const codeOwner = async () => {
    const { data } = await supabase
      .from("students")
      .select("name")
      .eq("attendance_code", v.attendanceCode)
      .in("status", [...ACTIVE])
      .neq("id", v.id)
      .limit(1)
      .maybeSingle();
    return data?.name ?? null;
  };
  const duplicate = (owner: string | null): SaveStudentResult => ({
    ok: false,
    field: "attendanceCode",
    error: owner ? `${v.attendanceCode}번은 ${owner} 학생이 쓰고 있어요` : `${v.attendanceCode}번은 다른 학생이 쓰고 있어요`,
  });

  // 먼저 확인해서 알아보기 쉬운 안내를 띄운다 (확인과 저장 사이에 누가 먼저 저장하면 아래 DB 검사가 막는다)
  const owner = await codeOwner();
  if (owner) return duplicate(owner);

  const { data, error } = await supabase
    .from("students")
    .update({
      name: v.name,
      phone: v.phone,
      school: v.school,
      grade: v.grade,
      enrolled_on: v.enrolledOn,
      attendance_code: v.attendanceCode,
      programs: v.programs,
      memo: v.memo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", v.id)
    .select("id");

  if (error) {
    if (error.code === "23505") return duplicate(await codeOwner()); // 출결 번호가 동시에 겹침
    console.error("[student] 저장하지 못함", error.code, error.message);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 눌러 주세요." };
  }
  // RLS로 막히면 오류 없이 0줄이 바뀐다 (선생님 계정 등)
  if (!data || data.length === 0) return { ok: false, error: "이 학생 정보를 고칠 권한이 없어요." };

  revalidatePath("/admin/students");
  return { ok: true, student: v };
}
