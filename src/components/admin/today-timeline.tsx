"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { classTone } from "@/lib/admin/class-color";
import type { HomeStats } from "@/lib/admin/home-data";
import {
  blockState,
  dayPhase,
  durationKo,
  showProgress,
  summarize,
  untilLabel,
  type Block,
  type BlockState,
  type ClassBlock,
  type MakeupBlock,
} from "@/lib/admin/timeline";
import { cn } from "@/lib/cn";
import { nowTimeKST } from "@/lib/date";
import { useCountUp } from "@/lib/use-count-up";

// 원장 홈 요약 카드 + 오늘 시간표 (10/9 v2 → 10/12 v4, design.md 1-2)
// 회색 바탕 위 흰 카드(모서리 20, 안 24, 사이 16). 강조는 히어로 한 곳에만, 나머지는 본문·보조 회색
// 상태는 점·얇은 막대로만. 반마다 한 색(점), 처리할 일 아바타와 같은 색
// 1분마다 지금 시각을 다시 재고(히어로 남은 시간·블록 상태·지금 선) 화면 데이터도 새로 불러온다. 시연 시각(?at=)이면 멈춰 둔다

/** 지금 시각 (1분마다). 화면 데이터도 1분마다 새로 불러온다(등원 숫자). 시연 시각이면 멈춘다 */
export function useClock(initialNow: string, demo: boolean) {
  const router = useRouter();
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    if (demo) return;
    const t = setInterval(() => {
      setNow(nowTimeKST());
      router.refresh();
    }, 60_000);
    return () => clearInterval(t);
  }, [demo, router]);
  return now;
}

/** 상태 점 8px */
export function Dot({ className }: { className: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", className)} />;
}

/** 등원만 채우는 진행 막대 (결석은 넣지 않는다) */
function ArrivalBar({ arrived, total, className }: { arrived: number; total: number; className?: string }) {
  return (
    <span aria-hidden className={cn("block overflow-hidden rounded-full bg-page", className)}>
      <span
        data-arrival-fill
        className="block h-full rounded-full bg-arrive transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
        style={{ width: `${total ? (arrived / total) * 100 : 0}%` }}
      />
    </span>
  );
}

const range = (b: { start: string; end: string }) => `${b.start}–${b.end}`;

/** 요약 카드: 날짜 → 히어로(첫 수업 전 / 수업 중 / 끝) → 범례 → 상태 문장 · 오른쪽 오늘 숫자 3개 + (수업 중) 등원 막대 */
export function DaySummary({ dateLabel, blocks, now, stats }: { dateLabel: string; blocks: Block[]; now: string; stats: HomeStats }) {
  const s = summarize(blocks, now);
  const p = dayPhase(blocks, now);
  const upcoming = Math.max(0, s.total - s.arrived - s.notArrived - s.absent);
  const arrived = useCountUp(s.arrived);
  const classCount = useCountUp(stats.classCount);
  const studentCount = useCountUp(stats.studentCount);
  const makeupCount = useCountUp(stats.makeupCount);

  const heroText = (n: number) =>
    p.phase === "before" ? `첫 수업까지 ${durationKo(p.minutesToFirst)}` : p.phase === "during" ? `등원 ${n}/${s.total}` : p.phase === "after" ? "오늘 수업 끝" : "오늘은 수업이 없어요";
  const heroSub =
    p.phase === "before"
      ? [`${p.first.start} ${p.first.className}`, p.first.teacherName, `${p.first.total}명`].filter(Boolean).join(" · ")
      : p.phase === "after"
        ? `등원 ${s.arrived}/${s.total} · 결석 ${s.absent}`
        : null;
  // 상태 문장 (맨 아래, 보조 회색). 수업 중일 때만 파랑 점
  const status =
    p.phase === "during"
      ? p.live.length > 0
        ? `${p.live.map((b) => b.className).join(" · ")} 수업 중`
        : p.next
          ? `쉬는 시간 · 다음 수업 ${p.next.start} ${p.next.className}`
          : "보강 진행 중"
      : p.phase === "before"
        ? "아직 시작한 수업이 없어요"
        : p.phase === "after"
          ? `마지막 수업이 ${p.lastEnd}에 끝났어요`
          : null;
  const liveNow = p.phase === "during" && p.live.length > 0;

  return (
    <header data-phase={p.phase} className="rounded-[var(--radius-hcard)] bg-card p-6">
      {/* 화면 읽기 프로그램용 한 문장 (숫자가 세어 올라가는 중간값은 읽지 않게) */}
      <p className="sr-only" aria-live="polite">
        {[heroText(s.arrived), heroSub, status].filter(Boolean).join(". ")}
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <h1 id="home-title" className="text-body font-semibold text-base tabular">
          {dateLabel}
        </h1>
        <span data-asof className="text-micro text-muted tabular">
          {now} 기준
        </span>
      </div>

      <div className="mt-3 lg:flex lg:items-end lg:justify-between lg:gap-12" aria-hidden>
        <div className="min-w-0">
          {/* 히어로: 이 화면에서 가장 먼저 볼 한 줄 */}
          <p data-hero className="text-hero font-bold tracking-tight text-strong tabular">
            {p.phase === "before" ? (
              // 좁은 화면에서 "3시간 / 48분"으로 꺾이지 않게 남은 시간은 한 덩어리
              <>
                첫 수업까지 <span className="whitespace-nowrap">{durationKo(p.minutesToFirst)}</span>
              </>
            ) : (
              heroText(arrived)
            )}
          </p>
          {heroSub && (
            <p data-hero-sub className="mt-1 text-body text-base tabular">
              {heroSub}
            </p>
          )}
          {/* 범례: 등원 · 미등원 · 결석 · 수업 전 (네 숫자의 합 = 오늘 수업 학생 수) */}
          {s.total > 0 && (
            <ul data-legend className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-note text-base tabular">
              <li className="flex items-center gap-1.5">
                <Dot className="bg-arrive" />
                등원 <span data-n>{s.arrived}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Dot className="bg-caution" />
                미등원 <span data-n>{s.notArrived}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Dot className="bg-danger" />
                결석 <span data-n>{s.absent}</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Dot className="bg-card ring-[1.5px] ring-dim ring-inset" />
                수업 전 <span data-n>{upcoming}</span>
              </li>
            </ul>
          )}
          {status && (
            <p data-status className="mt-3 flex items-center gap-1.5 text-note text-muted">
              {liveNow && <Dot className="bg-live" />}
              {status}
            </p>
          )}
        </div>

        {/* 오른쪽: 오늘 숫자 3개 + 수업 중에만 등원 막대 */}
        <div className="mt-5 lg:mt-0 lg:w-[340px] lg:shrink-0">
          <dl className="grid grid-cols-3 gap-4">
            {(
              [
                ["오늘 수업", classCount, "반"],
                ["학생", studentCount, "명"],
                ["보강", makeupCount, "건"],
              ] as const
            ).map(([label, n, unit]) => (
              <div key={label}>
                <dt className="text-caption text-muted">{label}</dt>
                <dd data-stat={label} className="mt-0.5 text-stat font-bold text-strong tabular">
                  {n}
                  <span className="ml-0.5 text-body font-semibold">{unit}</span>
                </dd>
              </div>
            ))}
          </dl>
          {p.phase === "during" && (
            <div data-day-progress className="mt-4">
              <ArrivalBar arrived={s.arrived} total={s.total} className="h-1.5" />
              <p className="mt-1.5 text-caption text-muted tabular">등원 {s.total ? Math.round((s.arrived / s.total) * 100) : 0}%</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/** 오늘 시간표 카드. 반이 많아지면 카드 안에서만 스크롤 (1024 이상) */
export function TimelineCard({ blocks, now }: { blocks: Block[]; now: string }) {
  // 지금 선 자리: 아직 시작하지 않은 첫 블록 바로 앞
  const nowIndex = (() => {
    const i = blocks.findIndex((b) => b.start > now);
    return i < 0 ? blocks.length : i;
  })();
  return (
    <section aria-labelledby="timeline-list-title" className="rounded-[var(--radius-hcard)] bg-card p-6">
      <h2 id="timeline-list-title" className="text-subhead font-semibold text-strong">
        오늘 시간표
      </h2>
      {blocks.length === 0 ? (
        <p className="mt-3 text-body text-muted">오늘은 수업이 없어요.</p>
      ) : (
        <ol
          aria-label="오늘 시간표"
          className="-mx-1 mt-4 space-y-2 px-1 lg:max-h-[calc(100dvh-340px)] lg:min-h-[320px] lg:overflow-y-auto lg:[scrollbar-gutter:stable]"
        >
          {blocks.map((b, i) => (
            <Fragment key={b.id}>
              {i === nowIndex && <NowLine now={now} />}
              {b.kind === "class" ? <ClassRow b={b} state={blockState(b, now)} now={now} /> : <MakeupRow b={b} state={blockState(b, now)} />}
            </Fragment>
          ))}
          {nowIndex === blocks.length && <NowLine now={now} />}
        </ol>
      )}
    </section>
  );
}

/** 지금 시각: 파랑 점 + 선, 블록 사이 지금 자리 */
function NowLine({ now }: { now: string }) {
  return (
    <li aria-label={`지금 ${now}`} className="flex items-center gap-2 px-4">
      <span className="shrink-0 text-caption font-bold text-live-text tabular">{now}</span>
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-live" />
      <span aria-hidden className="h-px flex-1 bg-live" />
    </li>
  );
}

const STATE_LABEL: Record<BlockState, string> = { "수업 중": "진행 중", 끝남: "끝남", 예정: "" };

/**
 * 반 블록. 1024 이상 5칸: 시간 120 · 반(1fr) · 인원 120 · 늦게 오는 학생(1.2fr) · 상태 90
 * 1024 미만: 윗줄 시간·상태 / 가운데 반 / 아랫줄 인원·늦게 오는 학생 (왼쪽 칸은 내용 폭, 오른쪽 칸은 남은 폭 + 오른쪽 정렬)
 */
function ClassRow({ b, state, now }: { b: ClassBlock; state: BlockState; now: string }) {
  const done = state === "끝남";
  const live = state === "수업 중";
  const tone = classTone(b.sortOrder);
  const progress = showProgress(b, now);
  const label = state === "예정" ? untilLabel(b.start, now) : STATE_LABEL[state];
  return (
    <li>
      <Link
        href={`/teacher?class=${b.classId}`}
        data-state={state}
        className={cn(
          "press-hcard grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 rounded-[var(--radius-block)] px-4 py-3.5 [grid-template-areas:'time_status'_'name_name'_'count_late']",
          "lg:grid-cols-[120px_minmax(0,1fr)_120px_minmax(0,1.2fr)_90px] lg:[grid-template-areas:'time_name_count_late_status']",
          live ? "bg-live-tint" : "bg-block",
        )}
      >
        {/* 1) 시간 */}
        <span data-start={b.start} className={cn("text-body font-semibold tabular [grid-area:time]", done ? "text-muted" : "text-strong")}>
          {range(b)}
        </span>
        {/* 2) 반 색 점 + 반 이름, 아래 선생님 */}
        <span className="min-w-0 [grid-area:name]">
          <span className="flex items-center gap-2">
            <span aria-hidden data-class-dot className={cn("size-2 shrink-0 rounded-full", tone.dot, done && "opacity-50")} />
            <span className={cn("truncate text-subhead font-semibold", done ? "text-muted" : "text-strong")}>{b.className}</span>
          </span>
          {b.teacherName && <span className="mt-0.5 block pl-4 text-caption text-muted">{b.teacherName}</span>}
        </span>
        {/* 3) 인원 + 결석, 시작 10분 전부터 등원 막대 */}
        <span className="min-w-0 [grid-area:count]">
          <span className="flex flex-wrap items-baseline gap-x-2 tabular">
            <span className={cn("text-body font-semibold", done ? "text-muted" : "text-strong")}>{b.total}명</span>
            {b.absent > 0 && <span className="text-caption font-semibold text-danger-text">결석 {b.absent}</span>}
            {live && b.notArrived > 0 && (
              <span className="flex items-center gap-1 text-caption font-semibold text-base">
                <Dot className="bg-caution" />
                미등원 {b.notArrived}
              </span>
            )}
          </span>
          {progress && (
            <span data-progress className="mt-1.5 block w-full max-w-[104px]" role="img" aria-label={`등원 ${b.arrived}명 / ${b.total}명`}>
              <ArrivalBar arrived={b.arrived} total={b.total} className={cn("h-1", done && "opacity-50")} />
            </span>
          )}
        </span>
        {/* 4) 늦게 오는 학생 */}
        <span className={cn("min-w-0 text-right text-caption tabular [grid-area:late] lg:text-left", done ? "text-muted" : "text-base")}>
          {b.lateStarts.map((l) => `${l.start} ${l.count}명`).join(" · ")}
        </span>
        {/* 5) 상태 */}
        <span data-status-label className={cn("text-right text-note tabular [grid-area:status]", live ? "font-semibold text-live-text" : "text-muted")}>
          {label}
        </span>
      </Link>
    </li>
  );
}

/** 보강: 바탕 없는 작은 줄, 같은 시간 반 블록 바로 아래 (시간순 정렬이 그 자리에 둔다) */
function MakeupRow({ b, state }: { b: MakeupBlock; state: BlockState }) {
  const done = state === "끝남";
  return (
    <li>
      <Link
        href="/admin/makeups"
        data-makeup
        className={cn(
          "press-hcard flex items-center gap-x-4 rounded-[var(--radius-block)] px-4 py-1.5 text-caption hover:bg-block lg:grid lg:grid-cols-[120px_minmax(0,1fr)]",
          done ? "text-muted" : "text-base",
        )}
      >
        <span className="shrink-0 text-muted tabular">{range(b)}</span>
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className={cn("size-2 shrink-0 rotate-45 border-[1.5px]", done ? "border-dim" : "border-muted")} />
          <span className="truncate">{["보강", b.studentName, b.reason, b.teacherName].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
    </li>
  );
}
