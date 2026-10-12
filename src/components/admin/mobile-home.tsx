"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AttendanceBar } from "@/components/admin/attendance-bar";
import { DaySummary, Dot, useClock } from "@/components/admin/today-timeline";
import { blockState, type Block, type ClassBlock } from "@/lib/admin/timeline";
import { cn } from "@/lib/cn";

// 원장 홈 휴대폰 (10/9 v2 → 10/12 v3 토스 스타일): 회색 바탕 위 흰 카드가 한 줄로 쌓인다 (카드 사이 16)
// 요약 → 처리할 일 한 줄 → 지금 수업 중인 반(왼쪽 파랑 막대, 미등원 이름) → 다음 수업

const NEXT_LIMIT = 4;
const CARD = "rounded-[var(--radius-hcard)] bg-card";

export function MobileHome({
  dateLabel,
  blocks,
  initialNow,
  demo,
  todoCount,
}: {
  dateLabel: string;
  blocks: Block[];
  initialNow: string;
  demo: boolean;
  todoCount: number;
}) {
  const now = useClock(initialNow, demo);
  const live = blocks.filter((b): b is ClassBlock => b.kind === "class" && blockState(b, now) === "수업 중");
  const next = blocks.filter((b) => blockState(b, now) === "예정").slice(0, NEXT_LIMIT);

  return (
    <div className="space-y-4">
      <DaySummary dateLabel={dateLabel} blocks={blocks} now={now} titleId="mobile-home-title" />

      {/* 처리할 일 한 줄 → 목록 화면 */}
      <Link href="/admin/todo" className={cn(CARD, "press-hcard flex min-h-16 items-center justify-between gap-3 px-6")}>
        <span className="text-subhead font-semibold text-strong">
          처리할 일 <span className={cn("tabular", todoCount > 0 ? "text-strong" : "text-muted")}>{todoCount}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-muted-soft" />
      </Link>

      {/* 지금 수업 중: 반 하나를 카드 하나로, 왼쪽 파랑 4px 막대 */}
      <section aria-labelledby="live-title" className="space-y-3">
        <h2 id="live-title" className="px-1 text-body font-semibold text-strong">
          지금 수업 중 <span className="tabular">{live.length}</span>
        </h2>
        {live.length === 0 ? (
          <p className={cn(CARD, "p-6 text-body text-muted")}>지금 수업 중인 반은 없어요.</p>
        ) : (
          <ul className="space-y-4">
            {live.map((b) => {
              const missing = b.students.filter((st) => st.status === "not_arrived");
              return (
                <li key={b.id}>
                  <Link href={`/teacher?class=${b.classId}`} className={cn(CARD, "press-hcard relative block overflow-hidden p-6")}>
                    <span aria-hidden data-live-bar className="absolute inset-y-0 left-0 w-1 bg-live" />
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-subhead font-semibold text-strong">{b.className}</span>
                      <span className="shrink-0 text-caption text-muted tabular">
                        {b.start}~{b.end}
                      </span>
                    </span>
                    {b.teacherName && <span className="block text-caption text-muted">{b.teacherName}</span>}
                    <span className="mt-4 flex items-center gap-3">
                      <AttendanceBar counts={b} className="flex-1" />
                      <span className="shrink-0 text-caption text-muted tabular">
                        등원 {b.arrived}/{b.total}
                        {b.absent > 0 && <> · 결석 {b.absent}</>}
                      </span>
                    </span>
                    {/* 아직 안 온 학생 이름 (주황 점) */}
                    {missing.length > 0 && (
                      <span className="mt-3 flex items-center gap-1.5 text-caption font-semibold text-strong">
                        <Dot className="bg-caution" />
                        미등원 {missing.length} · {missing.map((st) => st.name).join(", ")}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 다음 수업: 카드 하나에 짧은 목록 */}
      <section aria-labelledby="next-title" className={cn(CARD, "p-6")}>
        <h2 id="next-title" className="text-subhead font-semibold text-strong">
          다음 수업
        </h2>
        {next.length === 0 ? (
          <p className="mt-2 text-body text-muted">오늘 남은 수업이 없어요.</p>
        ) : (
          <ul className="mt-2">
            {next.map((b) => (
              <li key={b.id}>
                <Link
                  href={b.kind === "class" ? `/teacher?class=${b.classId}` : "/admin/makeups"}
                  className="press-hcard -mx-2 flex items-center gap-3 rounded-[var(--radius-mcard)] px-2 py-3"
                >
                  <span className="w-12 shrink-0 text-body font-semibold text-strong tabular">{b.start}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {b.kind === "class" ? (
                      <>
                        <b className="text-subhead font-semibold text-strong">{b.className}</b>
                        <span className="ml-2 text-caption text-muted">{b.total}명</span>
                      </>
                    ) : (
                      <>
                        <span className="mr-1.5 text-caption font-semibold text-muted">◇ 보강</span>
                        <b className="text-subhead font-semibold text-strong">{b.studentName}</b>
                      </>
                    )}
                  </span>
                  {b.teacherName && <span className="shrink-0 text-caption text-muted">{b.teacherName}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
