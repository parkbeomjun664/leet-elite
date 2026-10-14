import { WEEKDAY_KO, weekdayOf } from "@/lib/date";

// 숙제 목록에 보이는 글자 (10/14 범준님 목록 개선)

/** "2026-10-16" → "10/16(금)" */
export function dueLabel(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}(${WEEKDAY_KO[weekdayOf(date)]})`;
}

export type DueTone = "past" | "today" | "later";

/** 마감 색 구분: 지남(빨강) · 오늘(주황) · 그 뒤(회색) */
export function dueTone(due: string, today: string): DueTone {
  if (due < today) return "past";
  if (due === today) return "today";
  return "later";
}

type ClassLike = { name: string; studentIds: string[] };

/**
 * 대상 요약: 한 반 학생 전부면 "반이름 · n명", 아니면 "첫 학생 외 n명" (한 명이면 이름만)
 * @param firstName 대상 첫 학생 이름 (이름순)
 */
export function targetSummary(targetIds: string[], classes: ClassLike[], firstName: string): string {
  const n = targetIds.length;
  if (n === 0) return "대상 없음";
  const set = new Set(targetIds);
  const whole = classes.find((c) => c.studentIds.length === n && c.studentIds.every((id) => set.has(id)));
  if (whole) return `${whole.name} · ${n}명`;
  return n === 1 ? firstName : `${firstName} 외 ${n - 1}명`;
}
