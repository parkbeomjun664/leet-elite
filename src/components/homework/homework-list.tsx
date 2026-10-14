"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/panel";
import { Segment } from "@/components/ui/segment";
import type { HomeworkRow } from "@/lib/data/homework";
import { cn } from "@/lib/cn";
import { statusDate } from "@/lib/homework/status";

type Filter = "all" | "general" | "daily";

/** 제출 현황 아래 글자: 일반 "제출" / 매일은 기준 날짜가 오늘이면 "오늘 제출", 아니면 "10/3 제출" (statusDate와 같은 기준) */
function progressLabel(r: HomeworkRow, today: string): string {
  if (r.kind !== "daily" || !r.startsOn || !r.endsOn) return "제출";
  const day = statusDate(r.startsOn, r.endsOn, today);
  return day === today ? "오늘 제출" : `${md(day)} 제출`;
}

/** "2026-10-14" → "10/14" */
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/**
 * 숙제 목록 (HW-04, 10/14). 원장님·선생님 공통
 * 줄 하나 = 종류(일반·매일) · 제목 · 대상 · 등록일 · 제출 n / 대상 m. 위 알약으로 종류 거르기
 * 숙제를 눌러 고치기·지우기·학생별 제출 보기는 다음 단계(10/15~16)
 */
export function HomeworkList({ rows, newHref, today }: { rows: HomeworkRow[]; newHref: string; today: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = rows.filter((r) => filter === "all" || r.kind === filter);
  const count = (k: Filter) => (k === "all" ? rows.length : rows.filter((r) => r.kind === k).length);

  return (
    <div className="space-y-5">
      <PageHeader
        title="숙제"
        description={`등록한 숙제 ${rows.length}개`}
        actions={
          <ButtonLink href={newHref} variant="primary">
            숙제 등록
          </ButtonLink>
        }
      />

      {rows.length === 0 ? (
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
      ) : (
        <>
          <div role="group" aria-label="종류로 거르기" className="flex gap-1">
            {(["all", "general", "daily"] as const).map((k) => (
              <Segment key={k} active={filter === k} onClick={() => setFilter(k)} count={count(k)}>
                {k === "all" ? "전체" : k === "general" ? "일반" : "매일"}
              </Segment>
            ))}
          </div>
          <ul aria-label="숙제 목록" className="divide-y divide-line-soft border-y border-line-soft bg-card">
            {shown.map((r) => {
              const done = r.targetCount > 0 && r.submittedCount === r.targetCount;
              return (
                <li key={r.id} data-homework={r.id} className={cn("flex min-h-14 items-center gap-3 px-3 py-3", r.archived && "opacity-60")}>
                  {/* 종류 표시는 줄 맨 왼쪽에 분명히 (HW-04) */}
                  <span
                    data-kind={r.kind}
                    className={cn(
                      "inline-flex h-6 w-10 shrink-0 items-center justify-center rounded-[var(--radius-tag)] text-micro font-semibold",
                      r.kind === "daily" ? "bg-class-1-bg text-class-1-text" : "bg-page text-base",
                    )}
                  >
                    {r.kind === "daily" ? "매일" : "일반"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-strong">
                      {r.title}
                      {r.archived && <span className="ml-2 text-caption font-normal text-sub">보관됨</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-muted">
                      {r.targetNames.join(", ")}
                      {r.targetCount > r.targetNames.length && ` 외 ${r.targetCount - r.targetNames.length}명`}
                      {" · "}
                      {r.kind === "daily" && r.startsOn && r.endsOn
                        ? r.startsOn === r.endsOn
                          ? `${md(r.startsOn)} 하루`
                          : `${md(r.startsOn)}~${md(r.endsOn)}`
                        : `${md(r.createdOn)} 등록`}
                    </span>
                  </span>
                  {/* 제출 현황 (매일 숙제는 오늘 기준) */}
                  <span className="shrink-0 text-right tabular" data-progress>
                    <span className={cn("text-body font-bold", done ? "text-ok" : "text-strong")}>{r.submittedCount}</span>
                    <span className="text-caption text-muted"> / {r.targetCount}명</span>
                    <span className="block text-micro text-muted">{progressLabel(r, today)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
