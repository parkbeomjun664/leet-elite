"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/panel";
import { SegmentedControl } from "@/components/ui/segment";
import type { HomeworkRow } from "@/lib/data/homework";
import { cn } from "@/lib/cn";
import { dueLabel, dueTone, type DueTone } from "@/lib/homework/display";
import { statusDate } from "@/lib/homework/status";

type Filter = "all" | "general" | "daily";

// 마감 글자색 (10/14 범준님): 지남 빨강 · 오늘 주황 · 그 뒤 회색. 13px 글씨라 셋 다 대비 4.5 이상인 짙은 쪽
// (명세 #F04452 → #D91F2F, #FF9F0A → #9C5F09(대비 2.1이라), #8B95A1 → #646E7C)
const DUE_CLASS: Record<DueTone, string> = { past: "text-danger-text", today: "text-warn font-semibold", later: "text-muted" };

/** "2026-10-14" → "10/14" */
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 제출 현황 아래 글자: 일반 "제출" / 매일은 기준 날짜가 오늘이면 "오늘 제출", 아니면 "10/3 제출" (statusDate와 같은 기준) */
function progressLabel(r: HomeworkRow, today: string): string {
  if (r.kind !== "daily" || !r.startsOn || !r.endsOn) return "제출";
  const day = statusDate(r.startsOn, r.endsOn, today);
  return day === today ? "오늘 제출" : `${md(day)} 제출`;
}

/**
 * 숙제 목록 (HW-04). 원장님·선생님 공통
 * 10/14 오후 범준님 개선: 회색 바탕 + 흰 카드, 줄 = [종류] 제목 / 대상 요약 · 마감, 오른쪽 제출 n / m명 + 4px 막대 + ›,
 *   줄을 누르면 상세(학생별 제출 현황)
 */
export function HomeworkList({ rows, newHref, baseHref, today }: { rows: HomeworkRow[]; newHref: string; baseHref: string; today: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = rows.filter((r) => filter === "all" || r.kind === filter);
  const count = (k: Filter) => (k === "all" ? rows.length : rows.filter((r) => r.kind === k).length);

  return (
    // data-tone="page": 바탕을 원장 홈과 같은 회색으로 (app-chrome.tsx)
    <div data-tone="page" className="mx-auto max-w-[960px] space-y-5">
      <PageHeader
        title="숙제"
        actions={
          <ButtonLink href={newHref} variant="primary">
            숙제 등록
          </ButtonLink>
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-hcard)] border border-hairline bg-card">
          <EmptyState
            icon={BookOpen}
            title="아직 낸 숙제가 없어요"
            description="[숙제 등록]으로 반이나 학생에게 숙제를 내 보세요"
            action={
              <ButtonLink href={newHref} variant="primary">
                숙제 등록
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <>
          <SegmentedControl
            label="종류로 거르기"
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: "전체", count: count("all") },
              { value: "general", label: "일반", count: count("general") },
              { value: "daily", label: "매일", count: count("daily") },
            ]}
          />
          <ul aria-label="숙제 목록" className="divide-y divide-page overflow-hidden rounded-[var(--radius-hcard)] border border-hairline bg-card">
            {shown.map((r) => {
              const done = r.targetCount > 0 && r.submittedCount === r.targetCount;
              const pct = r.targetCount ? Math.round((r.submittedCount / r.targetCount) * 100) : 0;
              const tone = r.dueOn ? dueTone(r.dueOn, today) : null;
              return (
                <li key={r.id} data-homework={r.id}>
                  <Link
                    href={`${baseHref}/${r.id}`}
                    className={cn("group flex min-h-[72px] items-center gap-4 px-6 py-3 transition-colors duration-[var(--duration-fast)] hover:bg-block", r.archived && "opacity-60")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        {/* 종류 태그: 매일 = 연한 파랑, 일반 = 회색 */}
                        <span
                          data-kind={r.kind}
                          className={cn(
                            "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-micro font-semibold",
                            r.kind === "daily" ? "bg-class-1-bg text-class-1-text" : "bg-page text-base",
                          )}
                        >
                          {r.kind === "daily" ? "매일" : "일반"}
                        </span>
                        <span className="truncate text-body font-semibold text-strong">{r.title}</span>
                        {r.archived && <span className="shrink-0 text-caption text-sub">보관됨</span>}
                      </span>
                      <span className="mt-1 block truncate text-caption text-muted" data-meta>
                        {r.summary}
                        {r.dueOn && tone && (
                          <>
                            {" · "}
                            <span data-due={tone} className={DUE_CLASS[tone]}>
                              마감 {dueLabel(r.dueOn)}
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                    {/* 제출 현황 n / m명 + 4px 막대 (다 내면 초록, 아니면 파랑) */}
                    <span className="w-[120px] shrink-0 text-right tabular" data-progress>
                      <span className="text-body font-bold text-strong">{r.submittedCount}</span>
                      <span className="text-caption text-muted"> / {r.targetCount}명</span>
                      <span aria-hidden className="mt-1.5 block h-1 overflow-hidden rounded-full bg-page">
                        <span data-bar className={cn("block h-full rounded-full", done ? "bg-arrive" : "bg-live")} style={{ width: `${pct}%` }} />
                      </span>
                      <span className="mt-1 block text-micro text-muted">{progressLabel(r, today)}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-dim transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
