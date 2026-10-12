import "server-only";
import { studentDay } from "@/lib/attendance";
import { classShort } from "@/lib/admin/class-color";
import { classStartsToday, isHomeworkDue } from "@/lib/admin/homework-due";
import { classifyMessage, compareTodos, messageTime, tagGroup, type MessageTag } from "@/lib/admin/message-tag";
import { buildClassBlocks, sortBlocks, type Block } from "@/lib/admin/timeline";
import { addDays, addMinutes } from "@/lib/date";
import { homework, makeups, messages, submissionOf } from "@/lib/mock/activity";
import { classById, guardiansOf, mockAttendanceFor, studentById, students, teacherById } from "@/lib/mock/data";

// 원장님 홈 화면 데이터 (10/9 v2 → 10/12 v4): 오늘 시간표 블록 + 처리할 일 + 요약 숫자. PC 홈·휴대폰 홈·처리할 일 화면이 함께 쓴다
// 지금은 가상 데이터(기존 계산 재사용, 새 쿼리 없음). 실제 DB 연결은 일별 계획의 각 기능 날에

/** 처리할 일 한 줄. action = 바로 처리 버튼 글자 (지금은 누르면 처리한 것으로 표시만, 실제 답장·알림은 메시지 11/24·알림 11/30에 연결) */
export type TodoItem = {
  id: string;
  kind: "message" | "notArrived" | "absent" | "homework";
  /** 첫 줄 굵게: 학생 이름(메시지·미등원·결석) 또는 반 이름(숙제) */
  title: string;
  /** 첫 줄 이름 옆 회색: 관계("아버님") 또는 용건("미등원") */
  relation?: string;
  detail: string; // 둘째 줄 회색
  time?: string; // 오른쪽 위 회색: 오늘 "오전 9:12" · 어제 "어제" · 그 전 "10/9"
  action: "답장" | "알림" | "연락";
  href: string; // 줄을 누르면 가는 곳
  /** 아바타: 반 색(정렬 순서) + 반 약칭 */
  avatar: { sortOrder?: number; short: string };
  /** 메시지 용건 태그 (자동 분류, 원장님이 바꿀 수 있다) */
  tag?: MessageTag;
  /** 정렬: ① 오늘 수업에 영향 ② 읽지 않음 ③ 최신순 */
  affectsToday: boolean;
  unread: boolean;
  at: string; // "YYYY-MM-DD HH:MM"
  /** 알림 받는 사람 (알림 버튼 확인 창에 보여 준다, 10/12): "최지안 보호자" · 2명 */
  recipients?: { label: string; count: number };
};

export type HomeStats = { classCount: number; studentCount: number; makeupCount: number };

export function loadAdminHome(date: string, now: string): { blocks: Block[]; todos: TodoItem[]; stats: HomeStats } {
  const records = mockAttendanceFor(date, now);
  const enrolled = students.filter((s) => s.status === "enrolled");
  const days = enrolled.map((s) => ({ s, day: studentDay(s, records, date, now) }));
  const nowKey = `${date} ${now}`;

  // ── 오늘 시간표: 반 블록(학생이 여러 반이면 첫 반) + 보강 ◇ ──
  const entries = days.flatMap(({ s, day }) => {
    const cls = classById(s.classIds[0]);
    if (!day.slot || !cls) return [];
    return [
      {
        classId: cls.id,
        className: cls.name,
        teacherName: teacherById(cls.teacherId)?.nickname ?? null,
        sortOrder: cls.sortOrder,
        student: { id: s.id, name: s.name, status: day.status, start: day.slot.start, end: addMinutes(day.slot.start, day.slot.durationMin) },
      },
    ];
  });
  const todayMakeups = makeups.filter((m) => m.date === date && m.status !== "cancelled");
  const makeupBlocks: Block[] = todayMakeups.map((m) => ({
    kind: "makeup" as const,
    id: m.id,
    start: m.start,
    end: addMinutes(m.start, m.durationMin),
    studentName: studentById(m.studentId)?.name ?? "알 수 없음",
    teacherName: teacherById(m.teacherId)?.nickname ?? null,
    reason: m.reason,
  }));
  const classBlocks = buildClassBlocks(entries);
  const blocks = sortBlocks([...classBlocks, ...makeupBlocks]);
  const stats: HomeStats = { classCount: classBlocks.length, studentCount: entries.length, makeupCount: todayMakeups.length };

  // ── 처리할 일 ──
  const todos: TodoItem[] = [];
  const avatarOf = (classId: string | undefined) => {
    const cls = classId ? classById(classId) : undefined;
    return { sortOrder: cls?.sortOrder, short: cls ? classShort(cls.name) : "학원" };
  };
  const className = (classId: string | undefined) => (classId ? (classById(classId)?.name ?? "") : "");

  // 1) 수업이 시작됐는데 아직 안 온 학생 → 보호자에게 알림 (오늘 수업에 영향)
  for (const { s, day } of days) {
    if (day.status !== "not_arrived" || !day.slot) continue;
    todos.push({
      id: `na-${s.id}`,
      kind: "notArrived",
      title: s.name,
      relation: "미등원",
      detail: `${className(s.classIds[0])} · ${day.slot.start} 시작`,
      action: "알림",
      href: `/teacher?class=${s.classIds[0]}`,
      avatar: avatarOf(s.classIds[0]),
      affectsToday: true,
      unread: true,
      at: `${date} ${day.slot.start}`,
      recipients: { label: `${s.name} 보호자`, count: Math.max(1, guardiansOf(s.id).length) },
    });
  }
  // 2) 사유 없는 결석 → 보호자에게 연락 (연락 여부 칸은 아직 없어서 "사유가 비어 있는 결석"으로 대신, 10/9)
  for (const { s, day } of days) {
    if (day.status !== "absent" || day.record?.memo) continue;
    todos.push({
      id: `ab-${s.id}`,
      kind: "absent",
      title: s.name,
      relation: "결석 · 사유 없음",
      detail: className(s.classIds[0]),
      action: "연락",
      href: `/teacher?class=${s.classIds[0]}`,
      avatar: avatarOf(s.classIds[0]),
      affectsToday: true,
      unread: true,
      at: `${date} ${day.slot?.start ?? "00:00"}`,
    });
  }
  // 3) 읽지 않은 학부모 메시지 → 답장. "황수빈 · 아버님" + 용건 태그
  for (const m of messages.filter((x) => x.from === "parent" && !x.read)) {
    const st = studentById(m.studentId);
    const tag = classifyMessage(m.body);
    const name = st?.name ?? m.senderName;
    todos.push({
      id: `msg-${m.id}`,
      kind: "message",
      title: name,
      relation: st && m.senderName.startsWith(st.name) ? m.senderName.slice(st.name.length).trim() || undefined : undefined,
      detail: m.body.split("\n")[0],
      time: messageTime(m.sentAt, date),
      action: "답장",
      href: "/admin/messages",
      avatar: avatarOf(st?.classIds[0]),
      tag,
      affectsToday: tagGroup(tag) === "today" && m.sentAt.startsWith(date),
      unread: !m.read,
      at: m.sentAt,
    });
  }
  // 4) 숙제 미제출이 많은 반 (어제·오늘 숙제, 반 단위, 절반 이상 미제출) → 안 낸 학생에게 알림
  //    그 반 오늘 수업 시작 시각이 지난 뒤에만 (숙제는 수업 때까지 내는 것, 10/12). 처리할 일 개수도 이 목록 그대로
  const classStart = classStartsToday(entries.map((e) => ({ classId: e.classId, start: e.student.start })));
  const recent = homework.filter((h) => h.createdOn >= addDays(date, -1) && h.createdOn <= date);
  const perClass = new Map<string, { assigned: number; missing: number }>();
  for (const s of enrolled) {
    const mine = recent.filter((h) => h.studentIds.includes(s.id));
    if (mine.length === 0 || !s.classIds[0]) continue;
    if (!isHomeworkDue({ now, classStart: classStart.get(s.classIds[0]) })) continue;
    const missing = mine.some((h) => {
      const sub = submissionOf(h.id, s.id);
      return !sub || sub.submittedAt > nowKey;
    });
    const c = perClass.get(s.classIds[0]) ?? { assigned: 0, missing: 0 };
    c.assigned++;
    if (missing) c.missing++;
    perClass.set(s.classIds[0], c);
  }
  [...perClass.entries()]
    .filter(([, c]) => c.missing * 2 >= c.assigned && c.missing > 0)
    .sort((a, b) => b[1].missing / b[1].assigned - a[1].missing / a[1].assigned || b[1].missing - a[1].missing)
    .slice(0, 3)
    .forEach(([classId, c]) =>
      todos.push({
        id: `hw-${classId}`,
        kind: "homework",
        title: className(classId),
        relation: "숙제 미제출",
        detail: `${c.missing}/${c.assigned}명 아직 안 냈어요 (어제·오늘)`,
        action: "알림",
        href: "/admin/homework",
        avatar: avatarOf(classId),
        affectsToday: false,
        unread: true,
        at: `${date} ${classStart.get(classId) ?? "00:00"}`,
        recipients: { label: "숙제를 안 낸 학생", count: c.missing },
      }),
    );

  todos.sort(compareTodos);
  return { blocks, todos, stats };
}
