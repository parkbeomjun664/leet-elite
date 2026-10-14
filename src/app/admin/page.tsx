import type { Metadata } from "next";
import Link from "next/link";
import { ClassAvatar, TagChip } from "@/components/admin/class-avatar";
import { AutoRefresh, CountUp } from "@/components/admin/home-live";
import { loadAdminSummary, type SummaryMakeup } from "@/lib/admin/summary-data";
import { cn } from "@/lib/cn";
import { formatDateKo, nowTimeKST, todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "홈" };

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

/**
 * 원장님 홈 v5 (10/12 원장님 의견: "이전 화면이 더 한눈에 보인다", "시간표는 루틴이라 중요하지 않다")
 * 구성은 예전 홈 그대로: 오늘 학원 숫자 5칸 → 확인할 일 → 오늘·다음 보강 · 읽지 않은 학부모 메시지
 * 모양은 10/14 저녁 범준님 명세: 옅은 회색 바탕 + 흰 카드(모서리 20·안 24, 휴대폰 16·사이 16)
 *   큰 날짜 → 숫자 5칸 카드 → 확인할 일 KPI 4칸(0이면 회색, 빨강 없음) → 보강 · 학부모 메시지 2열(높이 같게, 각 5건)
 * 데이터는 src/lib/admin/summary-data.ts
 */

const UNREAD_LIMIT = 5;

const CARD = "rounded-[var(--radius-hcard)] border border-hairline bg-card p-4 sm:p-6";

// 숫자 칸 이름 앞 상태색 점(6px), 숫자는 결석만 빨강 (10/13 명세 그대로)
const STAT_DOT: Record<string, string> = {
  attendance: "bg-arrive",
  absent: "bg-danger",
  homework: "bg-live",
  makeup: "bg-class-4-fg",
  teachers: "bg-muted-soft",
};
// KPI 점 (10/14 범준님): 메시지 파랑 · 미출근 주황 · 피드백 주황 · 보강 빨강(점만, 숫자는 빨강 쓰지 않음)
const KPI_DOT: Record<string, string> = {
  unread: "bg-live",
  teachers: "bg-caution",
  feedback: "bg-caution",
  makeupNeeded: "bg-danger",
};

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  // 시연용: ?at=16:00 처럼 시각을 지정하면 그 시각 기준 (새로 고침도 멈춘다)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;
  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const { stats, kpis, todayMakeups, nextMakeups, messages } = loadAdminSummary(date, now);
  const dateLabel = formatDateKo(date);
  // 보강은 오늘 + 다음 합쳐 최대 5건, 메시지도 최대 5건 (10/14 범준님)
  const nextShown = nextMakeups.slice(0, Math.max(0, UNREAD_LIMIT - todayMakeups.length));
  const shownMessages = messages.slice(0, UNREAD_LIMIT);

  return (
    // data-tone="page": 바탕 canvas(옅은 회색) + 흰 카드 (app-chrome.tsx)
    <div data-tone="page" className="space-y-4">
      <AutoRefresh demo={demoTime !== null} />

      {/* 1. 날짜 + 기준 시각 */}
      <div className="flex items-baseline justify-between gap-3">
        <h1 id="home-title" className="text-title leading-none font-bold tracking-tight whitespace-nowrap tabular">
          <span className="max-sm:sr-only">{dateLabel.slice(0, dateLabel.indexOf("년") + 2)}</span>
          {dateLabel.slice(dateLabel.indexOf("년") + 2)}
        </h1>
        <span data-asof className="text-caption text-muted tabular">
          {now} 기준
        </span>
      </div>

      {/* 2. 오늘 학원 숫자 5칸 (흰 카드 안 한 줄) */}
      <ul aria-label="오늘 학원" className="grid grid-cols-5 overflow-hidden rounded-[var(--radius-hcard)] border border-hairline bg-card">
        {stats.map((st) => (
          <li key={st.key} data-stat={st.key}>
            <Link href={st.href} className="press flex h-full flex-col items-center justify-end gap-1 px-1 py-4 text-center hover:bg-block">
              <span className="tabular">
                <span data-value className={cn("text-figure-md font-bold tracking-tight", st.key === "absent" && st.value > 0 ? "text-danger-text" : "text-strong")}>
                  <CountUp value={st.value} />
                </span>
                {st.total !== undefined && <span className="ml-0.5 text-caption text-muted">/{st.total}</span>}
              </span>
              <span className="text-caption text-sub">
                {/* 점은 글자 앞에 붙여 이름이 두 줄이 돼도 같이 넘어가게 */}
                <span aria-hidden data-dot className={cn("mr-1 inline-block size-1.5 rounded-full align-middle", STAT_DOT[st.key])} />
                <span className="max-sm:hidden">{st.label}</span>
                <span className="sm:hidden">{st.label.replace(/\s*\(.*\)$/, "")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* 3. 확인할 일 = 가로 KPI 4칸 (10/14 범준님). 칸 전체가 링크, 0이면 회색, 빨강 없음. 1024 미만 2×2 */}
      <section aria-labelledby="check-title">
        <h2 id="check-title" className="sr-only">
          확인할 일
        </h2>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k, i) => (
            <li key={k.key} data-check={k.key}>
              <Link
                href={k.href}
                className={cn(
                  CARD,
                  "press flex h-full flex-col gap-1.5 transition-colors duration-[var(--duration-fast)] hover:bg-block",
                  // 첫 칸(읽지 않은 메시지)은 연한 파랑으로 강조 (그 칸 점 색과 같은 계열)
                  i === 0 && "border-transparent bg-class-1-bg hover:bg-class-1-bg hover:brightness-[0.98]",
                )}
              >
                <span className="text-caption text-base" data-label>
                  <span aria-hidden data-dot className={cn("mr-1.5 inline-block size-1.5 rounded-full align-middle", KPI_DOT[k.key])} />
                  {/* 휴대폰은 칸이 좁아 괄호 설명을 빼고, 길면 두 줄로 */}
                  <span className="max-sm:hidden">{k.title}</span>
                  <span className="sm:hidden">{k.title.replace(/\s*\(.*\)$/, "")}</span>
                </span>
                <span className="leading-none whitespace-nowrap tabular">
                  <span data-value className={cn("text-figure-md font-bold tracking-tight", k.value === 0 ? "text-muted-soft" : "text-strong")}>
                    <CountUp value={k.value} />
                  </span>
                  <span className="ml-0.5 text-caption text-muted">{k.unit}</span>
                </span>
                <span className="truncate text-micro text-muted">{k.value > 0 ? k.detail : "없어요"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. 아래 2열: 보강(오늘 + 다음) · 읽지 않은 학부모 메시지. 두 카드 높이 같게, 1024 미만 1열 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="makeup-title" className={CARD}>
          <ListHeader id="makeup-title" title="보강" href="/admin/makeups" />
          <h3 className="mt-3 text-caption font-semibold text-muted">오늘</h3>
          {todayMakeups.length === 0 ? (
            <p className="py-2 text-body text-muted">오늘 보강 일정이 없어요.</p>
          ) : (
            <ul>
              {todayMakeups.slice(0, UNREAD_LIMIT).map((m) => (
                <MakeupRow key={m.id} m={m} />
              ))}
            </ul>
          )}
          {nextShown.length > 0 && (
            <div className="mt-2 border-t border-line-soft pt-3">
              <h3 className="text-caption font-semibold text-muted">다음</h3>
              <ul>
                {nextShown.map((m) => (
                  <MakeupRow key={m.id} m={m} />
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="unread-title" className={CARD}>
          <ListHeader id="unread-title" title="읽지 않은 학부모 메시지" href="/admin/messages" />
          {messages.length === 0 ? (
            <p className="mt-3 text-body text-muted">읽지 않은 메시지가 없어요.</p>
          ) : (
            <ul className="mt-1">
              {shownMessages.map((m, i) => (
                <li key={m.id} data-message>
                  {/* 묶음이 바뀌는 곳에 작은 이름: 출결(결석·조퇴·지각) / 기타 */}
                  {(i === 0 || shownMessages[i - 1].group !== m.group) && (
                    <p data-group-label className={cn("text-caption font-semibold text-muted", i > 0 ? "mt-2 border-t border-line-soft pt-3" : "mt-2")}>
                      {m.group === "attendance" ? "출결" : "기타"}
                    </p>
                  )}
                  {/* TODO(11/24 메시지): 해당 학생 대화방으로 바로 이동 */}
                  <Link href="/admin/messages" className="press -mx-2 flex items-center gap-3 rounded-[var(--radius-block)] px-2 py-2.5 hover:bg-block">
                    <ClassAvatar {...m.avatar} />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="shrink-0 text-body font-semibold whitespace-nowrap text-strong">{m.title}</span>
                        {m.relation && <span className="min-w-0 truncate text-caption text-muted">· {m.relation}</span>}
                        <TagChip tag={m.tag} />
                        <span data-time className="ml-auto shrink-0 pl-2 text-caption text-muted tabular">
                          {m.time}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-caption text-muted">{m.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {messages.length > UNREAD_LIMIT && (
                <li className="pt-2">
                  <Link href="/admin/messages" className="text-caption font-semibold text-live-text hover:underline">
                    외 <span className="tabular">{messages.length - UNREAD_LIMIT}</span>건 더 보기
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** 보강 한 줄: 반 색 아바타 · 시각 · 학생(학교 학년) · 사유·선생님 · 오른쪽 상태 */
function MakeupRow({ m }: { m: SummaryMakeup }) {
  return (
    <li data-makeup className="flex items-center gap-3 py-3">
      <ClassAvatar {...m.avatar} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-body font-semibold whitespace-nowrap text-strong tabular">{m.time}</span>
          <span data-state className={cn("text-caption whitespace-nowrap tabular", m.live ? "font-semibold text-live-text" : "text-muted")}>
            {m.state}
          </span>
          <span className="text-body font-semibold text-strong">{m.studentName}</span>
          {m.studentInfo && <span className="text-caption text-muted">{m.studentInfo}</span>}
        </span>
        <span className="mt-0.5 block truncate text-caption text-muted">{m.detail}</span>
      </span>
    </li>
  );
}

/** 구역 머리: 제목, 오른쪽 "전체 보기" (제목 옆 개수는 없앰, 10/12 범준님) */
function ListHeader({ id, title, href }: { id: string; title: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-body font-bold text-strong">
        {title}
      </h2>
      <Link href={href} className="-my-3 inline-flex min-h-11 items-center text-caption font-semibold text-base hover:underline">
        전체 보기
      </Link>
    </div>
  );
}
