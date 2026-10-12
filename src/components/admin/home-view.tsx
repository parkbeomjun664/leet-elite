"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { DaySummary, TimelineCard, useClock } from "@/components/admin/today-timeline";
import { TodoPanel } from "@/components/admin/todo-panel";
import type { HomeStats, TodoItem } from "@/lib/admin/home-data";
import type { Block } from "@/lib/admin/timeline";
import { cn } from "@/lib/cn";

// 원장 홈 화면 배치 (10/12 v4). 시계 하나를 요약·시간표가 같이 쓴다
// 1280 이상: 위 요약 카드 → 아래 왼쪽 시간표 + 오른쪽 처리할 일(340, 1440 이상 380)
// 1280 미만(휴대폰·태블릿): 요약 → 처리할 일 한 줄(→ 목록 화면) → 시간표, 카드가 한 줄로 쌓인다

const CARD = "rounded-[var(--radius-hcard)] bg-card";

export function HomeView({
  dateLabel,
  blocks,
  todos,
  stats,
  initialNow,
  demo,
}: {
  dateLabel: string;
  blocks: Block[];
  todos: TodoItem[];
  stats: HomeStats;
  initialNow: string;
  demo: boolean;
}) {
  const now = useClock(initialNow, demo);
  return (
    <div className="space-y-4">
      <DaySummary dateLabel={dateLabel} blocks={blocks} now={now} stats={stats} />

      {/* 1280 미만: 처리할 일 한 줄 */}
      <Link href="/admin/todo" className={cn(CARD, "press-hcard flex min-h-16 items-center justify-between gap-3 px-6 xl:hidden")}>
        <span className="text-subhead font-semibold text-strong">
          처리할 일 <span className={cn("tabular", todos.length > 0 ? "text-strong" : "text-muted")}>{todos.length}</span>
        </span>
        <ChevronRight aria-hidden className="size-5 text-muted-soft" />
      </Link>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px] min-[1440px]:grid-cols-[minmax(0,1fr)_380px]">
        <TimelineCard blocks={blocks} now={now} />
        {/* 1280 이상: 오른쪽 처리할 일 (스크롤해도 위에 붙어 있다) */}
        <aside aria-label="처리할 일" className="sticky top-6 hidden xl:block">
          <div className={cn(CARD, "max-h-[calc(100dvh-48px)] overflow-y-auto p-6 [scrollbar-gutter:stable]")}>
            <TodoPanel items={todos} />
          </div>
        </aside>
      </div>
    </div>
  );
}
