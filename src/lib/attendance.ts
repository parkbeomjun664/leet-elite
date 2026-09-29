// 학생의 "오늘 출결 상태"를 계산한다 (ATT-01, ATT-05)
// 미등원은 저장하지 않고 조회할 때 계산: 오늘 수업이 있고, 시작 시간이 지났는데, 등원 기록이 없으면 미등원

import type { Attendance, ScheduleSlot, Student } from "./mock/types";
import { weekdayOf } from "./date";

export type DayStatus =
  | "checked_in" // 등원 (아직 하원 전)
  | "checked_out" // 하원
  | "absent" // 결석
  | "not_arrived" // 미등원 (수업 시작 지남, 기록 없음)
  | "upcoming" // 수업 전
  | "no_class"; // 오늘 수업 없음

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  checked_in: "등원",
  checked_out: "하원",
  absent: "결석",
  not_arrived: "미등원",
  upcoming: "수업 전",
  no_class: "수업 없음",
};

export type StudentDay = {
  student: Student;
  slot: ScheduleSlot | null; // 오늘 수업 시간
  record: Attendance | null;
  status: DayStatus;
};

/**
 * @param date   조회 날짜 (한국 날짜 YYYY-MM-DD)
 * @param nowTime 지금 시각 "HH:MM". 오늘이 아닌 날짜를 볼 때는 null (지난 날짜는 수업이 모두 지난 것으로 본다)
 */
export function studentDay(student: Student, records: Attendance[], date: string, nowTime: string | null): StudentDay {
  const slot = student.schedule.find((s) => s.weekday === weekdayOf(date)) ?? null;
  const record = records.find((r) => r.studentId === student.id && r.date === date) ?? null;

  let status: DayStatus;
  if (record?.status === "absent") status = "absent";
  else if (record?.checkOutAt) status = "checked_out";
  else if (record?.checkInAt) status = "checked_in";
  else if (!slot) status = "no_class";
  else if (nowTime === null || nowTime >= slot.start) status = "not_arrived";
  else status = "upcoming";

  return { student, slot, record, status };
}

/** 보드 정렬: 등원 → 하원 → 미등원 → 수업 전 → 결석 → 수업 없음, 같은 상태끼리는 수업 시간 순 */
const ORDER: DayStatus[] = ["checked_in", "checked_out", "not_arrived", "upcoming", "absent", "no_class"];
export function sortDays(a: StudentDay, b: StudentDay): number {
  const byStatus = ORDER.indexOf(a.status) - ORDER.indexOf(b.status);
  if (byStatus) return byStatus;
  const byTime = (a.slot?.start ?? "99").localeCompare(b.slot?.start ?? "99");
  return byTime || a.student.name.localeCompare(b.student.name, "ko");
}
