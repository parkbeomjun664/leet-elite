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
