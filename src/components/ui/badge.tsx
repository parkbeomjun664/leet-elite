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

/** 상태 표시 (등원·제출·읽음 등). 네모에 가까운 작은 모서리 */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-[4px] px-2 text-[13px] font-semibold whitespace-nowrap", TONE[tone], className)}>
      {children}
    </span>
  );
}
