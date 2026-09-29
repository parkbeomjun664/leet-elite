import Link from "next/link";
import { EmptyLine, PageHeader, Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { studentDay } from "@/lib/attendance";
import { addMinutes, formatDateKo, nowTimeKST, todayKST } from "@/lib/date";
import { ADMIN_NAV } from "@/lib/nav";
import { mockAttendanceFor, studentById, students, teacherById } from "@/lib/mock/data";
import { makeups, messages, submissions, unreadCount } from "@/lib/mock/activity";
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

  // 현황 계산
  const unread = unreadCount();
  const unreadList = messages
    .filter((m) => m.from === "parent" && !m.read)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const todaySubs = submissions.filter((s) => s.submittedAt.startsWith(date));
  const todaySubStudents = new Set(todaySubs.map((s) => s.studentId)).size;
  const todayMakeups = makeups
    .filter((m) => m.date === date && m.status !== "cancelled")
    .sort((a, b) => a.start.localeCompare(b.start));
  const makeupNames = todayMakeups.map((m) => studentById(m.studentId)?.name ?? "알 수 없음");
  const notArrived = students
    .filter((s) => s.status === "enrolled")
    .map((s) => studentDay(s, records, date, now))
    .filter((d) => d.status === "not_arrived");

  const cards: { label: string; value: number; unit: string; detail: string; href: string; tone?: string }[] = [
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
      unit: "명",
      detail: makeupNames.length > 0 ? makeupNames.join(", ") : "오늘 보강 없음",
      href: "/admin/makeups",
    },
    {
      label: "출결 확인 필요",
      value: notArrived.length,
      unit: "명",
      detail:
        notArrived.length > 0
          ? `미등원: ${notArrived.slice(0, 3).map((d) => d.student.name).join(", ")}${notArrived.length > 3 ? ` 외 ${notArrived.length - 3}명` : ""}`
          : "미등원 학생 없음",
      href: "/admin/attendance",
      tone: notArrived.length > 0 ? "text-warn" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="tabular">{formatDateKo(date)}</span>}
        description={`원장님, 오늘 학원 현황입니다. (${now} 기준)`}
      />

      {/* 현황 카드: 누르면 해당 화면으로 이동 */}
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link
              href={c.href}
              className="block h-full rounded-[var(--radius-card)] border border-line bg-card px-3 py-3 sm:px-4 sm:py-3.5 transition-colors hover:border-ink/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] text-sub">{c.label}</span>
                <span className="text-sub" aria-hidden>
                  ›
                </span>
              </div>
              <p className={cn("mt-1 text-[28px] leading-tight font-bold tabular", c.tone ?? "text-ink")}>
                {c.value}
                <span className="ml-1 text-base font-semibold text-sub">{c.unit}</span>
              </p>
              <p className="mt-1 truncate text-sm text-sub">{c.detail}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* 바로가기 메뉴 3줄 (HOME-02) */}
      <section aria-label="바로가기">
        <h2 className="mb-2.5 text-base font-bold">바로가기</h2>
        <div className="grid grid-cols-3 gap-2">
          {MENU_ROWS.flat().map((m) => (
            <Link
              key={m.label}
              href={hrefOf(m.navLabel)}
              className="flex min-h-14 items-center justify-between gap-2 rounded-[var(--radius-card)] border border-line bg-card px-3 py-3 sm:px-4 transition-colors hover:border-brand/50 hover:bg-brand-tint/40"
            >
              <span className="min-w-0">
                <span className="block text-base font-bold">{m.label}</span>
                <span className="hidden truncate text-sm text-sub sm:block">{m.desc}</span>
              </span>
              <span className="hidden text-lg text-sub sm:inline" aria-hidden>
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
              오늘 보강 <span className="ml-1 text-[15px] font-semibold text-sub tabular">{todayMakeups.length}</span>
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
                      <span className="text-base font-bold">{s?.name ?? "알 수 없음"}</span>
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
              읽지 않은 학부모 메시지 <span className="ml-1 text-[15px] font-semibold text-sub tabular">{unreadList.length}</span>
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
                        <span className="text-base font-bold">{s?.name ?? "알 수 없음"}</span>
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
