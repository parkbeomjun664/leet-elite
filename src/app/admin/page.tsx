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
import { diffLabel } from "@/lib/diff-label";
import { ScrollRow } from "@/components/ui/scroll-row";
import { StatFigure } from "@/components/ui/stat-figure";

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
  /** 어제 같은 시각 숫자. 없으면 비교를 보여 주지 않는다 */
  prev?: number;
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

/**
 * 그날 그 시각까지의 학원 숫자 (가상 데이터). 오늘 숫자와 "어제 같은 시각" 숫자를 같은 방법으로 센다 (10/9 어제 대비)
 * 저녁에 낼 제출·출결은 그 시각까지 일어난 것만 센다
 */
function dayNumbers(day: string, time: string) {
  const records = mockAttendanceFor(day, time);
  const key = `${day} ${time}`;
  const enrolled = students.filter((s) => s.status === "enrolled");
  const days = enrolled.map((s) => studentDay(s, records, day, time));
  const subs = submissions.filter((s) => s.submittedAt.startsWith(day) && s.submittedAt <= key);
  const workLogs = workLogsFor(day, time);
  return {
    days,
    // 오늘 수업이 있는 학생 수, 등원한 학생 수(하원 포함)
    withClass: days.filter((d) => d.slot !== null).length,
    arrived: days.filter((d) => d.status === "checked_in" || d.status === "checked_out").length,
    absent: days.filter((d) => d.status === "absent").length,
    subs,
    makeups: makeups.filter((m) => m.date === day && m.status !== "cancelled").sort((a, b) => a.start.localeCompare(b.start)),
    inTeachers: teachers.filter((t) => workLogs.some((w) => w.teacherId === t.id && w.checkInAt !== null)),
  };
}

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  // 시연용: /admin?at=16:00 처럼 시각을 지정하면 그 시각 기준으로 보여 준다 (가상 데이터 단계에서만)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;

  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  // 지금(또는 시연 시각)보다 뒤에 낸 제출은 아직 없는 것으로 본다 (가상 데이터가 저녁 제출을 미리 만들어 둠)
  const nowKey = `${date} ${now}`;
  const today = dayNumbers(date, now);
  // 어제 같은 시각. 어제가 수업 없는 날(일요일 등)이면 비교가 뜻이 없으니 보여 주지 않는다
  const y = dayNumbers(addDays(date, -1), now);
  const yesterday = y.withClass > 0 ? y : null;

  // 현황 계산
  const unread = unreadCount();
  const unreadList = messages
    .filter((m) => (m.from === "parent" || m.from === "student") && !m.read)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const todaySubs = today.subs;
  const todaySubStudents = new Set(todaySubs.map((s) => s.studentId)).size;
  const todayMakeups = today.makeups;
  const enrolled = students.filter((s) => s.status === "enrolled");
  const notArrived = today.days.filter((d) => d.status === "not_arrived");

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
  const inTeachers = today.inTeachers;
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
  // prev = 어제 같은 시각 숫자 (어제보다 +1 / -2 / 어제와 같음). 보강은 날마다 달라 비교하지 않는다
  const stats: Stat[] = [
    { label: "출결 (등원 / 수업)", value: today.arrived, total: today.withClass, prev: yesterday?.arrived, href: hrefOf("오늘 출결") },
    { label: "결석", value: today.absent, prev: yesterday?.absent, href: hrefOf("오늘 출결"), alert: true },
    { label: `숙제 제출 (학생 ${todaySubStudents}명)`, value: todaySubs.length, prev: yesterday?.subs.length, href: hrefOf("숙제 관리") },
    { label: "보강", value: todayMakeups.length, href: "/admin/makeups" },
    { label: "선생님 출근", value: inTeachers.length, total: teachers.length, prev: yesterday?.inTeachers.length, href: hrefOf("선생님 출퇴근") },
  ];

  return (
    // 상자 없이 구역 라벨 + 여백으로만 나눈다 (10/7, docs/design.md 1-1)
    // 순서 (10/9 화면별 참고 패턴, 요약 숫자 먼저): 날짜 줄 → 오늘 학원 숫자 줄(28px) → 확인할 일 → 바로가기 → 보강·메시지
    <div className="space-y-12">
      <div className="space-y-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-lead font-bold tracking-tight tabular">{formatDateKo(date)}</h1>
          <p className="text-caption text-sub tabular">{now} 기준</p>
        </div>

        {/* 오늘 학원: 숫자 크게(28px) + 라벨 작게(13px 회색) 위아래, 항목 사이 넓은 간격, 선·상자 없음. 0은 회색, 결석만 빨강 */}
        {/* 숫자는 새로 불러와 바뀌면 굴러간다(StatFigure). 아래에 어제 같은 시각과 비교 한 줄 */}
        <section aria-labelledby="today-title">
          <h2 id="today-title" className="text-caption font-semibold text-sub">
            오늘 학원
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-5 sm:gap-x-10">
            {stats.map((st, i) => {
              const diff = diffLabel(st.value, st.prev);
              return (
                <li key={st.label} className={cn(i === stats.length - 1 && i % 2 === 0 && "max-sm:col-span-2")}>
                  <Link href={st.href} className="press-card -mx-2 flex flex-col gap-1 rounded-[var(--radius-control)] px-2 py-1.5 hover:bg-bg">
                    <span className="leading-none">
                      <StatFigure
                        value={st.value}
                        className={cn("text-figure-md font-bold", st.value === 0 ? "text-sub" : st.alert ? "text-brand" : "text-ink")}
                      />
                      {st.total !== undefined && <span className="text-caption text-sub tabular"> / {st.total}</span>}
                    </span>
                    <span className="text-caption text-sub">{st.label}</span>
                    {diff && <span className="text-caption text-sub tabular">{diff}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 확인할 일: 처리할 것만, 숫자가 있는 것만 */}
        <section aria-labelledby="todo-title">
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
                    <span className="w-24 shrink-0 text-figure-md leading-none font-bold whitespace-nowrap text-ink tabular">
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
        </section>

        {/* 바로가기 (HOME-02): 상단 메뉴와 겹쳐 자주 쓰는 4개만, 테두리 있는 작은 알약 (10/8). 좁은 화면은 한 줄로 밀어 본다 */}
        <nav aria-label="바로가기">
          <ScrollRow>
            <div className="flex w-max items-center gap-2">
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
            </div>
          </ScrollRow>
        </nav>
      </div>

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
