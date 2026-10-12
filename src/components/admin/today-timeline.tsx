"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { AttendanceBar, upcomingOf } from "@/components/admin/attendance-bar";
import { blockState, summarize, type Block, type BlockState } from "@/lib/admin/timeline";
import { cn } from "@/lib/cn";
import { nowTimeKST } from "@/lib/date";
import { useCountUp } from "@/lib/use-count-up";

// 원장 홈 "오늘 시간표" (10/9 v2 → 10/12 v3 토스 스타일, design.md 1-2)
// 회색 바탕 위 흰 카드(모서리 20, 안 여백 24, 카드 사이 16). 상태는 8px 점·6px 막대로만, 바탕을 칠하지 않는다
// 진한 글씨는 지금 봐야 할 것(히어로 숫자·반 이름·시각)에만, 나머지는 muted
// 1분마다 지금 시각을 다시 재고(상태·가로선) 화면 데이터도 새로 불러온다(등원 숫자). 시연 시각(?at=)이면 멈춰 둔다

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

/** 요약 카드: 날짜 · 지금 수업 중 · 히어로 "등원 x/y" · 미등원·결석·수업 전 · 등원 막대. PC·휴대폰 같이 쓴다 */
export function DaySummary({ dateLabel, blocks, now, titleId }: { dateLabel: string; blocks: Block[]; now: string; titleId?: string }) {
  const s = summarize(blocks, now);
  const arrived = useCountUp(s.arrived);
  const counts = { arrived: s.arrived, notArrived: s.notArrived, absent: s.absent, total: s.total };
  const sentence = `${s.inClass > 0 ? `지금 ${s.inClass}개 반 수업 중` : "지금 수업 중인 반은 없어요"} · 등원 ${s.arrived}/${s.total} · 결석 ${s.absent}`;
  return (
    <header className="rounded-[var(--radius-hcard)] bg-card p-6">
      {/* 화면 읽기 프로그램용 한 문장 (숫자가 세어 올라가는 중간값은 읽지 않게) */}
      <p className="sr-only" aria-live="polite">
        {sentence}
      </p>
      <div className="flex items-baseline justify-between gap-3 lg:justify-start">
        <h1 id={titleId} className="text-subhead font-semibold text-strong tabular">
          {dateLabel}
        </h1>
        <span className="text-caption text-muted tabular">{now} 기준</span>
      </div>
      <div className="mt-4 lg:flex lg:items-end lg:justify-between lg:gap-12" aria-hidden>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-body font-semibold text-strong">
            <Dot className={s.inClass > 0 ? "bg-live" : "bg-muted-soft"} />
            {s.inClass > 0 ? `지금 ${s.inClass}개 반 수업 중` : "지금 수업 중인 반은 없어요"}
          </p>
          {/* 히어로 숫자: 이 화면에서 가장 먼저 볼 것 */}
          <p data-hero className="mt-1 text-hero font-bold tracking-tight text-strong tabular">
            등원 {arrived}/{s.total}
          </p>
          {/* 나머지 숫자: 15px 보조 회색, 순서 등원 → 미등원 → 결석 → 수업 전 */}
          <ul data-summary-rest className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body text-muted tabular">
            <li className="flex items-center gap-1.5">
              <Dot className="bg-caution" />
              미등원 {s.notArrived}
            </li>
            <li className="flex items-center gap-1.5">
              <Dot className="bg-danger" />
              결석 {s.absent}
            </li>
            <li className="flex items-center gap-1.5">
              <Dot className="bg-page ring-1 ring-muted-soft ring-inset" />
              수업 전 {upcomingOf(counts)}
            </li>
          </ul>
        </div>
        <div className="mt-5 lg:mt-0 lg:w-[400px] lg:shrink-0">
          <AttendanceBar counts={counts} />
          <p className="mt-2 text-caption text-muted tabular">
            등원 {s.total ? Math.round((s.arrived / s.total) * 100) : 0}%
          </p>
        </div>
      </div>
    </header>
  );
}

export function TodayTimeline({
  dateLabel,
  blocks,
  initialNow,
  demo,
  aside,
}: {
  dateLabel: string; // "10월 9일 (금)"
  blocks: Block[]; // 시간순
  initialNow: string; // "HH:MM"
  demo: boolean; // 시연 시각이면 시계를 멈춘다
  aside?: ReactNode; // 오른쪽 카드 (처리할 일)
}) {
  const now = useClock(initialNow, demo);
  // 지금 가로선 자리: 아직 시작하지 않은 첫 블록 바로 앞
  const nowIndex = (() => {
    const i = blocks.findIndex((b) => b.start > now);
    return i < 0 ? blocks.length : i;
  })();

  return (
    <div className="space-y-4">
      <DaySummary dateLabel={dateLabel} blocks={blocks} now={now} titleId="timeline-title" />
      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-4">
        <section aria-labelledby="timeline-list-title" className="rounded-[var(--radius-hcard)] bg-card p-6">
          <h2 id="timeline-list-title" className="text-subhead font-semibold text-strong">
            오늘 시간표
          </h2>
          {blocks.length === 0 ? (
            <p className="mt-3 text-body text-muted">오늘은 수업이 없어요.</p>
          ) : (
            <ol aria-label="오늘 시간표" className="relative mt-2">
              {/* 세로선 (점 칸 가운데) */}
              <span aria-hidden className="absolute top-4 bottom-4 left-[83.5px] w-px bg-page" />
              {blocks.map((b, i) => (
                <Fragment key={b.id}>
                  {i === nowIndex && <NowLine now={now} />}
                  <BlockRow b={b} state={blockState(b, now)} />
                </Fragment>
              ))}
              {nowIndex === blocks.length && <NowLine now={now} />}
            </ol>
          )}
        </section>
        {aside}
      </div>
    </div>
  );
}

/** 지금 시각: 파랑 점 + 선 (시작한 블록과 아직인 블록 사이) */
function NowLine({ now }: { now: string }) {
  return (
    <li aria-label={`지금 ${now}`} className="relative flex items-center gap-3 py-1 pl-4">
      <span className="w-[52px] shrink-0 text-right text-caption font-bold text-strong tabular">{now}</span>
      <span aria-hidden className="relative z-[1] size-2 shrink-0 rounded-full bg-live ring-4 ring-card" />
      <span aria-hidden className="h-px flex-1 bg-live" />
    </li>
  );
}

/** 블록 한 줄: 시각 · 점(반 ● / 보강 ◇) · 내용 · 상태. 진행 중이면 왼쪽 파랑 4px 막대, 끝났으면 글씨를 흐리게 */
function BlockRow({ b, state }: { b: Block; state: BlockState }) {
  const done = state === "끝남";
  const live = state === "수업 중";
  const marker =
    b.kind === "makeup" ? (
      // 보강은 마름모
      <span aria-hidden className={cn("relative z-[1] mt-2 size-2 shrink-0 rotate-45 ring-4 ring-card", done ? "bg-muted-soft" : "border-[1.5px] border-strong bg-card")} />
    ) : (
      <span
        aria-hidden
        className={cn(
          "relative z-[1] mt-2 size-2 shrink-0 rounded-full ring-4 ring-card",
          live ? "bg-live" : done ? "bg-muted-soft" : "border-[1.5px] border-muted-soft bg-card",
        )}
      />
    );

  const body =
    b.kind === "class" ? (
      <>
        <span className="flex items-baseline gap-2">
          <span className={cn("truncate text-subhead font-semibold", done ? "text-muted" : "text-strong")}>{b.className}</span>
          {b.teacherName && <span className="truncate text-caption text-muted">{b.teacherName}</span>}
        </span>
        {/* 등원 막대(등원만 채움) + 숫자 + 늦게 시작 */}
        <span className="mt-1.5 flex items-center gap-2.5">
          <AttendanceBar counts={b} className={cn("w-28 shrink-0", done && "opacity-50")} />
          <span className="min-w-0 truncate text-caption text-muted tabular">
            등원 {b.arrived}/{b.total}
            {b.absent > 0 && <> · 결석 {b.absent}</>}
            {/* 늦게 시작하는 학생 (같은 반은 한 블록, 10/9) */}
            {b.lateStarts.length > 0 && <> · {b.lateStarts.map((l) => `${l.start} 시작 ${l.count}명`).join(" · ")}</>}
          </span>
        </span>
      </>
    ) : (
      <>
        <span className="flex items-baseline gap-2">
          <span className="shrink-0 text-caption font-semibold text-muted">보강</span>
          <span className={cn("truncate text-subhead font-semibold", done ? "text-muted" : "text-strong")}>{b.studentName}</span>
        </span>
        <span className="mt-0.5 block truncate text-caption text-muted">{[b.reason, b.teacherName].filter(Boolean).join(" · ")}</span>
      </>
    );

  // 반 블록 → 그 반 출결 화면 (원장님 출결 화면이 생기기 전까지 선생님 출결 화면에 그 반을 골라 둔 채로, 10/9)
  const href = b.kind === "class" ? `/teacher?class=${b.classId}` : "/admin/makeups";
  return (
    <li>
      <Link
        href={href}
        data-state={state}
        className="press-hcard relative flex items-start gap-3 rounded-[var(--radius-mcard)] py-3 pr-2 pl-4 hover:bg-page/60"
      >
        {/* 진행 중: 왼쪽 파랑 4px 막대 */}
        {live && <span aria-hidden data-live-bar className="absolute top-3 bottom-3 left-0 w-1 rounded-full bg-live" />}
        <span className="w-[52px] shrink-0 text-right leading-tight tabular">
          <span data-start className={cn("block text-body font-semibold", done ? "text-muted" : "text-strong")}>{b.start}</span>
          <span className="block text-caption text-muted">~{b.end}</span>
        </span>
        <span className="flex shrink-0 self-stretch">{marker}</span>
        <span className="min-w-0 flex-1">{body}</span>
        <span className="shrink-0 pt-0.5 text-right text-caption tabular">
          {live ? (
            <span className="flex items-center justify-end gap-1.5 font-semibold text-strong">
              <Dot className="bg-live" />
              수업 중
            </span>
          ) : (
            <span className="block text-muted">{state}</span>
          )}
          {/* 수업 중인데 아직 안 온 학생 → 주황 점 (처리할 일에도 들어간다) */}
          {b.kind === "class" && live && b.notArrived > 0 && (
            <span className="mt-1 flex items-center justify-end gap-1.5 font-semibold text-strong">
              <Dot className="bg-caution" />
              미등원 {b.notArrived}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
