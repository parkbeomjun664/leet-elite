// 원장 홈 "확인할 일"에 10/13 더한 두 줄의 규칙 (범준님: 아침에는 메시지 한 줄만 보여 비어 보임)
// 둘 다 수업 시각과 상관없이 하루 종일 의미가 있다

type Sub = { studentId: string; submittedAt: string; teacherComment: string | null };

/**
 * 피드백 안 한 숙제 (HW-10): since부터 지금까지 제출됐는데 선생님 코멘트가 아직 없는 것 (홈은 최근 3일)
 * @param since 이 날짜 0시부터 ("YYYY-MM-DD")
 * @param nowKey "YYYY-MM-DD HH:MM". 이보다 뒤의 제출은 아직 없는 것으로 본다 (가상 데이터가 저녁 제출을 미리 만들어 둠)
 */
export function waitingFeedback<T extends Sub>(subs: T[], since: string, nowKey: string): T[] {
  return subs.filter((s) => s.submittedAt >= since && s.submittedAt <= nowKey && s.teacherComment === null);
}

type Absence = { studentId: string; date: string };
type Mk = { studentId: string; date: string; status: "scheduled" | "done" | "cancelled" };

/**
 * 보강 잡을 학생 (MKP-01): 최근 결석이 있는데, 그 결석 날 이후로 잡힌(예정·완료) 보강이 없는 학생
 * 같은 학생이 여러 번 결석했으면 가장 최근 결석 기준. 결과는 가장 최근 결석이 앞
 */
export function needsMakeup(absences: Absence[], makeups: Mk[]): { studentId: string; lastAbsent: string }[] {
  const last = new Map<string, string>();
  for (const a of absences) if ((last.get(a.studentId) ?? "") < a.date) last.set(a.studentId, a.date);
  return [...last]
    .filter(([sid, day]) => !makeups.some((m) => m.studentId === sid && m.status !== "cancelled" && m.date >= day))
    .map(([studentId, lastAbsent]) => ({ studentId, lastAbsent }))
    .sort((a, b) => b.lastAbsent.localeCompare(a.lastAbsent));
}
