import { addDays, WEEKDAY_KO, weekdayOf } from "@/lib/date";

// 숙제 등록 입력 검사 (HW-01~03, 10/14). 화면과 서버가 같은 규칙을 쓴다
// DB에도 같은 제한이 있다 (supabase/migrations/20261014000000_homework.sql): 제목 1~100자, 내용 2000자, 매일 숙제 기간

export const TITLE_MAX = 100;
export const BODY_MAX = 2000;
export const TARGET_MAX = 300;
/** 매일 숙제 기간은 최대 92일 (한 학기 남짓). 실수로 몇 년짜리 숙제가 생기지 않게 */
export const PERIOD_MAX_DAYS = 92;

export type HomeworkKind = "general" | "daily";

/** 화면에서 보내는 값 */
export type HomeworkInput = {
  kind: HomeworkKind;
  title: string;
  /** "오늘 날짜 사용" (HW-02): 제목을 비워 두면 오늘 날짜가 제목 */
  useToday: boolean;
  body: string;
  /** 매일 숙제 "기간 설정" (HW-03). 끄면 오늘 하루 숙제 */
  period: boolean;
  startsOn: string;
  endsOn: string;
  studentIds: string[];
};

/** DB에 넣을 값 */
export type HomeworkDraft = {
  kind: HomeworkKind;
  title: string;
  body: string;
  startsOn: string | null;
  endsOn: string | null;
  studentIds: string[];
};

export type HomeworkField = "title" | "body" | "period" | "targets";
export type ParseResult = { ok: true; value: HomeworkDraft } | { ok: false; error: string; field?: HomeworkField };

/** "2026-10-14" → "10/14 (화) 숙제" */
export function todayTitle(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))} (${WEEKDAY_KO[weekdayOf(date)]}) 숙제`;
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** 두 날짜 사이 날 수 (끝 - 시작) */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * 화면 입력 → DB에 넣을 값. 틀리면 그 칸 이름과 안내
 * @param today 한국 날짜 (todayKST). 오늘 하루 매일 숙제·"오늘 날짜 사용" 제목에 쓴다
 */
export function parseHomework(raw: unknown, today: string): ParseResult {
  const v = (raw ?? {}) as Partial<Record<keyof HomeworkInput, unknown>>;
  const kind = v.kind === "daily" ? "daily" : v.kind === "general" ? "general" : null;
  if (!kind) return { ok: false, error: "일반 또는 매일 숙제를 골라 주세요" };

  let title = typeof v.title === "string" ? v.title.trim().replace(/\s+/g, " ") : "";
  if (!title && v.useToday === true) title = todayTitle(today);
  if (!title) return { ok: false, field: "title", error: "제목을 입력하거나 \"오늘 날짜 사용\"을 켜 주세요" };
  if (title.length > TITLE_MAX) return { ok: false, field: "title", error: `제목은 ${TITLE_MAX}자까지 쓸 수 있어요` };

  const body = typeof v.body === "string" ? v.body.trim() : "";
  if (body.length > BODY_MAX) return { ok: false, field: "body", error: `내용은 ${BODY_MAX}자까지 쓸 수 있어요` };

  let startsOn: string | null = null;
  let endsOn: string | null = null;
  if (kind === "daily") {
    if (v.period === true) {
      if (!isDate(v.startsOn) || !isDate(v.endsOn)) return { ok: false, field: "period", error: "시작일과 종료일을 골라 주세요" };
      if (v.endsOn < v.startsOn) return { ok: false, field: "period", error: "종료일이 시작일보다 앞서요" };
      if (daysBetween(v.startsOn, v.endsOn) >= PERIOD_MAX_DAYS) return { ok: false, field: "period", error: `기간은 ${PERIOD_MAX_DAYS}일까지 정할 수 있어요` };
      if (v.endsOn < today) return { ok: false, field: "period", error: "이미 지난 기간이에요" };
      startsOn = v.startsOn;
      endsOn = v.endsOn;
    } else {
      // 기간을 끄면 오늘 하루 숙제 (날마다 새로 등록, HW-03 ②)
      startsOn = today;
      endsOn = today;
    }
  }

  const ids = Array.isArray(v.studentIds) ? [...new Set(v.studentIds.filter((x): x is string => typeof x === "string" && x.length > 0))] : [];
  if (ids.length === 0) return { ok: false, field: "targets", error: "숙제를 받을 학생을 골라 주세요" };
  if (ids.length > TARGET_MAX) return { ok: false, field: "targets", error: `한 번에 ${TARGET_MAX}명까지 고를 수 있어요` };

  return { ok: true, value: { kind, title, body, startsOn, endsOn, studentIds: ids } };
}

/** 매일 숙제 기간 기본값: 오늘부터 일주일 */
export function defaultPeriod(today: string): { startsOn: string; endsOn: string } {
  return { startsOn: today, endsOn: addDays(today, 6) };
}
