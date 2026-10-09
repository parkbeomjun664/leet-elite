"use client";

import { cn } from "@/lib/cn";
import { useAnimatedNumber } from "@/lib/use-animated-number";

/**
 * 큰 숫자 하나. 값이 바뀌면 이전 숫자에서 새 숫자로 굴러간다 (250ms, 움직임 줄이기면 바로, docs/design.md 6번)
 * 서버 화면에서 써도 된다: 새로 불러와 값이 바뀌면 그때 굴러간다 (처음 그릴 때는 바로 그 숫자)
 */
export function StatFigure({ value, className }: { value: number; className?: string }) {
  const shown = useAnimatedNumber(value);
  return <span className={cn("tabular", className)}>{shown}</span>;
}
