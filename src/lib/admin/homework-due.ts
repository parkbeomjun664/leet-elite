// 처리할 일 "숙제 미제출"을 언제부터 보일지 (10/12 범준님)
// 숙제는 다음 수업 때까지 내는 것이라, 그 반의 오늘 수업 시작 시각이 지나야 "안 냈다"로 본다
// 숙제에 마감 시각 칸이 생기면(숙제 기능 11/9) 마감이 있으면 마감, 없으면 수업 시작 시각을 기준으로

/** 반별 오늘 수업 시작 시각 = 그 반 학생들 시작 시각 중 가장 이른 것 ("HH:MM" 문자열 비교) */
export function classStartsToday(entries: { classId: string; start: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of entries) {
    const cur = m.get(e.classId);
    if (!cur || e.start < cur) m.set(e.classId, e.start);
  }
  return m;
}

/**
 * 숙제 미제출을 처리할 일에 올릴 때가 됐는지
 * - 마감 시각(due)이 있으면 마감이 지난 뒤
 * - 없으면 그 반 오늘 수업 시작 시각이 지난 뒤 (같은 분이면 지난 것으로)
 * - 오늘 수업이 없고 마감도 없으면 아직 아님
 */
export function isHomeworkDue({ now, classStart, due }: { now: string; classStart?: string | null; due?: string | null }): boolean {
  const deadline = due ?? classStart;
  return !!deadline && now >= deadline;
}
