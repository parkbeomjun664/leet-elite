import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "ok" | "warn" | "info" | "brand" | "neutral";

const TONE: Record<Tone, string> = {
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
  info: "bg-info/10 text-info",
  brand: "bg-brand/10 text-brand",
  neutral: "bg-ink/[0.06] text-sub",
};

/** 상태 표시 (등원·제출·읽음 등). 규칙 하나: 상태색 10% 바탕 + 진한 글씨 + 모서리 4px + 12px (Stripe식) */
// size="lg": 휴대폰 화면용 (14px, 조금 더 크게)
export function Badge({ tone = "neutral", size = "md", children, className }: { tone?: Tone; size?: "md" | "lg"; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] font-semibold whitespace-nowrap",
        size === "lg" ? "h-7 px-2 text-sm" : "h-[22px] px-1.5 text-xs",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
