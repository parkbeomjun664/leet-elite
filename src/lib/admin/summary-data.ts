import "server-only";
import { studentDay } from "@/lib/attendance";
import { classShort } from "@/lib/admin/class-color";
import { needsMakeup, waitingFeedback } from "@/lib/admin/checks";
import { classStartsToday, isHomeworkDue } from "@/lib/admin/homework-due";
import { classifyMessage, compareTodos, messageTime, tagGroup, type MessageTag } from "@/lib/admin/message-tag";
import { untilLabel } from "@/lib/admin/timeline";
import { addDays, addMinutes, WEEKDAY_KO, weekdayOf } from "@/lib/date";
import { homework, makeups, messages, submissionOf, submissions } from "@/lib/mock/activity";
import { classById, mockAttendanceFor, studentById, students, teacherById, teachers } from "@/lib/mock/data";
import { workLogsFor } from "@/lib/mock/work";

// 원장 홈 v5 데이터 (10/12 원장님 의견 "이전 화면이 더 한눈에 보인다", "시간표는 루틴이라 중요하지 않다")
// 예전 홈(커밋 2d626f9)의 구성 그대로: 오늘 학원 숫자 5칸 → 확인할 일 → 오늘·다음 보강 · 읽지 않은 학부모 메시지
// 모양만 v4 토스 스타일(회색 바탕 + 흰 카드, 반 색 아바타, 용건 태그). 지금은 가상 데이터, 실제 DB는 각 기능 날에

export type SummaryStat = { key: string; label: string; value: number; total?: number; href: string; dot?: "arrive" | "danger" };
export type SummaryCheck = { key: string; title: string; value: number; unit: string; total?: number; detail: string; href: string };
export type Avatar = { sortOrder?: number; short: string };
export type SummaryMakeup = { id: string; time: string; studentName: string; studentInfo: string; detail: string; state: string; live: boolean; avatar: Avatar };
export type SummaryMessage = { id: string; title: string; relation?: string; detail: string; time: string; tag: MessageTag; avatar: Avatar };

/** 이름 목록 → "김서준, 이하윤, 박도윤 외 2명" */
export function namesPreview(names: string[], limit = 3): string {
  return `${names.slice(0, limit).join(", ")}${names.length > limit ? ` 외 ${names.length - limit}명` : ""}`;
}

/** "2026-10-12" → "10/12 (월)" */
function shortDay(day: string): string {
  return `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))} (${WEEKDAY_KO[weekdayOf(day)]})`;
}

/** 보강 상태: 진행 중 / 40분 후 · 2시간 후 / 끝남 */
function makeupState(start: string, end: string, status: string, now: string): { state: string; live: boolean } {
  if (status === "done" || end <= now) return { state: "끝남", live: false };
  if (start <= now) return { state: "진행 중", live: true };
  return { state: untilLabel(start, now), live: false };
}

function avatarOfStudent(studentId: string): Avatar {
  const cls = classById(studentById(studentId)?.classIds[0] ?? "");
  return { sortOrder: cls?.sortOrder, short: cls ? classShort(cls.name) : "학원" };
}

// 확인할 일 줄 순서: 숙제 먼저 (10/13 범준님)
const CHECK_ORDER = ["homework", "feedback", "notArrived", "unread", "teachers", "makeupNeeded"];

export function loadAdminSummary(date: string, now: string) {
  const records = mockAttendanceFor(date, now);
  const nowKey = `${date} ${now}`;
  const enrolled = students.filter((s) => s.status === "enrolled");
  const days = enrolled.map((s) => studentDay(s, records, date, now));
  const withClass = days.filter((d) => d.slot !== null).length;
  const arrived = days.filter((d) => d.status === "checked_in" || d.status === "checked_out").length;
  const absent = days.filter((d) => d.status === "absent").length;
  const notArrived = days.filter((d) => d.status === "not_arrived");
  // 지금(또는 시연 시각)보다 뒤에 낸 제출은 아직 없는 것으로 본다
  const todaySubs = submissions.filter((s) => s.submittedAt.startsWith(date) && s.submittedAt <= nowKey);
  const todaySubStudents = new Set(todaySubs.map((s) => s.studentId)).size;
  const todayMakeups = makeups.filter((m) => m.date === date && m.status !== "cancelled").sort((a, b) => a.start.localeCompare(b.start));
  const workLogs = workLogsFor(date, now);
  const inTeachers = teachers.filter((t) => workLogs.some((w) => w.teacherId === t.id && w.checkInAt !== null));
  const outTeachers = teachers.filter((t) => !inTeachers.includes(t));

  // 숙제 미제출: 어제·오늘 낸 숙제 중 아직 제출하지 않은 재원생 / 그 숙제를 받은 재원생
  // 그 반 오늘 수업 시작 시각이 지난 학생만 센다 (숙제는 수업 때까지 내는 것, 10/12 범준님)
  const classStart = classStartsToday(
    enrolled.flatMap((s, i) => (days[i].slot && s.classIds[0] ? [{ classId: s.classIds[0], start: days[i].slot!.start }] : [])),
  );
  const recentHomework = homework.filter((h) => h.createdOn >= addDays(date, -1) && h.createdOn <= date);
  const assignedDue = enrolled.filter(
    (s) => recentHomework.some((h) => h.studentIds.includes(s.id)) && isHomeworkDue({ now, classStart: classStart.get(s.classIds[0] ?? "") }),
  );
  const missingHw = assignedDue.filter((s) =>
    recentHomework.some((h) => {
      if (!h.studentIds.includes(s.id)) return false;
      const sub = submissionOf(h.id, s.id);
      return !sub || sub.submittedAt > nowKey;
    }),
  );
  const hwAssigned = assignedDue.length;

  // 피드백 안 한 숙제: 최근 3일(주말을 넘겨 월요일 아침에도 금요일 제출이 보이게) 제출, 선생님 코멘트 없음 (10/13)
  const noFeedback = waitingFeedback(submissions, addDays(date, -3), nowKey);
  // 보강 잡을 학생: 최근 7일(오늘 포함) 결석 중 그 뒤 보강이 없는 재원생 (10/13)
  const enrolledIds = new Set(enrolled.map((s) => s.id));
  const recentAbsences = [
    ...Array.from({ length: 7 }, (_, i) => addDays(date, -(i + 1))).flatMap((day) => mockAttendanceFor(day)),
    ...records,
  ].filter((a) => a.status === "absent" && enrolledIds.has(a.studentId));
  const makeupTodo = needsMakeup(recentAbsences, makeups);

  // 읽지 않은 메시지 (확인할 일은 학생 대화방도 센다, 아래 목록은 학부모만)
  const unreadList = messages.filter((m) => (m.from === "parent" || m.from === "student") && !m.read);
  // 오늘 학원 숫자 5칸. 숙제 제출을 첫 칸에 (10/13 범준님: 원장님이 가장 먼저 쓰는 기능이라 눈에 띄게)
  const stats: SummaryStat[] = [
    { key: "homework", label: `숙제 제출 (학생 ${todaySubStudents}명)`, value: todaySubs.length, href: "/admin/homework" },
    { key: "attendance", label: "출결 (등원 / 수업)", value: arrived, total: withClass, href: "/admin/attendance", dot: "arrive" },
    { key: "absent", label: "결석", value: absent, href: "/admin/attendance", dot: "danger" },
    { key: "makeup", label: "보강", value: todayMakeups.length, href: "/admin/makeups" },
    { key: "teachers", label: "선생님 출근", value: inTeachers.length, total: teachers.length, href: "/admin/work-logs" },
  ];

  // 확인할 일: 숫자가 있는 것만. 숙제 줄(미제출·피드백)이 맨 위 (CHECK_ORDER, 10/13 범준님)
  const checks: SummaryCheck[] = [
    { key: "notArrived", title: "미등원 학생", value: notArrived.length, unit: "명", detail: namesPreview(notArrived.map((d) => d.student.name)), href: "/admin/attendance" },
    {
      key: "unread",
      title: "읽지 않은 메시지",
      value: unreadList.length,
      unit: "건",
      detail: namesPreview([...new Set(unreadList.map((m) => studentById(m.studentId)?.name ?? "알 수 없음"))], 2),
      href: "/admin/messages",
    },
    {
      // 아무도 출근 전인 아침에는 띄우지 않는다 (누군가 출근했는데 아직 안 온 선생님만)
      key: "teachers",
      title: "출근하지 않은 선생님",
      value: inTeachers.length > 0 ? outTeachers.length : 0,
      unit: "명",
      detail: namesPreview(outTeachers.map((t) => t.realName)),
      href: "/admin/work-logs",
    },
    {
      key: "homework",
      title: "숙제 미제출 (어제·오늘)",
      value: missingHw.length,
      total: hwAssigned,
      unit: "명",
      detail: namesPreview(missingHw.map((s) => s.name)),
      href: "/admin/homework",
    },
    {
      key: "feedback",
      title: "피드백 안 한 숙제 (최근 3일)",
      value: noFeedback.length,
      unit: "건",
      detail: namesPreview([...new Set(noFeedback.map((s) => studentById(s.studentId)?.name ?? "알 수 없음"))]),
      href: "/admin/homework",
    },
    {
      key: "makeupNeeded",
      title: "보강 잡을 학생 (최근 1주 결석)",
      value: makeupTodo.length,
      unit: "명",
      detail: namesPreview(makeupTodo.map((m) => studentById(m.studentId)?.name ?? "알 수 없음")),
      href: "/admin/makeups",
    },
  ]
    .filter((c) => c.value > 0)
    .sort((a, b) => CHECK_ORDER.indexOf(a.key) - CHECK_ORDER.indexOf(b.key));

  const makeupRow = (m: (typeof makeups)[number], time: string, isToday: boolean): SummaryMakeup => {
    const s = studentById(m.studentId);
    const st = isToday ? makeupState(m.start, addMinutes(m.start, m.durationMin), m.status, now) : { state: "예정", live: false };
    return {
      id: m.id,
      time,
      studentName: s?.name ?? "알 수 없음",
      studentInfo: [s?.school, s?.grade].filter(Boolean).join(" "),
      detail: [m.reason, teacherById(m.teacherId)?.nickname].filter(Boolean).join(" · "),
      state: st.state,
      live: st.live,
      avatar: avatarOfStudent(m.studentId),
    };
  };
  const todayMakeupRows = todayMakeups.map((m) => makeupRow(m, `${m.start}–${addMinutes(m.start, m.durationMin)}`, true));
  // 오늘 보강이 3건 미만이면 다음 보강을 2건까지 이어서
  const nextMakeupRows =
    todayMakeups.length < 3
      ? makeups
          .filter((m) => m.date > date && m.status === "scheduled")
          .sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start))
          .slice(0, 2)
          .map((m) => makeupRow(m, `${shortDay(m.date)} ${m.start}`, false))
      : [];

  // 읽지 않은 학부모 메시지: 오늘 수업에 영향(결석·조퇴·지각) → 최신순 (v4 정렬)
  const messageRows: SummaryMessage[] = unreadList
    .filter((m) => m.from === "parent")
    .map((m) => {
      const st = studentById(m.studentId);
      const tag = classifyMessage(m.body);
      return {
        row: {
          id: m.id,
          title: st?.name ?? m.senderName,
          relation: st && m.senderName.startsWith(st.name) ? m.senderName.slice(st.name.length).trim() || undefined : undefined,
          detail: m.body.split("\n")[0],
          time: messageTime(m.sentAt, date),
          tag,
          avatar: avatarOfStudent(m.studentId),
        },
        sort: { affectsToday: tagGroup(tag) === "today" && m.sentAt.startsWith(date), unread: true, at: m.sentAt },
      };
    })
    .sort((a, b) => compareTodos(a.sort, b.sort))
    .map((x) => x.row);

  return { stats, checks, todayMakeups: todayMakeupRows, nextMakeups: nextMakeupRows, messages: messageRows };
}
