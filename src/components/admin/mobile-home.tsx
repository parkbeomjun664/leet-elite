"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { DaySummary, useClock } from "@/components/admin/today-timeline";
import { blockState, type Block, type ClassBlock } from "@/lib/admin/timeline";
import { cn } from "@/lib/cn";

// 원장님 새 홈 휴대폰 (10/9 v2 4단계): 요약 → 지금 수업 중인 반(크게, 미등원 이름) → 다음 수업 → 처리할 일 한 줄
// 카드 상자 대신 옅은 회색 면으로 반 하나를 묶는다 (카드 최소화, 면으로 구분)

const NEXT_LIMIT = 4;

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
    <div className="space-y-8">
      <DaySummary dateLabel={dateLabel} blocks={blocks} now={now} titleId="mobile-home-title" />

      {/* 처리할 일 한 줄 → 목록 화면 */}
      <Link
        href="/admin/home-v2/todo"
        className="press-card -mx-1 flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-mcard)] bg-bg px-4"
      >
        <span className="text-body font-semibold text-ink">
          처리할 일 <span className={cn("tabular", todoCount > 0 ? "text-ink" : "text-sub")}>{todoCount}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-sub" />
      </Link>

      {/* 지금 수업 중: 반 하나를 크게 */}
      <section aria-labelledby="live-title">
        <h2 id="live-title" className="text-caption font-semibold text-sub">
          지금 수업 중 <span className="tabular">{live.length}</span>
        </h2>
        {live.length === 0 ? (
          <p className="mt-2 text-body text-sub">지금 수업 중인 반은 없어요.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {live.map((b) => {
              const missing = b.students.filter((st) => st.status === "not_arrived");
              return (
                <li key={b.id}>
                  <Link href={`/teacher?class=${b.classId}`} className="press-card block rounded-[var(--radius-mcard)] bg-bg px-4 py-4">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-heading font-bold text-ink">{b.className}</span>
                      <span className="shrink-0 text-caption text-sub tabular">
                        {b.start}~{b.end}
                      </span>
                    </span>
                    {b.teacherName && <span className="block text-caption text-sub">{b.teacherName}</span>}
                    <span className="mt-3 flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft" role="img" aria-label={`등원 ${b.arrived}명 / ${b.total}명`}>
                        <span className="block h-full rounded-full bg-ok" style={{ width: `${b.total ? (b.arrived / b.total) * 100 : 0}%` }} />
                      </span>
                      <span className="shrink-0 text-caption text-sub tabular">
                        등원 <b className="font-bold text-ink">{b.arrived}</b>/{b.total}
                      </span>
                    </span>
                    {/* 아직 안 온 학생 이름 (주황) */}
                    {missing.length > 0 && (
                      <span className="mt-2 block text-caption font-semibold text-warn">
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

      {/* 다음 수업: 짧은 목록 */}
      <section aria-labelledby="next-title">
        <h2 id="next-title" className="text-caption font-semibold text-sub">
          다음 수업
        </h2>
        {next.length === 0 ? (
          <p className="mt-2 text-body text-sub">오늘 남은 수업이 없어요.</p>
        ) : (
          <ul className="mt-1 divide-y divide-line-soft">
            {next.map((b) => (
              <li key={b.id}>
                <Link href={b.kind === "class" ? `/teacher?class=${b.classId}` : "/admin/makeups"} className="press-card -mx-1 flex items-center gap-3 rounded-[var(--radius-control)] px-1 py-3">
                  <span className="w-12 shrink-0 text-body font-semibold text-ink tabular">{b.start}</span>
                  <span className="min-w-0 flex-1 truncate text-body">
                    {b.kind === "class" ? (
                      <>
                        <b className="font-bold">{b.className}</b>
                        <span className="ml-2 text-caption text-sub">{b.total}명</span>
                      </>
                    ) : (
                      <>
                        <span className="mr-1.5 text-caption font-semibold text-sub">◇ 보강</span>
                        <b className="font-bold">{b.studentName}</b>
                      </>
                    )}
                  </span>
                  {b.teacherName && <span className="shrink-0 text-caption text-sub">{b.teacherName}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
