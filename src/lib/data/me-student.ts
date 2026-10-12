import "server-only";
import { cache } from "react";
import { homeworkOfStudent } from "@/lib/mock/activity";
import { classById, students as mockStudents } from "@/lib/mock/data";
import { mockStudentIdOf } from "@/lib/mock/seed-ids";
import type { Student } from "@/lib/mock/types";
import { createClient } from "@/lib/supabase/server";
import { isMockRequest } from "./source";

/** 로그인한 학생 (HOME-09, 10/13) */
export type MyStudent = {
  student: Student;
  /** 지금 다니는 반 이름 (" · "로 묶음) */
  className: string;
  /**
   * 숙제·보강·메시지·출결을 찾을 가상 데이터 id. 이것들은 아직 DB가 없어(숙제 10/14~) 가상 데이터를 빌려 쓴다
   * 시드로 넣은 가상 학생만 있고, 실제로 등록한 학생은 null → 빈 목록
   */
  activityId: string | null;
};

/**
 * 로그인한 학생 계정에 연결된 학생 한 명 (students.profile_id = 내 계정). 이름·학교·반·수업 시간은 DB에서
 * - 연결된 학생이 없으면 null (화면은 "학원에 문의" 안내)
 * - 시험 모드(로그인 없음)에서는 예전처럼 숙제가 있는 첫 가상 재원생
 * - 화면 틀(layout)과 본문(page)이 같이 부르므로 요청 하나에 한 번만 읽는다 (cache)
 */
export const loadMyStudent = cache(async (): Promise<MyStudent | null> => {
  if (await isMockRequest()) {
    const s = mockStudents.find((x) => x.status === "enrolled" && homeworkOfStudent(x.id).length > 0)!;
    return { student: s, className: s.classIds.map((id) => classById(id)?.name).filter(Boolean).join(" · "), activityId: s.id };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const me = auth?.claims?.sub;
  if (!me) return null;

  // 학생은 자기 줄·자기 시간표·자기 반만 읽힌다 (RLS see_student·see_schedule·see_member·see_class)
  const { data, error } = await supabase
    .from("students")
    .select(
      `id, name, school, grade, phone, status, enrolled_on, left_on, attendance_code, programs, memo,
       student_schedules ( weekday, start_time, duration_min ),
       class_members ( class_id, left_on, classes ( name, sort_order ) )`,
    )
    .eq("profile_id", me)
    .maybeSingle();
  if (error) throw new Error(`내 정보를 불러오지 못함: ${error.message}`);
  if (!data) return null;

  const current = data.class_members
    .filter((m) => m.left_on === null && m.classes)
    .sort((a, b) => a.classes!.sort_order - b.classes!.sort_order);
  const student: Student = {
    id: data.id,
    name: data.name,
    school: data.school,
    grade: data.grade,
    phone: data.phone,
    status: data.status,
    enrolledOn: data.enrolled_on,
    leftOn: data.left_on,
    attendanceCode: data.attendance_code,
    programs: data.programs,
    memo: data.memo,
    classIds: current.map((m) => m.class_id),
    schedule: data.student_schedules
      .map((x) => ({ weekday: x.weekday, start: x.start_time.slice(0, 5), durationMin: x.duration_min }))
      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
  };
  return { student, className: current.map((m) => m.classes!.name).join(" · "), activityId: mockStudentIdOf(data.id) };
});
