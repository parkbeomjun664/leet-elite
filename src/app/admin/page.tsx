import { ChevronRight } from "lucide-react";
import Link from "next/link";
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

/** 확인할 일 한 줄: 숫자가 0이면 목록에 넣지 않는다 */
type Todo = {
  title: string;
  value: number;
  unit: string;
  detail: string;
  href: string;
};

/** 오늘 학원 숫자 한 칸 (날짜 아래 가로 한 줄) */
type Stat = {
  label: string;
  value: number;
  total?: number; // "12 / 30"처럼 전체 수를 같이 보여 줄 때
  href: string;
  /** 0보다 클 때 주의 색 (결석만) */
  alert?: boolean;
};

// 홈에는 최근 메시지 몇 건만
const UNREAD_LIMIT = 5;

// 바로가기 (HOME-02): 상단 메뉴와 겹쳐 자주 쓰는 4개만 (10/7 축소, 10/8 테두리 알약으로, decisions.md)
const SHORTCUTS: { label: string; navLabel: string }[] = [
  { label: "숙제 등록", navLabel: "숙제 등록" },
  { label: "출결", navLabel: "오늘 출결" },
  { label: "보강", navLabel: "보강" },
  { label: "메시지", navLabel: "메시지" },
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

  // 확인할 일: 원장님이 지금 처리할 것만, 숫자가 있는 것만 (10/5 시안 "빨간 펜 출석부"에서 가져옴)
  const todos: Todo[] = [
    {
      title: "미등원 학생",
      value: notArrived.length,
      unit: "명",
      detail: namesPreview(notArrived.map((d) => d.student.name)),
      href: hrefOf("오늘 출결"),
    },
    {
      // unreadCount는 학생 대화방도 센다 (예전 카드와 같은 기준)
      title: "읽지 않은 메시지",
      value: unread,
      unit: "건",
      detail: namesPreview([...new Set(unreadList.map((m) => studentById(m.studentId)?.name ?? "알 수 없음"))], 2),
      href: "/admin/messages",
    },
    {
      // 아무도 출근 전인 아침에는 띄우지 않는다 (누군가 출근했는데 아직 안 온 선생님만)
      title: "출근하지 않은 선생님",
      value: inTeachers.length > 0 ? outTeachers.length : 0,
      unit: "명",
      detail: namesPreview(outTeachers.map((t) => t.realName)),
      href: hrefOf("선생님 출퇴근"),
    },
    {
      title: "숙제 미제출 (어제·오늘)",
      value: missingHw.length,
      unit: "명",
      detail: namesPreview(missingHw.map((s) => s.name)),
      href: hrefOf("숙제 관리"),
    },
  ].filter((t) => t.value > 0);

  // 오늘 학원: 운영 숫자 한눈에
  const stats: Stat[] = [
    { label: "출결 (등원 / 수업)", value: arrived, total: withClass, href: hrefOf("오늘 출결") },
    { label: "결석", value: absent, href: hrefOf("오늘 출결"), alert: true },
    { label: `숙제 제출 (학생 ${todaySubStudents}명)`, value: todaySubs.length, href: hrefOf("숙제 관리") },
    { label: "보강", value: todayMakeups.length, href: "/admin/makeups" },
    { label: "선생님 출근", value: inTeachers.length, total: teachers.length, href: hrefOf("선생님 출퇴근") },
  ];

  return (
    // 상자 없이 여백·구역 라벨·1px 선으로 나눈다 (10/7, docs/design.md 1-1)
    // 순서 (10/8 UI 다듬기): 날짜 줄(작게) → 확인할 일(가장 큰 숫자) → 오늘 숫자 줄 → 바로가기 → 보강·메시지. 위 네 묶음 사이는 24px
    <div className="space-y-12">
      <section aria-labelledby="todo-title" className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-lead font-bold tracking-tight tabular">{formatDateKo(date)}</h1>
          <p className="text-caption text-sub tabular">{now} 기준</p>
        </div>

        {/* 확인할 일: 처리할 것만, 숫자가 있는 것만. 숫자는 화면에서 가장 크게 (32px) */}
        <div>
          <h2 id="todo-title" className="text-caption font-semibold text-sub">
            확인할 일 <span className="tabular">{todos.length}</span>
          </h2>
          {todos.length === 0 ? (
            <p className="mt-3 text-body text-sub">지금 처리할 일이 없어요.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
              {todos.map((t) => (
                <li key={t.title}>
                  <Link href={t.href} className="group press-card -mx-2 flex items-center gap-4 px-2 py-3.5 hover:bg-bg">
                    <span className="w-24 shrink-0 text-figure-lg leading-none font-bold whitespace-nowrap text-ink tabular">
                      {t.value}
                      <span className="ml-0.5 text-caption font-normal text-sub">{t.unit}</span>
                    </span>
                    <span className="min-w-0 flex-1 md:flex md:items-baseline md:gap-3">
                      <span className="block shrink-0 text-body font-semibold">{t.title}</span>
                      <span className="block truncate text-caption text-sub">{t.detail}</span>
                    </span>
                    <span className="flex shrink-0 items-center text-caption font-semibold text-ink group-hover:underline">
                      보기
                      <ChevronRight aria-hidden className="size-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 오늘 학원: 숫자 22px + 라벨 작게, 칸 사이 세로선. 0은 회색, 결석만 빨강. 휴대폰은 3칸 + 2칸 */}
        <div>
          <h2 className="sr-only">오늘 학원</h2>
          <ul className="grid grid-cols-3 border-y border-line-soft sm:grid-cols-5">
            {stats.map((st, i) => (
              <li
                key={st.label}
                className={cn("border-line-soft", i % 3 !== 0 && "border-l", i >= 3 && "border-t sm:border-t-0", "sm:border-l sm:first:border-l-0")}
              >
                {/* 줄의 첫 칸은 왼쪽 여백 없이 (날짜·라벨과 같은 선에 맞춘다): 휴대폰은 1·4번째, 넓은 화면은 1번째 */}
                <Link
                  href={st.href}
                  className={cn("press-card flex h-full flex-col gap-1 px-4 py-3.5 hover:bg-bg sm:px-5", i % 3 === 0 && "max-sm:pl-0", i === 0 && "sm:pl-0")}
                >
                  <span className={cn("text-figure-sm leading-none font-semibold tabular", st.value === 0 ? "text-sub" : st.alert ? "text-brand" : "text-ink")}>
                    {st.value}
                    {st.total !== undefined && <span className="text-caption font-normal text-sub"> / {st.total}</span>}
                  </span>
                  <span className="text-caption text-sub">{st.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 바로가기 (HOME-02): 상단 메뉴와 겹쳐 자주 쓰는 4개만, 테두리 있는 작은 알약 (10/8) */}
        <nav aria-label="바로가기" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-caption font-semibold text-sub">바로가기</span>
          {SHORTCUTS.map((m) => (
            <Link
              key={m.label}
              href={hrefOf(m.navLabel)}
              className="press inline-flex h-11 items-center rounded-full border border-line px-4 text-caption font-semibold text-ink hover:bg-bg md:h-9"
            >
              {m.label}
            </Link>
          ))}
        </nav>
      </section>

      {/* 오늘 보강 · 읽지 않은 메시지: 2단 목록, 행 사이 구분선만 */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-10">
        <section aria-labelledby="makeup-title">
          <ListHeader id="makeup-title" title="오늘 보강" count={todayMakeups.length} href="/admin/makeups" />
          {todayMakeups.length === 0 ? (
            <p className="mt-3 text-body text-sub">오늘 보강 일정이 없어요.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line-soft border-t border-line-soft">
              {todayMakeups.map((m) => {
                const s = studentById(m.studentId);
                const t = teacherById(m.teacherId);
                const end = addMinutes(m.start, m.durationMin);
                const state = m.status === "done" || end <= now ? "끝남" : m.start <= now ? "진행 중" : "예정";
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <span className="w-24 shrink-0 text-body tabular">
                      {m.start}~{end}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-body font-bold text-ink">{s?.name ?? "알 수 없음"}</span>
                      <span className="ml-2 text-caption text-sub">{[s?.school, s?.grade].filter(Boolean).join(" ")}</span>
                      <span className="block truncate text-caption text-sub">
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
        </section>

        <section aria-labelledby="unread-title">
          <ListHeader id="unread-title" title="읽지 않은 학부모 메시지" count={unreadList.length} href="/admin/messages" />
          {unreadList.length === 0 ? (
            <p className="mt-3 text-body text-sub">읽지 않은 메시지가 없어요.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line-soft border-t border-line-soft">
              {unreadList.slice(0, UNREAD_LIMIT).map((m) => {
                const s = studentById(m.studentId);
                const [day, time] = m.sentAt.split(" ");
                return (
                  <li key={m.id}>
                    {/* TODO: 해당 학생 대화방으로 바로 이동 */}
                    <Link href="/admin/messages" className="press-card -mx-2 flex items-start gap-3 px-2 py-3 hover:bg-bg">
                      <span className="w-20 shrink-0 pt-0.5 text-body text-sub tabular">
                        {day === date ? time : `${day.slice(5).replace("-", "/")} ${time}`}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-body font-bold text-ink">{s?.name ?? "알 수 없음"}</span>
                        <span className="ml-2 text-caption text-sub">{m.senderName}</span>
                        <span className="block truncate text-body">{m.body.split("\n")[0]}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {unreadList.length > UNREAD_LIMIT && (
                <li className="py-3 text-caption text-sub">
                  외 <span className="tabular">{unreadList.length - UNREAD_LIMIT}</span>건은 메시지 화면에서 확인
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** 목록 구역 머리: 작은 회색 라벨 + 개수, 오른쪽 "전체 보기" 텍스트 링크 */
function ListHeader({ id, title, count, href }: { id: string; title: string; count: number; href: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-caption font-semibold text-sub">
        {title} <span className="tabular">{count}</span>
      </h2>
      <Link href={href} className="-my-3 inline-flex min-h-11 items-center text-caption font-semibold text-ink hover:underline">
        전체 보기
      </Link>
    </div>
  );
}
