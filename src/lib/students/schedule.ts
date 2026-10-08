import { z } from "zod";
import { WEEKDAY_KO } from "@/lib/date";

// 원장님 학생 수정 중 "반 · 수업 시간" 저장 규칙 (CLS-02, STU-04, 10/9). 서버 함수와 화면이 같은 규칙을 쓴다
// 반은 여러 개 가능, 시간표는 요일 + 시작 시간 + 수업 시간(분). 같은 요일에 두 수업이 겹치면 저장하지 않는다

export const MAX_SLOTS = 14;
export const DURATION_MIN = 10;
export const DURATION_MAX = 300;

export const slotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "시작 시간을 다시 확인해 주세요"),
  durationMin: z
    .number({ error: "수업 시간(분)을 입력해 주세요" })
    .int("수업 시간(분)은 숫자로 입력해 주세요")
    .min(DURATION_MIN, `수업 시간은 ${DURATION_MIN}분 이상으로 입력해 주세요`)
    .max(DURATION_MAX, `수업 시간은 ${DURATION_MAX}분 이하로 입력해 주세요`),
});
export type Slot = z.infer<typeof slotSchema>;

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** 같은 요일에 시간이 겹치는 수업이 있으면 안내 문장, 없으면 null (화면에서 바로 보여 줄 때도 쓴다) */
export function scheduleOverlap(slots: readonly Slot[]): string | null {
  const sorted = [...slots].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (a.weekday === b.weekday && toMin(a.start) + a.durationMin > toMin(b.start)) {
      return `${WEEKDAY_KO[a.weekday]}요일 ${a.start}과 ${b.start} 수업 시간이 겹쳐요`;
    }
  }
  return null;
}

/** 하루를 넘기는 수업 (예: 23:30 시작 90분) */
const overMidnight = (s: Slot) => toMin(s.start) + s.durationMin > 24 * 60;

export const classesScheduleSchema = z
  .object({
    classIds: z.array(z.string().min(1)).max(20),
    schedule: z.array(slotSchema).max(MAX_SLOTS, `수업 시간은 ${MAX_SLOTS}개까지 넣을 수 있어요`),
  })
  .superRefine((v, ctx) => {
    const late = v.schedule.find(overMidnight);
    if (late) ctx.addIssue({ code: "custom", path: ["schedule"], message: `${WEEKDAY_KO[late.weekday]}요일 수업이 밤 12시를 넘겨요` });
    const overlap = scheduleOverlap(v.schedule);
    if (overlap) ctx.addIssue({ code: "custom", path: ["schedule"], message: overlap });
  })
  .transform((v) => ({ classIds: [...new Set(v.classIds)], schedule: v.schedule }));

export type ClassesSchedule = z.output<typeof classesScheduleSchema>;
export type ClassesScheduleField = "classIds" | "schedule";

export function parseClassesSchedule(input: unknown): { ok: true; value: ClassesSchedule } | { ok: false; field: ClassesScheduleField; error: string } {
  const r = classesScheduleSchema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  const issue = r.error.issues[0];
  return { ok: false, field: issue.path[0] === "classIds" ? "classIds" : "schedule", error: issue.message };
}

/** 두 시간표가 같은지 (순서 무시). 바뀌지 않았으면 저장하지 않는다 */
export function sameSchedule(a: readonly Slot[], b: readonly Slot[]): boolean {
  const key = (s: readonly Slot[]) => s.map((x) => `${x.weekday}-${x.start}-${x.durationMin}`).sort().join();
  return key(a) === key(b);
}
