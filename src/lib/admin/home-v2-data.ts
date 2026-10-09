import "server-only";
import { studentDay } from "@/lib/attendance";
import { buildClassBlocks, sortBlocks, type Block } from "@/lib/admin/timeline";
import { addDays, addMinutes } from "@/lib/date";
import { homework, makeups, messages, submissionOf } from "@/lib/mock/activity";
import { classById, mockAttendanceFor, studentById, students, teacherById } from "@/lib/mock/data";

// 원장님 새 홈(10/9 v2) 화면 데이터: 오늘 시간표 블록 + 처리할 일. PC 홈·휴대폰 홈·처리할 일 화면이 함께 쓴다
// 지금은 가상 데이터(기존 계산 재사용, 새 쿼리 없음). 실제 DB 연결은 일별 계획의 각 기능 날에

/** 처리할 일 한 줄. action = 바로 처리 버튼 글자 (지금은 누르면 처리한 것으로 표시만, 실제 답장·알림은 메시지 11/24·알림 11/30에 연결) */
export type TodoItem = {
  id: string;
  kind: "message" | "notArrived" | "absent" | "homework";
  title: string; // 굵게: 보낸 사람, 학생, 반
  detail: string; // 회색 한 줄
  time?: string; // 오른쪽 위 회색
  action: "답장" | "알림" | "연락";
  href: string; // 줄을 누르면 가는 곳
};

const KIND_ORDER: TodoItem["kind"][] = ["notArrived", "absent", "message", "homework"];

/** "2026-10-09 09:12" → 오늘이면 "오전 9:12", 어제 "어제", 그 전 "10/7" */
function msgTime(sentAt: string, today: string): string {
  const [day, time] = sentAt.split(" ");
  if (day === today) {
    const h = Number(time.slice(0, 2));
    return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${time.slice(3, 5)}`;
  }
  if (day === addDays(today, -1)) return "어제";
  return `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;
}

export function loadHomeV2(date: string, now: string): { blocks: Block[]; todos: TodoItem[] } {
  const records = mockAttendanceFor(date, now);
  const enrolled = students.filter((s) => s.status === "enrolled");
  const days = enrolled.map((s) => ({ s, day: studentDay(s, records, date, now) }));

  // ── 오늘 시간표: 반 블록(학생이 여러 반이면 첫 반) + 보강 ◇ ──
  const entries = days.flatMap(({ s, day }) => {
    const cls = classById(s.classIds[0]);
    if (!day.slot || !cls) return [];
    return [
      {
        classId: cls.id,
        className: cls.name,
        teacherName: teacherById(cls.teacherId)?.nickname ?? null,
        student: { id: s.id, name: s.name, status: day.status, start: day.slot.start, end: addMinutes(day.slot.start, day.slot.durationMin) },
      },
    ];
  });
  const makeupBlocks: Block[] = makeups
    .filter((m) => m.date === date && m.status !== "cancelled")
    .map((m) => ({
      kind: "makeup" as const,
      id: m.id,
      start: m.start,
      end: addMinutes(m.start, m.durationMin),
      studentName: studentById(m.studentId)?.name ?? "알 수 없음",
      teacherName: teacherById(m.teacherId)?.nickname ?? null,
      reason: m.reason,
    }));
  const blocks = sortBlocks([...buildClassBlocks(entries), ...makeupBlocks]);

  // ── 처리할 일 ──
  const todos: TodoItem[] = [];
  const className = (classId: string | undefined) => (classId ? (classById(classId)?.name ?? "") : "");

  // 1) 수업이 시작됐는데 아직 안 온 학생 → 보호자에게 알림
  for (const { s, day } of days) {
    if (day.status !== "not_arrived" || !day.slot) continue;
    todos.push({
      id: `na-${s.id}`,
      kind: "notArrived",
      title: `${s.name} 미등원`,
      detail: `${className(s.classIds[0])} · ${day.slot.start} 시작`,
      action: "알림",
      href: `/teacher?class=${s.classIds[0]}`,
    });
  }
  // 2) 사유 없는 결석 → 보호자에게 연락 (연락 여부 칸은 아직 없어서 "사유가 비어 있는 결석"으로 대신, 10/9)
  for (const { s, day } of days) {
    if (day.status !== "absent" || day.record?.memo) continue;
    todos.push({
      id: `ab-${s.id}`,
      kind: "absent",
      title: `${s.name} 결석 · 사유 없음`,
      detail: className(s.classIds[0]),
      action: "연락",
      href: `/teacher?class=${s.classIds[0]}`,
    });
  }
  // 3) 읽지 않은 학부모 메시지 → 답장
  for (const m of messages
    .filter((x) => x.from === "parent" && !x.read)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))) {
    todos.push({
      id: `msg-${m.id}`,
      kind: "message",
      title: m.senderName,
      detail: m.body.split("\n")[0],
      time: msgTime(m.sentAt, date),
      action: "답장",
      href: "/admin/messages",
    });
  }
  // 4) 숙제 미제출이 많은 반 (어제·오늘 숙제, 반 단위, 절반 이상 미제출) → 반 전체에 알림
  const nowKey = `${date} ${now}`;
  const recent = homework.filter((h) => h.createdOn >= addDays(date, -1) && h.createdOn <= date);
  const perClass = new Map<string, { assigned: number; missing: number }>();
  for (const s of enrolled) {
    const mine = recent.filter((h) => h.studentIds.includes(s.id));
    if (mine.length === 0 || !s.classIds[0]) continue;
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
        title: `${className(classId)} 숙제 미제출`,
        detail: `${c.missing}/${c.assigned}명 아직 안 냈어요 (어제·오늘)`,
        action: "알림",
        href: "/admin/homework",
      }),
    );

  todos.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  return { blocks, todos };
}
