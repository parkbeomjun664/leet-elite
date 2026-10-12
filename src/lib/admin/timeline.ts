// 원장님 새 홈(10/9 v2)의 "오늘 시간표" 블록 계산. 화면에서 계산만 한다 (새 쿼리 없음)
// 우리 DB는 반에 시작·종료 시간이 없고 학생마다 시간이 있다(CLS-01) → 오늘 수업 학생을 반별로 한 블록에 묶는다 (10/9 범준님: 같은 반은 한 블록)
// 블록 시작 = 가장 이른 시작, 끝 = 가장 늦은 끝. 늦게 시작하는 학생은 "15:10 시작 1명"으로 따로 센다

import type { DayStatus } from "@/lib/attendance";

export type TimelineStudent = { id: string; name: string; status: DayStatus; start: string; end: string };

export type ClassBlock = {
  kind: "class";
  id: string; // "c2"
  classId: string;
  className: string;
  teacherName: string | null;
  /** 반 정렬 순서 → 반 색 (class-color.ts) */
  sortOrder?: number;
  start: string; // 가장 이른 시작
  end: string; // 가장 늦은 끝
  students: TimelineStudent[];
  arrived: number; // 등원(하원 포함)
  absent: number;
  /** 수업이 시작됐는데 아직 등원하지 않은 학생 (원장님이 챙길 숫자) */
  notArrived: number;
  total: number;
  /** 블록 시작보다 늦게 시작하는 학생: [{ start: "15:10", count: 1 }] */
  lateStarts: { start: string; count: number }[];
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

export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * 반 블록 만들기
 * @param entries 오늘 수업이 있는 학생 하나당 하나 (학생이 여러 반이면 첫 반 기준)
 */
export function buildClassBlocks(
  entries: { classId: string; className: string; teacherName: string | null; sortOrder?: number; student: TimelineStudent }[],
): ClassBlock[] {
  const byClass = new Map<string, typeof entries>();
  for (const e of entries) byClass.set(e.classId, [...(byClass.get(e.classId) ?? []), e]);

  const blocks: ClassBlock[] = [];
  for (const [classId, list] of byClass) {
    const sorted = [...list].sort((x, y) => x.student.start.localeCompare(y.student.start) || x.student.name.localeCompare(y.student.name, "ko"));
    const first = sorted[0];
    const block: ClassBlock = {
      kind: "class",
      id: classId,
      classId,
      className: first.className,
      teacherName: first.teacherName,
      sortOrder: first.sortOrder,
      start: first.student.start,
      end: first.student.end,
      students: [],
      arrived: 0,
      absent: 0,
      notArrived: 0,
      total: 0,
      lateStarts: [],
    };
    for (const e of sorted) {
      const st = e.student;
      block.students.push(st);
      if (st.end > block.end) block.end = st.end;
      block.total++;
      if (st.status === "checked_in" || st.status === "checked_out") block.arrived++;
      if (st.status === "absent") block.absent++;
      if (st.status === "not_arrived") block.notArrived++;
      if (st.start !== block.start) {
        const late = block.lateStarts.find((l) => l.start === st.start);
        if (late) late.count++;
        else block.lateStarts.push({ start: st.start, count: 1 });
      }
    }
    blocks.push(block);
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

/** 한 문장 요약·오늘 전체 막대에 쓰는 숫자: 지금 수업 중인 반 수 · 오늘 등원/수업 · 결석 · 미등원 */
export function summarize(blocks: Block[], now: string) {
  const classBlocks = blocks.filter((b): b is ClassBlock => b.kind === "class");
  return {
    inClass: new Set(classBlocks.filter((b) => blockState(b, now) === "수업 중").map((b) => b.classId)).size,
    arrived: classBlocks.reduce((n, b) => n + b.arrived, 0),
    total: classBlocks.reduce((n, b) => n + b.total, 0),
    absent: classBlocks.reduce((n, b) => n + b.absent, 0),
    notArrived: classBlocks.reduce((n, b) => n + b.notArrived, 0),
  };
}

// ── v4 (10/12): 요약 카드 히어로 3상태 · 블록 오른쪽 "n시간 후" · 진행 막대 시점 ──

/** 분 → "3시간 49분" · "40분" · "2시간" */
export function durationKo(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}분`;
  return r === 0 ? `${h}시간` : `${h}시간 ${r}분`;
}

/** 아직 시작 전인 블록의 오른쪽 글: "40분 후" · "2시간 후"(시간은 내림) · 1분도 안 남으면 "곧" */
export function untilLabel(start: string, now: string): string {
  const left = toMin(start) - toMin(now);
  if (left < 1) return "곧";
  if (left < 60) return `${left}분 후`;
  return `${Math.floor(left / 60)}시간 후`;
}

/** 진행 막대는 그 반 수업 시작 10분 전부터 (그 전에는 숨김) */
export const PROGRESS_LEAD_MIN = 10;
export function showProgress(b: { start: string }, now: string): boolean {
  return toMin(now) >= toMin(b.start) - PROGRESS_LEAD_MIN;
}

export type DayPhase =
  | { phase: "none" } // 오늘 수업 없음
  | { phase: "before"; first: ClassBlock; minutesToFirst: number }
  | { phase: "during"; live: ClassBlock[]; next: ClassBlock | null }
  | { phase: "after"; lastEnd: string };

/**
 * 오늘의 단계: 첫 수업 전 / 수업 중(첫 수업 시작 ~ 마지막 수업·보강 끝) / 모든 수업 끝
 * 수업 중에는 지금 진행 중인 반과(쉬는 사이면 빈 목록) 다음에 시작할 반
 */
export function dayPhase(blocks: Block[], now: string): DayPhase {
  const classBlocks = blocks.filter((b): b is ClassBlock => b.kind === "class").sort((a, b) => a.start.localeCompare(b.start));
  if (classBlocks.length === 0) return { phase: "none" };
  const first = classBlocks[0];
  const lastEnd = blocks.reduce((m, b) => (b.end > m ? b.end : m), "00:00");
  if (now < first.start) return { phase: "before", first, minutesToFirst: toMin(first.start) - toMin(now) };
  if (now >= lastEnd) return { phase: "after", lastEnd };
  return {
    phase: "during",
    live: classBlocks.filter((b) => blockState(b, now) === "수업 중"),
    next: classBlocks.find((b) => b.start > now) ?? null,
  };
}
