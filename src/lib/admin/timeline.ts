// 원장님 새 홈(10/9 v2)의 "오늘 시간표" 블록 계산. 화면에서 계산만 한다 (새 쿼리 없음)
// 우리 DB는 반에 시작·종료 시간이 없고 학생마다 시간이 있다(CLS-01) → 오늘 수업 학생을 "반 + 30분 안에 몰린 시작 시각"으로 묶는다

import type { DayStatus } from "@/lib/attendance";

export type TimelineStudent = { id: string; name: string; status: DayStatus; start: string; end: string };

export type ClassBlock = {
  kind: "class";
  id: string; // "c2-14:30"
  classId: string;
  className: string;
  teacherName: string | null;
  start: string; // 가장 이른 시작
  end: string; // 가장 늦은 끝
  students: TimelineStudent[];
  arrived: number; // 등원(하원 포함)
  absent: number;
  total: number;
};

export type MakeupBlock = {
  kind: "makeup";
  id: string;
  start: string;
  end: string;
  studentName: string;
  teacherName: string | null;
  reason: string;
};

export type Block = ClassBlock | MakeupBlock;
export type BlockState = "끝남" | "수업 중" | "예정";

/** 같은 반 안에서 시작 시각이 이 분 안이면 한 블록으로 묶는다 */
export const CLUSTER_MIN = 30;

export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * 반 블록 만들기
 * @param entries 오늘 수업이 있는 학생 하나당 하나 (학생이 여러 반이면 첫 반 기준)
 */
export function buildClassBlocks(
  entries: { classId: string; className: string; teacherName: string | null; student: TimelineStudent }[],
): ClassBlock[] {
  const byClass = new Map<string, typeof entries>();
  for (const e of entries) byClass.set(e.classId, [...(byClass.get(e.classId) ?? []), e]);

  const blocks: ClassBlock[] = [];
  for (const [classId, list] of byClass) {
    const sorted = [...list].sort((a, b) => a.student.start.localeCompare(b.student.start) || a.student.name.localeCompare(b.student.name, "ko"));
    let current: ClassBlock | null = null;
    for (const e of sorted) {
      if (!current || toMin(e.student.start) - toMin(current.start) > CLUSTER_MIN) {
        current = {
          kind: "class",
          id: `${classId}-${e.student.start}`,
          classId,
          className: e.className,
          teacherName: e.teacherName,
          start: e.student.start,
          end: e.student.end,
          students: [],
          arrived: 0,
          absent: 0,
          total: 0,
        };
        blocks.push(current);
      }
      current.students.push(e.student);
      if (e.student.end > current.end) current.end = e.student.end;
      current.total++;
      if (e.student.status === "checked_in" || e.student.status === "checked_out") current.arrived++;
      if (e.student.status === "absent") current.absent++;
    }
  }
  return blocks;
}

/** 지금 시각 기준 상태: 끝나면 끝남, 시작~끝 사이면 수업 중, 아니면 예정 */
export function blockState(b: { start: string; end: string }, now: string): BlockState {
  if (b.end <= now) return "끝남";
  if (b.start <= now) return "수업 중";
  return "예정";
}

/** 시간순 (같은 시각이면 반 블록 먼저, 그다음 이름) */
export function sortBlocks(blocks: Block[]): Block[] {
  const label = (b: Block) => (b.kind === "class" ? b.className : b.studentName);
  return [...blocks].sort((a, b) => a.start.localeCompare(b.start) || (a.kind === b.kind ? label(a).localeCompare(label(b), "ko") : a.kind === "class" ? -1 : 1));
}

/** 한 문장 요약에 쓰는 숫자: 지금 수업 중인 반 수 · 오늘 등원/수업 · 결석 */
export function summarize(blocks: Block[], now: string) {
  const classBlocks = blocks.filter((b): b is ClassBlock => b.kind === "class");
  return {
    inClass: new Set(classBlocks.filter((b) => blockState(b, now) === "수업 중").map((b) => b.classId)).size,
    arrived: classBlocks.reduce((n, b) => n + b.arrived, 0),
    total: classBlocks.reduce((n, b) => n + b.total, 0),
    absent: classBlocks.reduce((n, b) => n + b.absent, 0),
  };
}
