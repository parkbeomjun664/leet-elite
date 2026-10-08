"use server";

import { revalidatePath } from "next/cache";
import { isMockRequest } from "@/lib/data/source";
import { parseStudentBasic, type StudentBasic, type StudentBasicField } from "@/lib/students/basic";
import { parseGuardian, type GuardianEdit, type GuardianField } from "@/lib/students/guardian";
import { parseClassesSchedule, type ClassesSchedule, type ClassesScheduleField } from "@/lib/students/schedule";
import { createClient } from "@/lib/supabase/server";

/** 저장이 안 됐을 때 화면이 그 칸 아래에 안내를 띄우도록 칸 이름을 함께 돌려준다. 보호자 칸은 "guardian:<id>:<칸>" */
export type SaveStudentField = StudentBasicField | ClassesScheduleField | `guardian:${string}:${GuardianField}`;

export type SaveStudentResult =
  | { ok: true; student: StudentBasic; classesSchedule: ClassesSchedule | null; guardians: GuardianEdit[] }
  | { ok: false; error: string; field?: SaveStudentField };

// 재원·예정 학생끼리는 출결 번호가 겹치면 안 된다 (DB 부분 고유 인덱스 students_active_attendance_code)
const ACTIVE = ["enrolled", "pending"] as const;

/**
 * 원장님 학생 수정 저장 (STU-01~04·07, CLS-02). [저장] 한 번에 세 가지를 차례로 저장한다
 *  1) 기본 정보: 이름·휴대폰·학교·학년·입학일·생년월일·출결 번호·사용 프로그램·메모 (10/8, 생년월일 10/9)
 *  2) 반 소속·수업 시간표: 바뀐 경우만. DB 함수 하나로 한 번에 (중간에 끊겨 반만 남지 않게, 10/9)
 *  3) 보호자 정보: 고친 보호자만. 형제는 같은 보호자라 형제 화면에도 같이 바뀐다 (10/9)
 * - 저장 전에 세 가지를 모두 검사하고, 하나라도 틀리면 아무것도 저장하지 않는다
 * - 로그인한 사람의 권한으로 고친다. 원장님만 (RLS + DB 함수 안 확인). 선생님 등은 0줄 → "권한 없음"
 * - 화면 흐름 테스트의 시험 모드(로그인 없음)에서는 DB 대신 검사만 하고 성공으로 돌려준다 (src/lib/data/source.ts)
 */
export async function saveStudent(input: { basic: unknown; classesSchedule?: unknown; guardians?: unknown[] }): Promise<SaveStudentResult> {
  // 1. 모두 검사
  const basic = parseStudentBasic(input.basic);
  if (!basic.ok) return basic;
  const v = basic.value;

  let cs: ClassesSchedule | null = null;
  if (input.classesSchedule !== undefined) {
    const r = parseClassesSchedule(input.classesSchedule);
    if (!r.ok) return r;
    cs = r.value;
  }

  const guardians: GuardianEdit[] = [];
  for (const raw of input.guardians ?? []) {
    const r = parseGuardian(raw);
    if (!r.ok) {
      const id = typeof raw === "object" && raw !== null && "id" in raw ? String(raw.id) : "";
      return { ok: false, error: r.error, field: r.field && id ? `guardian:${id}:${r.field}` : undefined };
    }
    guardians.push(r.value);
  }

  if (await isMockRequest()) return { ok: true, student: v, classesSchedule: cs, guardians };

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

  // 2. 기본 정보
  const { data, error } = await supabase
    .from("students")
    .update({
      name: v.name,
      phone: v.phone,
      school: v.school,
      grade: v.grade,
      enrolled_on: v.enrolledOn,
      birth_date: v.birthDate,
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

  // 3. 반 소속·시간표 (바뀐 경우만)
  if (cs) {
    const { error: e2 } = await supabase.rpc("save_student_classes_schedule", {
      sid: v.id,
      new_class_ids: cs.classIds,
      new_slots: cs.schedule.map((s) => ({ weekday: s.weekday, start_time: s.start, duration_min: s.durationMin })),
    });
    if (e2) {
      console.error("[student] 반·시간표 저장하지 못함", e2.code, e2.message);
      revalidatePath("/admin/students");
      return {
        ok: false,
        field: "schedule",
        error: e2.code === "42501" ? "반·수업 시간을 고칠 권한이 없어요." : "기본 정보는 저장했지만 반·수업 시간은 저장하지 못했어요. 다시 눌러 주세요.",
      };
    }
  }

  // 4. 보호자 (고친 보호자만)
  for (const g of guardians) {
    const { data: gd, error: e3 } = await supabase
      .from("guardians")
      .update({ name: g.name, relation: g.relation, phone1: g.phone1, phone2: g.phone2 })
      .eq("id", g.id)
      .select("id");
    if (e3 || !gd || gd.length === 0) {
      if (e3) console.error("[student] 보호자 저장하지 못함", e3.code, e3.message);
      revalidatePath("/admin/students");
      return { ok: false, field: `guardian:${g.id}:name`, error: "학생 정보는 저장했지만 보호자 정보는 저장하지 못했어요. 다시 눌러 주세요." };
    }
  }

  revalidatePath("/admin/students");
  return { ok: true, student: v, classesSchedule: cs, guardians };
}
