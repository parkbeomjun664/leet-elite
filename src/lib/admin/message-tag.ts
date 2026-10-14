import { addDays } from "@/lib/date";

// 처리할 일 메시지의 용건 태그·시간 표시·정렬 (10/12 원장 홈 v4)
// 메시지 내용의 단어로 자동 분류하고, 안 되면 "문의". 원장님이 화면에서 직접 바꿀 수 있다

export type MessageTag = "결석" | "조퇴" | "지각" | "일정" | "문의";
export const MESSAGE_TAGS: MessageTag[] = ["결석", "조퇴", "지각", "일정", "문의"];

/** 태그 색 계열: 오늘 수업에 영향(결석·조퇴·지각) = 빨강 / 일정 = 파랑 / 문의 = 회색 */
export function tagGroup(tag: MessageTag): "today" | "schedule" | "ask" {
  if (tag === "결석" || tag === "조퇴" || tag === "지각") return "today";
  return tag === "일정" ? "schedule" : "ask";
}

// 앞의 규칙이 먼저. "다음 주 월요일부터 30분 늦출 수 있을까요" → 지각이 아니라 일정 (바뀌는 시간표)
const RULES: [MessageTag, RegExp][] = [
  ["일정", /부터|일정|특강|시간을|시간표|변경|바꾸|바꿔|요일을/],
  ["조퇴", /조퇴|일찍|데리러|끝나기 \d*분? ?전|먼저 (가|보내)/],
  ["지각", /지각|늦을|늦게|늦어|늦습니다/],
  ["결석", /결석|쉬게|쉬겠|못 가|못 갈|못 와|빠지|빠질|아파|아프|열이/],
];

/** 메시지 내용 → 용건 태그 */
export function classifyMessage(body: string): MessageTag {
  for (const [tag, re] of RULES) if (re.test(body)) return tag;
  return "문의";
}

/** "2026-10-09 09:12" → 오늘이면 "오전 9:12", 어제 "어제", 그 전 "10/9" */
export function messageTime(sentAt: string, today: string): string {
  const [day, time] = sentAt.split(" ");
  if (day === today) {
    const h = Number(time.slice(0, 2));
    return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${time.slice(3, 5)}`;
  }
  if (day === addDays(today, -1)) return "어제";
  return `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;
}

/** 정렬 키: ① 오늘 수업에 영향 ② 읽지 않음 ③ 최신순 */
export type SortableTodo = { affectsToday: boolean; unread: boolean; at: string };

export function compareTodos(a: SortableTodo, b: SortableTodo): number {
  if (a.affectsToday !== b.affectsToday) return a.affectsToday ? -1 : 1;
  if (a.unread !== b.unread) return a.unread ? -1 : 1;
  return b.at.localeCompare(a.at);
}

/** 출결 용건(결석·조퇴·지각)인가: 원장 홈 메시지 묶음 "출결" / "기타" (10/14 범준님) */
export const isAttendanceTag = (tag: MessageTag) => tagGroup(tag) === "today";

/**
 * 원장 홈 학부모 메시지 정렬 (10/14 범준님): 출결 용건 먼저, 각 묶음 안에서는 최신순
 * @returns 한 줄로 정렬한 목록 (화면은 group이 바뀌는 곳에 "출결"/"기타" 이름을 붙인다)
 */
export function sortByAttendanceThenRecent<T extends { tag: MessageTag; at: string }>(list: T[]): (T & { group: "attendance" | "other" })[] {
  return list
    .map((m) => ({ ...m, group: isAttendanceTag(m.tag) ? ("attendance" as const) : ("other" as const) }))
    .sort((a, b) => (a.group === b.group ? b.at.localeCompare(a.at) : a.group === "attendance" ? -1 : 1));
}
