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
 * 모양은 v4 토스 스타일: 회색 바탕 + 흰 카드(모서리 20·안 24·사이 16), 카드 제목 20 굵게, 진한 글씨는 숫자·이름에만 (design.md 1-2)
 * 색은 학원 색(버건디) 숫자 + 빨강(결석·조퇴·지각)만 (10/13 범준님)
 * 데이터는 src/lib/admin/summary-data.ts
 */

const CARD = "rounded-[var(--radius-hcard)] border border-hairline bg-card p-6"; // 옅은 바탕(canvas) 위 경계는 1px 선 (10/14)
const UNREAD_LIMIT = 5;

// 10/13 범준님 명세: 숫자 칸·확인할 일 줄은 박스 없이 구분선만, 숫자 칸 라벨 앞 상태색 점(6px), 숫자는 결석만 빨강
// 확인할 일 숫자는 학원 색 버건디, 용건 태그는 결석·조퇴·지각 빨강 · 일정 파랑 · 문의 회색
const STAT_DOT: Record<string, string> = {
  attendance: "bg-arrive",
  absent: "bg-danger",
  homework: "bg-live",
  makeup: "bg-class-4-fg",
  teachers: "bg-muted-soft",
};
// 숫자 칸 사이 세로선 1px (page). 휴대폰 2칸·태블릿 3칸은 줄이 바뀌면 위에 가로선
const STAT_DIVIDER =
  "max-sm:[&:nth-child(even)]:border-l max-sm:[&:nth-child(n+3)]:border-t sm:max-lg:[&:not(:nth-child(3n+1))]:border-l sm:max-lg:[&:nth-child(n+4)]:border-t lg:[&:not(:first-child)]:border-l";

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  // 시연용: ?at=16:00 처럼 시각을 지정하면 그 시각 기준 (새로 고침도 멈춘다)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;
  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const { stats, checks, todayMakeups, nextMakeups, messages } = loadAdminSummary(date, now);

  return (
    // data-tone="page": 이 화면만 바탕을 토스 스타일 회색으로 (app-chrome.tsx)
    <div data-tone="page" className="space-y-4">
      <AutoRefresh demo={demoTime !== null} />

      {/* 1. 오늘 학원: 날짜 + 숫자 5칸 */}
      <section aria-labelledby="home-title" className={CARD}>
        <div className="flex items-baseline justify-between gap-3">
          <h1 id="home-title" className="text-body font-semibold text-base tabular">
            {formatDateKo(date).replace(/^\d+년 /, "")}
          </h1>
          <span data-asof className="text-micro text-muted tabular">
            {now} 기준
          </span>
        </div>
        <h2 className="sr-only">오늘 학원</h2>
        {/* 휴대폰 2칸(마지막 칸은 가로로 꽉), 태블릿 3칸, PC 5칸 */}
        <ul aria-label="오늘 학원" className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((st, i) => (
            <li key={st.key} data-stat={st.key} className={cn("border-page", STAT_DIVIDER, i === stats.length - 1 && "max-sm:col-span-2")}>
              <Link href={st.href} className="press-hcard flex h-full flex-col gap-1.5 px-4 py-3.5">
                <span className="flex items-center gap-1.5 text-caption text-muted">
                  <span aria-hidden data-dot className={cn("size-1.5 shrink-0 rounded-full", STAT_DOT[st.key])} />
                  {st.label}
                </span>
                <span className="tabular">
                  <span
                    data-value
                    className={cn(
                      "text-hero font-bold tracking-tight",
                      st.key === "absent" && st.value > 0 ? "text-danger-text" : "text-strong",
                    )}
                  >
                    <CountUp value={st.value} />
                  </span>
                  {st.total !== undefined && <span className="ml-1 text-body text-muted">/ {st.total}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. 확인할 일 (바로가기는 10/13 범준님: 없앰. 메뉴는 왼쪽 사이드바) */}
      <section aria-labelledby="check-title" className={CARD}>
        <h2 id="check-title" className="text-subhead font-bold tracking-tight text-strong">
          {/* 제목 옆 숫자는 없앰: 종류 수(1)가 줄의 건수(8건)와 헷갈려서 (10/12 범준님) */}
          확인할 일
        </h2>
        {checks.length === 0 ? (
          <p className="mt-3 text-body text-muted">지금 처리할 일이 없어요.</p>
        ) : (
          <ul className="mt-2 divide-y divide-page">
            {checks.map((c) => (
              <li key={c.key} data-check={c.key}>
                <Link
                  href={c.href}
                  className="group press-hcard flex items-center gap-3 py-4 md:gap-4"
                >
                  <span className="w-[72px] shrink-0 leading-none whitespace-nowrap tabular md:w-28">
                    <span className="text-figure-md font-bold text-brand">
                      <CountUp value={c.value} />
                    </span>
                    {c.total !== undefined && <span className="text-caption text-muted"> / {c.total}</span>}
                    <span className="ml-0.5 text-caption text-muted">{c.unit}</span>
                  </span>
                  <span className="min-w-0 flex-1 md:flex md:items-baseline md:gap-3">
                    <span className="block shrink-0 text-body font-semibold text-strong">{c.title}</span>
                    <span className="block truncate text-caption text-muted">{c.detail}</span>
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

      {/* 3. 오늘 보강 · 읽지 않은 학부모 메시지 (PC 2단은 두 카드 높이를 같게 — 10/12 범준님: 안정감, 휴대폰은 위아래) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-labelledby="makeup-title" className={CARD}>
          <ListHeader id="makeup-title" title="오늘 보강" href="/admin/makeups" />
          {todayMakeups.length === 0 ? (
            <p className="mt-3 text-body text-muted">오늘 보강 일정이 없어요.</p>
          ) : (
            <ul className="mt-3">
              {todayMakeups.map((m) => (
                <MakeupRow key={m.id} m={m} />
              ))}
            </ul>
          )}
          {nextMakeups.length > 0 && (
            <>
              <h3 className="mt-4 text-caption font-semibold text-muted">다음 보강</h3>
              <ul className="mt-1">
                {nextMakeups.map((m) => (
                  <MakeupRow key={m.id} m={m} />
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="unread-title" className={CARD}>
          <ListHeader id="unread-title" title="읽지 않은 학부모 메시지" href="/admin/messages" />
          {messages.length === 0 ? (
            <p className="mt-3 text-body text-muted">읽지 않은 메시지가 없어요.</p>
          ) : (
            <ul className="mt-3">
              {messages.slice(0, UNREAD_LIMIT).map((m) => (
                <li key={m.id} data-message>
                  {/* TODO(11/24 메시지): 해당 학생 대화방으로 바로 이동 */}
                  <Link href="/admin/messages" className="press-hcard -mx-2 flex items-center gap-3 rounded-[var(--radius-block)] px-2 py-3 hover:bg-block">
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

/** 카드 머리: 제목, 오른쪽 "전체 보기" (제목 옆 개수는 없앰, 10/12 범준님) */
function ListHeader({ id, title, href }: { id: string; title: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-subhead font-bold tracking-tight text-strong">
        {title}
      </h2>
      <Link href={href} className="-my-3 inline-flex min-h-11 items-center text-caption font-semibold text-base hover:underline">
        전체 보기
      </Link>
    </div>
  );
}
