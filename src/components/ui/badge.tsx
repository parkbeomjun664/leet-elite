import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "ok" | "warn" | "info" | "brand" | "neutral";

const TONE: Record<Tone, string> = {
  ok: "bg-ok-tint text-ok",
  warn: "bg-warn-tint text-warn",
  info: "bg-info-tint text-info",
  brand: "bg-brand-tint text-brand",
  neutral: "bg-line-soft text-sub",
};

/** 상태 표시 (등원·제출·읽음 등). 상태색 바탕 + 진한 글씨 + 모서리 4px + 13px (docs/design.md 4번) */
// size="lg": 휴대폰 화면용 (높이 26px)
export function Badge({ tone = "neutral", size = "md", children, className }: { tone?: Tone; size?: "md" | "lg"; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-badge)] text-caption font-semibold whitespace-nowrap",
        size === "lg" ? "h-[26px] px-2" : "h-[22px] px-1.5",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
