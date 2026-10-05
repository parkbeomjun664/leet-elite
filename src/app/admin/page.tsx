import Link from "next/link";
import { EmptyLine, PageHeader, Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { studentDay } from "@/lib/attendance";
import { addDays, addMinutes, formatDateKo, nowTimeKST, todayKST } from "@/lib/date";
import { ADMIN_NAV } from "@/lib/nav";
import { mockAttendanceFor, studentById, students, teacherById, teachers } from "@/lib/mock/data";
import { homework, makeups, messages, submissionOf, submissions, unreadCount } from "@/lib/mock/activity";
import { workLogsFor } from "@/lib/mock/work";
import { cn } from "@/lib/cn";

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

// 메뉴 주소는 nav.ts에서 가져온다 (주소가 바뀌어도 여기는 그대로)
function hrefOf(label: string): string {
  for (const item of ADMIN_NAV) {
    const leaf = item.children?.find((c) => c.label === label);
    if (leaf) return leaf.href;
    if (item.label === label) return item.href;
  }
  return "/admin";
}

// 이름 목록 → "김서준, 이하윤, 박도윤 외 2명"
function namesPreview(names: string[], limit = 3): string {
  return `${names.slice(0, limit).join(", ")}${names.length > limit ? ` 외 ${names.length - limit}명` : ""}`;
}

type Card = {
  label: string;
  value: number;
  total?: number; // "12 / 30"처럼 전체 수를 같이 보여 줄 때
  unit: string;
  detail: string;
  href: string;
  tone?: string;
};

// 홈에는 최근 메시지 몇 건만
const UNREAD_LIMIT = 5;

// 바로가기 3줄 (HOME-02)
const MENU_ROWS: { label: string; navLabel: string; desc: string }[][] = [
  [
    { label: "숙제 등록", navLabel: "숙제 등록", desc: "반·학생에게 새 숙제 내기" },
    { label: "숙제 관리", navLabel: "숙제 관리", desc: "제출 현황 확인, 코멘트" },
    { label: "메시지", navLabel: "메시지", desc: "학부모 대화, 예약 발송" },
  ],
  [
    { label: "학생 관리", navLabel: "재원생", desc: "재원생 정보, 시간표, 출결 코드" },
    { label: "반 관리", navLabel: "반 관리", desc: "반 구성, 담당 선생님, 요일" },
    { label: "선생님 관리", navLabel: "선생님 관리", desc: "선생님 계정, 담당 반" },
  ],
  [
    { label: "출결", navLabel: "오늘 출결", desc: "오늘 등원·하원, 미등원 확인" },
    { label: "보강", navLabel: "보강", desc: "보강 일정 등록·확인" },
    { label: "선생님 출퇴근", navLabel: "선생님 출퇴근", desc: "출근·퇴근 기록, 근무 시간" },
  ],
];

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  // 시연용: /admin?at=16:00 처럼 시각을 지정하면 그 시각 기준으로 보여 준다 (가상 데이터 단계에서만)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;

  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const records = mockAttendanceFor(date, now);
  // 지금(또는 시연 시각)보다 뒤에 낸 제출은 아직 없는 것으로 본다 (가상 데이터가 저녁 제출을 미리 만들어 둠)
  const nowKey = `${date} ${now}`;

  // 현황 계산
  const unread = unreadCount();
  const unreadList = messages
    .filter((m) => (m.from === "parent" || m.from === "student") && !m.read)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const todaySubs = submissions.filter((s) => s.submittedAt.startsWith(date) && s.submittedAt <= nowKey);
  const todaySubStudents = new Set(todaySubs.map((s) => s.studentId)).size;
  const todayMakeups = makeups
    .filter((m) => m.date === date && m.status !== "cancelled")
    .sort((a, b) => a.start.localeCompare(b.start));
  const makeupNames = todayMakeups.map((m) => studentById(m.studentId)?.name ?? "알 수 없음");
  const enrolled = students.filter((s) => s.status === "enrolled");
  const days = enrolled.map((s) => studentDay(s, records, date, now));
  const notArrived = days.filter((d) => d.status === "not_arrived");

  // 오늘 출결 요약: 오늘 수업이 있는 학생 수, 등원한 학생 수(하원 포함)
  const withClass = days.filter((d) => d.slot !== null).length;
  const arrived = days.filter((d) => d.status === "checked_in" || d.status === "checked_out").length;
  const absent = days.filter((d) => d.status === "absent").length;

  // 숙제 미제출: 어제·오늘 낸 숙제 중 아직 제출하지 않은 재원생 (원장님이 매일 챙길 숫자)
  const weekStart = addDays(date, -1);
  const recentHomework = homework.filter((h) => h.createdOn >= weekStart && h.createdOn <= date);
  const missingHw = enrolled.filter((s) =>
    recentHomework.some((h) => {
      if (!h.studentIds.includes(s.id)) return false;
      const sub = submissionOf(h.id, s.id);
      return !sub || sub.submittedAt > nowKey;
    }),
  );

  // 선생님 출근 현황 (TCH-04)
  const workLogs = workLogsFor(date, now);
  const inTeachers = teachers.filter((t) => workLogs.some((w) => w.teacherId === t.id && w.checkInAt !== null));
  const outTeachers = teachers.filter((t) => !inTeachers.includes(t));

  // 첫 줄: 바로 확인할 일 4개
  const cards: Card[] = [
    {
      label: "새 메시지",
      value: unread,
      unit: "건",
      detail: unread > 0 ? "읽지 않은 학부모 메시지" : "모두 읽었습니다",
      href: "/admin/messages",
      tone: unread > 0 ? "text-brand" : undefined,
    },
    {
      label: "오늘 숙제 제출",
      value: todaySubs.length,
      unit: "건",
      detail: todaySubs.length > 0 ? `학생 ${todaySubStudents}명 제출` : "아직 제출이 없습니다",
      href: "/admin/homework",
    },
    {
      label: "오늘 보강",
      value: todayMakeups.length,
      unit: "건",
      detail: makeupNames.length > 0 ? makeupNames.join(", ") : "오늘 보강 없음",
      href: "/admin/makeups",
    },
    {
      label: "출결 확인 필요",
      value: notArrived.length,
      unit: "명",
      detail:
        notArrived.length > 0
          ? `미등원: ${namesPreview(notArrived.map((d) => d.student.name))}`
          : "미등원 학생 없음",
      href: "/admin/attendance",
      tone: notArrived.length > 0 ? "text-warn" : undefined,
    },
  ];

  // 둘째 줄: 오늘 운영 현황 3개
  const statusCards: Card[] = [
    {
      label: "오늘 출결",
      value: arrived,
      total: withClass,
      unit: "명",
      detail: withClass > 0 ? `등원 ${arrived} / 오늘 수업 ${withClass} · 결석 ${absent}` : "오늘 수업 학생 없음",
      href: hrefOf("오늘 출결"),
    },
    {
      label: "숙제 미제출",
      value: missingHw.length,
      unit: "명",
      detail: missingHw.length > 0 ? namesPreview(missingHw.map((s) => s.name)) : "어제·오늘 숙제 모두 제출",
      href: hrefOf("숙제 관리"),
    },
    {
      label: "선생님 출근",
      value: inTeachers.length,
      total: teachers.length,
      unit: "명",
      detail:
        inTeachers.length === 0
          ? "아직 출근 기록 없음"
          : outTeachers.length > 0
            ? `미출근: ${namesPreview(outTeachers.map((t) => t.realName))}`
            : "모두 출근",
      href: hrefOf("선생님 출퇴근"),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={<span className="tabular">{formatDateKo(date)}</span>}
        description={`원장님, 오늘 학원 현황입니다. (${now} 기준)`}
      />

      {/* 현황 카드 7개: 누르면 해당 화면으로 이동. 4개 + 3개 두 줄, 두 줄 모두 같은 폭 */}
      <section aria-label="오늘 현황" className="space-y-3">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c) => (
            <li key={c.label}>
              <StatusCard card={c} />
            </li>
          ))}
        </ul>
        {/* 휴대폰·태블릿(2칸)에서는 첫 카드를 한 줄 전체로 써서 혼자 남는 카드가 없게 */}
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {statusCards.map((c, i) => (
            <li key={c.label} className={cn(i === 0 && "col-span-2 lg:col-span-1")}>
              <StatusCard card={c} />
            </li>
          ))}
        </ul>
      </section>

      {/* 바로가기 메뉴 3줄 (HOME-02) */}
      <section aria-label="바로가기">
        <h2 className="mb-3 text-[15px] font-semibold">바로가기</h2>
        <div className="grid grid-cols-3 gap-1">
          {MENU_ROWS.flat().map((m) => (
            <Link
              key={m.label}
              href={hrefOf(m.navLabel)}
              className="flex min-h-14 items-center justify-between gap-2 rounded-[var(--radius-card)] px-3 py-3 transition-colors hover:bg-bg sm:px-4"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{m.label}</span>
                <span className="mt-0.5 hidden truncate text-[13px] text-sub sm:block">{m.desc}</span>
              </span>
              <span className="hidden text-sub/60 sm:inline" aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 오늘 보강 · 읽지 않은 메시지 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title={
            <>
              오늘 보강 <span className="ml-1 text-[13px] font-medium text-sub tabular">{todayMakeups.length}</span>
            </>
          }
          actions={
            <Link href="/admin/makeups" className="text-sm font-semibold text-brand hover:underline">
              전체 보기
            </Link>
          }
          bodyClassName="px-4 py-1"
        >
          {todayMakeups.length === 0 ? (
            <EmptyLine>오늘 보강 일정이 없습니다.</EmptyLine>
          ) : (
            <ul className="divide-y divide-line-soft">
              {todayMakeups.map((m) => {
                const s = studentById(m.studentId);
                const t = teacherById(m.teacherId);
                const end = addMinutes(m.start, m.durationMin);
                const state = m.status === "done" || end <= now ? "끝남" : m.start <= now ? "진행 중" : "예정";
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-24 shrink-0 text-[15px] tabular">
                      {m.start}~{end}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-ink">{s?.name ?? "알 수 없음"}</span>
                      <span className="ml-2 text-sm text-sub">{[s?.school, s?.grade].filter(Boolean).join(" ")}</span>
                      <span className="block truncate text-sm text-sub">
                        {m.reason}
                        {t && ` · ${t.nickname}`}
                      </span>
                    </span>
                    <Badge tone={state === "진행 중" ? "ok" : state === "예정" ? "info" : "neutral"}>{state}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title={
            <>
              읽지 않은 학부모 메시지 <span className="ml-1 text-[13px] font-medium text-sub tabular">{unreadList.length}</span>
            </>
          }
          actions={
            <Link href="/admin/messages" className="text-sm font-semibold text-brand hover:underline">
              전체 보기
            </Link>
          }
          bodyClassName="px-4 py-1"
        >
          {unreadList.length === 0 ? (
            <EmptyLine>읽지 않은 메시지가 없습니다.</EmptyLine>
          ) : (
            <ul className="divide-y divide-line-soft">
              {unreadList.slice(0, UNREAD_LIMIT).map((m) => {
                const s = studentById(m.studentId);
                const [day, time] = m.sentAt.split(" ");
                return (
                  <li key={m.id}>
                    {/* TODO: 해당 학생 대화방으로 바로 이동 */}
                    <Link href="/admin/messages" className="-mx-4 flex items-start gap-3 px-4 py-2.5 hover:bg-bg/60">
                      <span className="w-24 shrink-0 pt-0.5 text-[15px] text-sub tabular">
                        {day === date ? time : `${day.slice(5).replace("-", "/")} ${time}`}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-bold text-ink">{s?.name ?? "알 수 없음"}</span>
                        <span className="ml-2 text-sm text-sub">{m.senderName}</span>
                        <span className="block truncate text-[15px]">{m.body.split("\n")[0]}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {unreadList.length > UNREAD_LIMIT && (
                <li className="py-2.5 text-[15px] text-sub">
                  외 <span className="tabular">{unreadList.length - UNREAD_LIMIT}</span>건은 메시지 화면에서 확인
                </li>
              )}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/** 현황 카드 한 장 */
function StatusCard({ card: c }: { card: Card }) {
  return (
    <Link
      href={c.href}
      className="block h-full rounded-[var(--radius-card)] bg-bg px-4 py-4 transition-colors hover:bg-line-soft"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-sub">{c.label}</span>
        <span className="text-sub" aria-hidden>
          ›
        </span>
      </div>
      <p className={cn("mt-2 text-2xl leading-tight font-semibold tabular", c.tone ?? "text-ink")}>
        {c.value}
        {c.total !== undefined && <span className="ml-1 text-base font-medium text-sub">/ {c.total}</span>}
        <span className="ml-0.5 text-sm font-medium text-sub">{c.unit}</span>
      </p>
      <p className="mt-1 truncate text-[13px] text-sub/80">{c.detail}</p>
    </Link>
  );
}
