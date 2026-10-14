import Link from "next/link";
import { ChevronLeft, Image as ImageIcon, MessageSquareText } from "lucide-react";
import { ComingSoonButton } from "@/components/coming-soon-button";
import type { HomeworkDetail } from "@/lib/data/homework";
import { cn } from "@/lib/cn";
import { WEEKDAY_KO } from "@/lib/date";
import { dueLabel, dueTone } from "@/lib/homework/display";
import { WEEKDAY_ORDER } from "@/lib/homework/form";

const DUE_CLASS = { past: "text-danger-text", today: "text-warn font-semibold", later: "text-muted" } as const;
const CARD = "rounded-[var(--radius-hcard)] bg-card p-6";

/**
 * 숙제 상세 (HW-05 학생별 제출 여부, 10/14 기본). 목록에서 줄을 누르면 온다
 * 위: 종류·제출 방식·제목·기간/마감·대상 요약·내용 / 아래: 제출 n / m명 + 학생 줄(안 낸 학생 먼저)
 * 수정·삭제(보관)와 제출물·사진 보기·피드백은 다음 단계(10/15~)
 */
export function HomeworkDetailView({ hw, listHref, today }: { hw: HomeworkDetail; listHref: string; today: string }) {
  const tone = hw.dueOn ? dueTone(hw.dueOn, today) : null;
  const days = hw.weekdays ? WEEKDAY_ORDER.filter((d) => hw.weekdays!.includes(d)).map((d) => WEEKDAY_KO[d]).join("·") : "";
  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  return (
    <div data-tone="page" className="mx-auto max-w-[960px] space-y-4">
      <Link href={listHref} className="-ml-1 inline-flex min-h-11 items-center gap-0.5 text-caption font-semibold text-base hover:underline">
        <ChevronLeft aria-hidden className="size-4" />
        숙제 목록
      </Link>

      <section className={CARD} aria-labelledby="hw-title">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex h-5 items-center rounded-[var(--radius-tag)] px-1.5 text-micro font-semibold", hw.kind === "daily" ? "bg-class-1-bg text-class-1-text" : "bg-page text-base")}>
            {hw.kind === "daily" ? "매일" : "일반"}
          </span>
          <span className="inline-flex h-5 items-center rounded-[var(--radius-tag)] bg-page px-1.5 text-micro font-semibold text-base">{hw.submitMode === "check" ? "체크만" : "사진 첨부"}</span>
          {hw.archived && <span className="text-caption text-sub">보관됨</span>}
        </div>
        <h1 id="hw-title" className="mt-2 text-title font-bold text-strong">
          {hw.title}
        </h1>
        <p className="mt-1 text-caption text-muted">
          {hw.summary}
          {hw.kind === "daily" && hw.startsOn && hw.endsOn && ` · ${md(hw.startsOn)}~${md(hw.endsOn)}${days ? ` (${days})` : ""}`}
          {hw.dueOn && tone && (
            <>
              {" · "}
              <span className={DUE_CLASS[tone]}>마감 {dueLabel(hw.dueOn)}</span>
            </>
          )}
        </p>
        {hw.body && <p className="mt-4 text-body whitespace-pre-wrap text-ink">{hw.body}</p>}
        {/* 수정·삭제(제출물이 있으면 보관)는 10/15 (HW-12) */}
        <div className="mt-5 flex gap-2">
          <ComingSoonButton size="sm" feature="숙제 수정" opensOn="10/15">
            수정
          </ComingSoonButton>
          <ComingSoonButton size="sm" variant="danger" feature="숙제 삭제" opensOn="10/15">
            삭제
          </ComingSoonButton>
        </div>
      </section>

      <section className={CARD} aria-labelledby="hw-subs">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="hw-subs" className="text-subhead font-bold tracking-tight text-strong">
            제출 현황
          </h2>
          <p className="text-caption text-muted tabular" data-progress>
            {hw.statusDay && `${hw.statusDay === today ? "오늘" : md(hw.statusDay)} · `}
            <b className="text-body font-bold text-strong">{hw.submittedCount}</b> / {hw.targetCount}명
          </p>
        </div>
        <ul aria-label="학생별 제출" className="mt-3 divide-y divide-line-soft">
          {hw.students.map((s) => (
            <li key={s.id} data-student={s.id} className="flex min-h-12 items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="text-body font-semibold text-strong">{s.name}</span>
                {(s.school || s.grade) && <span className="ml-2 text-caption text-muted">{[s.school, s.grade].filter(Boolean).join(" ")}</span>}
              </span>
              {s.submittedAt ? (
                <span className="flex items-center gap-3 text-caption text-muted tabular" data-state="submitted">
                  {s.photoCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon aria-hidden className="size-3.5" />
                      {s.photoCount}
                    </span>
                  )}
                  {s.hasFeedback && (
                    <span className="inline-flex items-center gap-1" title="피드백 남김">
                      <MessageSquareText aria-hidden className="size-3.5" />
                      피드백
                    </span>
                  )}
                  <span className="font-semibold text-ok">제출 {s.submittedAt}</span>
                </span>
              ) : (
                <span className="text-caption font-semibold text-muted" data-state="missing">
                  미제출
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
