import { addDays, WEEKDAY_KO, weekdayOf } from "@/lib/date";

// 숙제 등록 입력 검사 (HW-01~03, 10/14). 화면과 서버가 같은 규칙을 쓴다
// DB에도 같은 제한이 있다 (supabase/migrations/20261014*_homework*.sql): 제목 1~100자, 내용 2000자, 일반 숙제 마감일, 매일 숙제 기간·요일
// 10/14 오후 범준님 개선: 일반 숙제 마감일(필수, 기본 오늘+2일) · 매일 숙제 요일(기본 월~금) · 제출 방식(체크만/사진) ·
//   "오늘 날짜 사용" 체크 없앰 → 매일 숙제만 제목을 비우면 날짜가 제목 (일반 숙제는 제목 필수)

export const TITLE_MAX = 100;
export const BODY_MAX = 2000;
export const TARGET_MAX = 300;
/** 매일 숙제 기간은 최대 92일 (한 학기 남짓). 실수로 몇 년짜리 숙제가 생기지 않게 */
export const PERIOD_MAX_DAYS = 92;
/** 요일 칩 순서 (월~일) */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5];

export type HomeworkKind = "general" | "daily";
export type SubmitMode = "check" | "photo";

/** 화면에서 보내는 값 */
export type HomeworkInput = {
  kind: HomeworkKind;
  title: string;
  body: string;
  submitMode: SubmitMode;
  /** 일반 숙제 마감일 */
  dueOn: string;
  /** 매일 숙제 기간 (하루짜리는 시작 = 종료) */
  startsOn: string;
  endsOn: string;
  /** 매일 숙제 요일 0=일 ~ 6=토 */
  weekdays: number[];
  studentIds: string[];
};

/** DB에 넣을 값 */
export type HomeworkDraft = {
  kind: HomeworkKind;
  title: string;
  body: string;
  submitMode: SubmitMode;
  dueOn: string | null;
  startsOn: string | null;
  endsOn: string | null;
  weekdays: number[] | null;
  studentIds: string[];
};

export type HomeworkField = "title" | "body" | "due" | "period" | "targets";
export type ParseResult = { ok: true; value: HomeworkDraft } | { ok: false; error: string; field?: HomeworkField };

const md = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

/** 매일 숙제 제목을 비웠을 때: 하루면 "10/14 (화) 숙제", 기간이면 "10/14~10/20 숙제" */
export function autoDailyTitle(startsOn: string, endsOn: string): string {
  return startsOn === endsOn ? `${md(startsOn)} (${WEEKDAY_KO[weekdayOf(startsOn)]}) 숙제` : `${md(startsOn)}~${md(endsOn)} 숙제`;
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** 두 날짜 사이 날 수 (끝 - 시작) */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** 기간 안에 고른 요일이 하루라도 있는가 */
function hasWeekdayInRange(startsOn: string, endsOn: string, weekdays: number[]): boolean {
  for (let d = startsOn, i = 0; d <= endsOn && i < 7; d = addDays(d, 1), i++) if (weekdays.includes(weekdayOf(d))) return true;
  return false;
}

/**
 * 화면 입력 → DB에 넣을 값. 틀리면 그 칸 이름과 안내
 * @param today 한국 날짜 (todayKST). 지난 마감·기간을 막는 데 쓴다
 */
export function parseHomework(raw: unknown, today: string): ParseResult {
  const v = (raw ?? {}) as Partial<Record<keyof HomeworkInput, unknown>>;
  const kind = v.kind === "daily" ? "daily" : v.kind === "general" ? "general" : null;
  if (!kind) return { ok: false, error: "일반 또는 매일 숙제를 골라 주세요" };
  const submitMode: SubmitMode = v.submitMode === "check" ? "check" : "photo";

  let dueOn: string | null = null;
  let startsOn: string | null = null;
  let endsOn: string | null = null;
  let weekdays: number[] | null = null;
  if (kind === "general") {
    if (!isDate(v.dueOn)) return { ok: false, field: "due", error: "마감일을 골라 주세요" };
    if (v.dueOn < today) return { ok: false, field: "due", error: "마감일이 이미 지났어요" };
    dueOn = v.dueOn;
  } else {
    if (!isDate(v.startsOn) || !isDate(v.endsOn)) return { ok: false, field: "period", error: "시작일과 종료일을 골라 주세요" };
    if (v.endsOn < v.startsOn) return { ok: false, field: "period", error: "종료일이 시작일보다 앞서요" };
    if (daysBetween(v.startsOn, v.endsOn) >= PERIOD_MAX_DAYS) return { ok: false, field: "period", error: `기간은 ${PERIOD_MAX_DAYS}일까지 정할 수 있어요` };
    if (v.endsOn < today) return { ok: false, field: "period", error: "이미 지난 기간이에요" };
    const days = Array.isArray(v.weekdays) ? [...new Set(v.weekdays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b) : [];
    if (days.length === 0) return { ok: false, field: "period", error: "숙제를 내는 요일을 골라 주세요" };
    if (!hasWeekdayInRange(v.startsOn, v.endsOn, days)) return { ok: false, field: "period", error: "기간 안에 고른 요일이 없어요" };
    startsOn = v.startsOn;
    endsOn = v.endsOn;
    weekdays = days;
  }

  let title = typeof v.title === "string" ? v.title.trim().replace(/\s+/g, " ") : "";
  if (!title && kind === "daily") title = autoDailyTitle(startsOn!, endsOn!);
  if (!title) return { ok: false, field: "title", error: "제목을 입력해 주세요" };
  if (title.length > TITLE_MAX) return { ok: false, field: "title", error: `제목은 ${TITLE_MAX}자까지 쓸 수 있어요` };

  const body = typeof v.body === "string" ? v.body.trim() : "";
  if (body.length > BODY_MAX) return { ok: false, field: "body", error: `내용은 ${BODY_MAX}자까지 쓸 수 있어요` };

  const ids = Array.isArray(v.studentIds) ? [...new Set(v.studentIds.filter((x): x is string => typeof x === "string" && x.length > 0))] : [];
  if (ids.length === 0) return { ok: false, field: "targets", error: "숙제를 받을 학생을 골라 주세요" };
  if (ids.length > TARGET_MAX) return { ok: false, field: "targets", error: `한 번에 ${TARGET_MAX}명까지 고를 수 있어요` };

  return { ok: true, value: { kind, title, body, submitMode, dueOn, startsOn, endsOn, weekdays, studentIds: ids } };
}

/**
 * [n명에게 숙제 내기] 버튼을 켤 수 있는가: 제목(일반)·대상·마감(일반)/기간·요일(매일)이 채워졌을 때
 * 자세한 검사(지난 날짜 등)는 누른 뒤 parseHomework가 칸 아래에 안내한다
 */
export function readyToSubmit(v: Pick<HomeworkInput, "kind" | "title" | "dueOn" | "startsOn" | "endsOn" | "weekdays" | "studentIds">): boolean {
  if (v.studentIds.length === 0) return false;
  if (v.kind === "general") return v.title.trim().length > 0 && isDate(v.dueOn);
  return isDate(v.startsOn) && isDate(v.endsOn) && v.weekdays.length > 0;
}

/** 기본값: 일반 마감 = 오늘 + 2일, 매일 기간 = 오늘부터 일주일 */
export function defaultDates(today: string): { dueOn: string; startsOn: string; endsOn: string } {
  return { dueOn: addDays(today, 2), startsOn: today, endsOn: addDays(today, 6) };
}
