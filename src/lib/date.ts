// 모든 "오늘", "지금"은 한국 시간(Asia/Seoul) 기준으로 계산한다.
// new Date().toISOString().slice(0, 10)은 UTC라서 오전 9시 전에는 어제 날짜가 되므로 쓰지 않는다.

const TZ = "Asia/Seoul";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 한국 날짜 "YYYY-MM-DD" */
export function todayKST(now: Date = new Date()): string {
  return dateFmt.format(now);
}

/** 한국 시각 "HH:MM" */
export function nowTimeKST(now: Date = new Date()): string {
  return timeFmt.format(now);
}

/** 한국 기준 요일 0=일 ~ 6=토 */
export function weekdayKST(now: Date = new Date()): number {
  return WEEKDAY_INDEX[weekdayFmt.format(now)];
}

/** "YYYY-MM-DD"의 요일 (날짜 문자열 자체를 기준으로 계산하므로 시간대 영향 없음) */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "YYYY-MM-DD"에 n일 더하기 */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** "2026-09-29" → "2026년 9월 29일 (화)" */
export function formatDateKo(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAY_KO[weekdayOf(date)]})`;
}

/** "HH:MM" + 분 → "HH:MM" */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * 24시간제 시간 고르기의 선택지 (10/5). 브라우저 기본 시간 칸은 휴대폰 설정에 따라 "오후 02:30"으로 보여서 직접 만든다.
 * 지금 값이 간격에 맞지 않아도(예: 5분 간격인데 14:57) 그 값은 선택지에 넣어 둔다.
 */
export function timeSelectOptions(value: string, minuteStep = 1): { hours: string[]; minutes: string[] } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = Array.from({ length: 24 }, (_, h) => pad(h));
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => pad(i * minuteStep));
  const current = value.slice(3, 5);
  if (/^\d{2}$/.test(current) && !minutes.includes(current)) {
    minutes.push(current);
    minutes.sort();
  }
  return { hours, minutes };
}
