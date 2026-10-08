import "server-only";
import type { AdminStudent, GuardianInfo } from "@/components/students/admin-student-sheet";
import { classes as mockClasses, guardiansOf, studentById, students as mockStudents } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import { isMockRequest } from "./source";

export type ClassChip = { id: string; name: string };
export type AdminStudentList = { rows: AdminStudent[]; classes: ClassChip[] };

// 재원생 화면에 보이는 상태: 재원 + 입학 예정 (휴·퇴원생은 따로, STU-09)
const LISTED = ["enrolled", "pending"] as const;

/**
 * 원장님 재원생 목록 (STU-06). 로그인한 사람의 권한으로 읽으므로 RLS가 그대로 적용된다(원장님은 전체)
 * 시험 모드(로그인 없음)에서는 가상 데이터로 같은 모양을 만든다 → source.ts
 * DB를 읽지 못하면 오류를 던진다 → 화면은 app/error.tsx("화면을 불러오지 못했어요")
 */
export async function loadAdminStudents(): Promise<AdminStudentList> {
  if (await isMockRequest()) return mockAdminStudents();

  const supabase = await createClient();
  const [studentsRes, classesRes] = await Promise.all([
    supabase
      .from("students")
      .select(
        `id, name, school, grade, phone, status, enrolled_on, birth_date, left_on, attendance_code, programs, memo,
         student_schedules ( weekday, start_time, duration_min ),
         class_members ( class_id, left_on ),
         guardian_students ( guardians ( id, name, relation, phone1, phone2, guardian_students ( student_id, students ( name ) ) ) )`,
      )
      .in("status", [...LISTED])
      .order("name"),
    supabase.from("classes").select("id, name").eq("is_active", true).order("sort_order"),
  ]);
  if (studentsRes.error) throw new Error(`재원생을 불러오지 못함: ${studentsRes.error.message}`);
  if (classesRes.error) throw new Error(`반 목록을 불러오지 못함: ${classesRes.error.message}`);

  const rows: AdminStudent[] = studentsRes.data.map((s) => ({
    id: s.id,
    name: s.name,
    school: s.school,
    grade: s.grade,
    phone: s.phone,
    status: s.status,
    enrolledOn: s.enrolled_on,
    birthDate: s.birth_date,
    leftOn: s.left_on,
    // 지금 소속된 반만 (반을 옮기면 left_on이 채워지고 기록은 남는다)
    classIds: s.class_members.filter((m) => m.left_on === null).map((m) => m.class_id),
    schedule: s.student_schedules
      .map((x) => ({ weekday: x.weekday, start: x.start_time.slice(0, 5), durationMin: x.duration_min }))
      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
    attendanceCode: s.attendance_code,
    programs: s.programs,
    memo: s.memo,
    guardians: s.guardian_students
      .map((gs) => gs.guardians)
      .filter((g) => g !== null)
      .map(
        (g): GuardianInfo => ({
          id: g.id,
          name: g.name,
          relation: g.relation,
          phone1: g.phone1 ?? "",
          phone2: g.phone2,
          children: g.guardian_students.map((c) => ({ id: c.student_id, name: c.students?.name ?? "알 수 없음" })),
        }),
      ),
  }));
  return { rows, classes: classesRes.data };
}

/** 시험 모드용: 가상 데이터로 같은 모양 (화면 흐름 테스트·스크린샷 비교가 날마다 같게) */
function mockAdminStudents(): AdminStudentList {
  const rows: AdminStudent[] = mockStudents
    .filter((s) => (LISTED as readonly string[]).includes(s.status))
    .map((s) => ({
      id: s.id,
      name: s.name,
      school: s.school,
      grade: s.grade,
      phone: s.phone,
      status: s.status,
      enrolledOn: s.enrolledOn,
      birthDate: null, // 가상 데이터에는 생년월일이 없다
      leftOn: s.leftOn,
      classIds: [...s.classIds],
      schedule: s.schedule.map((x) => ({ ...x })),
      attendanceCode: s.attendanceCode,
      programs: [...s.programs],
      memo: s.memo,
      guardians: guardiansOf(s.id).map((g) => ({
        id: g.id,
        name: g.name,
        relation: g.relation,
        phone1: g.phone1,
        phone2: g.phone2,
        children: g.studentIds.map((id) => ({ id, name: studentById(id)?.name ?? "알 수 없음" })),
      })),
    }));
  const classes = [...mockClasses].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ id: c.id, name: c.name }));
  return { rows, classes };
}
