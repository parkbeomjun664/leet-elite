"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { nowTimeKST } from "@/lib/date";
import { blockState, summarize, type Block, type BlockState } from "@/lib/admin/timeline";
import { cn } from "@/lib/cn";


// 원장님 새 홈 가운데 "오늘 시간표" (10/9 v2): 시간순 반 블록 + 보강(◇) + 지금 시각 가로선
// 1분마다 지금 시각을 다시 재고(상태·가로선) 화면 데이터도 새로 불러온다(등원 숫자). 시연 시각(?at=)이면 멈춰 둔다

const STATE_TEXT: Record<BlockState, string> = { "수업 중": "font-semibold text-ok", 예정: "text-sub", 끝남: "text-sub" };

export function TodayTimeline({
  dateLabel,
  blocks,
  initialNow,
  demo,
}: {
  dateLabel: string; // "10월 9일 (금)"
  blocks: Block[]; // 시간순
  initialNow: string; // "HH:MM"
  demo: boolean; // 시연 시각이면 시계를 멈춘다
}) {
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

  const s = summarize(blocks, now);
  // 지금 가로선 자리: 아직 시작하지 않은 첫 블록 바로 앞
  const nowIndex = (() => {
    const i = blocks.findIndex((b) => b.start > now);
    return i < 0 ? blocks.length : i;
  })();

  return (
    <section aria-labelledby="timeline-title" className="space-y-6">
      {/* 날짜 + 한 문장 요약 (숫자 칸 없이) */}
      <header>
        <h1 id="timeline-title" className="text-lead font-bold tracking-tight tabular">
          {dateLabel}
        </h1>
        <p className="mt-1 text-heading text-ink tabular" aria-live="polite">
          {/* 줄이 바뀌어도 "결석 0"처럼 한 덩어리는 붙어 있게 */}
          <span className="whitespace-nowrap">
            {s.inClass > 0 ? (
              <>
                지금 <b className="font-bold">{s.inClass}개 반</b> 수업 중
              </>
            ) : (
              <span className="text-sub">지금 수업 중인 반은 없어요</span>
            )}
          </span>
          <span className="text-sub"> · </span>
          <span className="whitespace-nowrap">
            등원 <b className="font-bold">{s.arrived}</b>
            <span className="text-sub">/{s.total}</span>
          </span>
          <span className="text-sub"> · </span>
          <span className="whitespace-nowrap">
            결석 <b className="font-bold">{s.absent}</b>
          </span>
        </p>
      </header>

      {blocks.length === 0 ? (
        <p className="text-body text-sub">오늘은 수업이 없어요.</p>
      ) : (
        <ol aria-label="오늘 시간표" className="relative">
          {/* 세로선 (시각 칸 오른쪽) */}
          <span aria-hidden className="absolute top-2 bottom-2 left-[71px] w-px bg-line-soft" />
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
  );
}

/** 지금 시각 가로선 */
function NowLine({ now }: { now: string }) {
  return (
    <li aria-label={`지금 ${now}`} className="relative flex items-center gap-2 py-1.5">
      <span className="w-[60px] shrink-0 text-right text-caption font-bold text-ink tabular">{now}</span>
      <span aria-hidden className="relative z-[1] ml-[5px] size-2.5 shrink-0 rounded-full bg-ink ring-4 ring-card" />
      <span aria-hidden className="h-px flex-1 bg-ink" />
    </li>
  );
}

/** 블록 한 줄: 시각 · 표시(반 ● / 보강 ◇) · 내용 · 상태 */
function BlockRow({ b, state }: { b: Block; state: BlockState }) {
  const done = state === "끝남";
  const marker =
    b.kind === "makeup" ? (
      // 보강은 마름모
      <span aria-hidden className={cn("relative z-[1] mt-1.5 size-2.5 shrink-0 rotate-45 ring-4 ring-card", done ? "bg-line" : "border-[1.5px] border-ink bg-card")} />
    ) : (
      <span
        aria-hidden
        className={cn(
          "relative z-[1] mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-card",
          state === "수업 중" ? "bg-ok" : done ? "bg-line" : "border-[1.5px] border-sub bg-card",
        )}
      />
    );

  const body =
    b.kind === "class" ? (
      <>
        <span className="flex items-baseline gap-2">
          <span className={cn("truncate text-body font-bold", done ? "text-sub" : "text-ink")}>{b.className}</span>
          {b.teacherName && <span className="truncate text-caption text-sub">{b.teacherName}</span>}
        </span>
        {/* 등원 진행 막대 x/y */}
        <span className="mt-1.5 flex items-center gap-2">
          <span
            className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-line-soft"
            role="img"
            aria-label={`등원 ${b.arrived}명 / ${b.total}명`}
          >
            <span className="block h-full rounded-full bg-ok transition-[width] duration-[var(--duration-base)]" style={{ width: `${b.total ? (b.arrived / b.total) * 100 : 0}%` }} />
          </span>
          <span className="text-caption text-sub tabular">
            등원 {b.arrived}/{b.total}
            {b.absent > 0 && ` · 결석 ${b.absent}`}
          </span>
        </span>
      </>
    ) : (
      <>
        <span className="flex items-baseline gap-2">
          <span className="shrink-0 text-caption font-semibold text-sub">보강</span>
          <span className={cn("truncate text-body font-bold", done ? "text-sub" : "text-ink")}>{b.studentName}</span>
        </span>
        <span className="mt-0.5 block truncate text-caption text-sub">{[b.reason, b.teacherName].filter(Boolean).join(" · ")}</span>
      </>
    );

  // 반 블록 → 그 반 출결 화면 (원장님 출결 화면이 생기기 전까지 선생님 출결 화면에 그 반을 골라 둔 채로, 10/9)
  const href = b.kind === "class" ? `/teacher?class=${b.classId}` : "/admin/makeups";
  return (
    <li>
      <Link href={href} className="press-card -mx-2 flex items-start gap-2 rounded-[var(--radius-control)] px-2 py-3 hover:bg-bg">
        <span className="w-[60px] shrink-0 text-right leading-tight tabular">
          <span className={cn("block text-body font-semibold", done ? "text-sub" : "text-ink")}>{b.start}</span>
          <span className="block text-caption text-sub">~{b.end}</span>
        </span>
        <span className="ml-[5px] flex shrink-0 self-stretch">{marker}</span>
        <span className="min-w-0 flex-1">{body}</span>
        <span className={cn("shrink-0 pt-0.5 text-caption tabular", STATE_TEXT[state])}>{state}</span>
      </Link>
    </li>
  );
}
