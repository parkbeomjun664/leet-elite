import { ChevronRight } from "lucide-react";
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
 * 모양은 10/14 범준님: 선생님 홈과 같은 짜임(큰 날짜 → 선 사이 숫자 5칸 → 왼쪽 회색 면 확인할 일 / 오른쪽 보강·메시지), 카드 없음
 * 색은 학원 색(버건디) 숫자 + 빨강(결석·조퇴·지각)만 (10/13 범준님)
 * 데이터는 src/lib/admin/summary-data.ts
 */

const UNREAD_LIMIT = 5;

// 10/14 범준님: 선생님 홈과 같은 짜임으로 (내용은 그대로). 카드 없이 흰 바탕 + 선, 아래는 왼쪽 회색 면(확인할 일) / 오른쪽 흰 면(보강·메시지)
// 숫자 칸 이름 앞 상태색 점(6px), 숫자는 결석만 빨강 (10/13 명세 그대로). 확인할 일 숫자는 학원 색 버건디
const STAT_DOT: Record<string, string> = {
  attendance: "bg-arrive",
  absent: "bg-danger",
  homework: "bg-live",
  makeup: "bg-class-4-fg",
  teachers: "bg-muted-soft",
};

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  // 시연용: ?at=16:00 처럼 시각을 지정하면 그 시각 기준 (새로 고침도 멈춘다)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;
  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const { stats, checks, todayMakeups, nextMakeups, messages } = loadAdminSummary(date, now);
  const dateLabel = formatDateKo(date);

  return (
    <div className="space-y-5">
      <AutoRefresh demo={demoTime !== null} />

      {/* 1. 날짜 (선생님 홈과 같은 큰 제목, 휴대폰은 연도를 숨겨 한 줄) + 기준 시각 */}
      <div className="flex items-baseline justify-between gap-3">
        <h1 id="home-title" className="text-title leading-none font-bold tracking-tight whitespace-nowrap tabular">
          <span className="max-sm:sr-only">{dateLabel.slice(0, dateLabel.indexOf("년") + 2)}</span>
          {dateLabel.slice(dateLabel.indexOf("년") + 2)}
        </h1>
        <span data-asof className="text-caption text-muted tabular">
          {now} 기준
        </span>
      </div>

      {/* 2. 오늘 학원 숫자 5칸: 위아래 선 사이 큰 숫자 + 이름 (누르면 그 화면) */}
      <ul aria-label="오늘 학원" className="grid grid-cols-5 border-y border-line-soft">
        {stats.map((st) => (
          <li key={st.key} data-stat={st.key}>
            <Link href={st.href} className="press flex h-full flex-col items-center justify-end gap-1 px-1 py-3 text-center hover:bg-bg/60">
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
                {/* 휴대폰은 칸이 좁아 괄호 설명을 뺀 짧은 이름 */}
                <span className="sm:hidden">{st.label.replace(/\s*\(.*\)$/, "")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* 3. 아래: 왼쪽 확인할 일(회색 면) / 오른쪽 오늘 보강 · 학부모 메시지(흰 면). 1024 미만은 위아래 */}
      <div className="lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:border-y lg:border-line-soft">
        <section aria-labelledby="check-title" className="-mx-4 bg-bg px-4 py-4 lg:mx-0 lg:border-r lg:border-line-soft lg:px-0">
          <h2 id="check-title" className="mb-1 text-body font-bold text-strong lg:px-5">
            {/* 제목 옆 숫자는 없앰: 종류 수(1)가 줄의 건수(8건)와 헷갈려서 (10/12 범준님) */}
            확인할 일
          </h2>
          {checks.length === 0 ? (
            <p className="py-3 text-body text-muted lg:px-5">지금 처리할 일이 없어요.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {checks.map((c) => (
                <li key={c.key} data-check={c.key}>
                  <Link href={c.href} className="group press flex items-center gap-3 py-3.5 hover:bg-line-soft/50 lg:px-5">
                    <span className="w-[72px] shrink-0 leading-none whitespace-nowrap tabular">
                      <span className="text-figure-md font-bold text-brand">
                        <CountUp value={c.value} />
                      </span>
                      {c.total !== undefined && <span className="text-caption text-muted"> / {c.total}</span>}
                      <span className="ml-0.5 text-caption text-muted">{c.unit}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold text-strong">{c.title}</span>
                      <span className="mt-0.5 block truncate text-caption text-muted">{c.detail}</span>
                    </span>
                    <span className="flex shrink-0 items-center text-caption font-semibold text-base group-hover:underline">
                      보기
                      <ChevronRight aria-hidden className="size-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="divide-y divide-line-soft">
          <section aria-labelledby="makeup-title" className="py-4 lg:px-6">
            <ListHeader id="makeup-title" title="오늘 보강" href="/admin/makeups" />
            {todayMakeups.length === 0 ? (
              <p className="mt-2 text-body text-muted">오늘 보강 일정이 없어요.</p>
            ) : (
              <ul className="mt-1">
                {todayMakeups.map((m) => (
                  <MakeupRow key={m.id} m={m} />
                ))}
              </ul>
            )}
            {nextMakeups.length > 0 && (
              <>
                <h3 className="mt-3 text-caption font-semibold text-muted">다음 보강</h3>
                <ul className="mt-1">
                  {nextMakeups.map((m) => (
                    <MakeupRow key={m.id} m={m} />
                  ))}
                </ul>
              </>
            )}
          </section>

          <section aria-labelledby="unread-title" className="py-4 lg:px-6">
            <ListHeader id="unread-title" title="읽지 않은 학부모 메시지" href="/admin/messages" />
            {messages.length === 0 ? (
              <p className="mt-2 text-body text-muted">읽지 않은 메시지가 없어요.</p>
            ) : (
              <ul className="mt-1">
                {messages.slice(0, UNREAD_LIMIT).map((m) => (
                  <li key={m.id} data-message>
                    {/* TODO(11/24 메시지): 해당 학생 대화방으로 바로 이동 */}
                    <Link href="/admin/messages" className="press -mx-2 flex items-center gap-3 rounded-[var(--radius-block)] px-2 py-2.5 hover:bg-block">
                      <ClassAvatar {...m.avatar} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
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
                  <li className="pt-2 text-caption text-muted">
                    외 <span className="tabular">{messages.length - UNREAD_LIMIT}</span>건은 메시지 화면에서 확인
                  </li>
                )}
              </ul>
            )}
          </section>
        </div>
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
