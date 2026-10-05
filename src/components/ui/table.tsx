import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

// 관리 화면용 표: 줄무늬 없이 가는 구분선, 머리줄은 흰 바탕 + 회색 글씨(10/2 흰 디자인). 넓으면 표만 가로 스크롤

export function Table({ className, ...rest }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line-soft bg-card">
      <table className={cn("w-full border-collapse text-body", className)} {...rest} />
    </div>
  );
}

export function Th({ className, ...rest }: ComponentProps<"th">) {
  return (
    <th
      className={cn("border-b border-line-soft bg-card px-3 py-2.5 text-left text-caption font-semibold whitespace-nowrap text-sub", className)}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: ComponentProps<"td">) {
  return <td className={cn("border-b border-line-soft px-3 py-2.5 align-middle", className)} {...rest} />;
}

export function Tr({ className, ...rest }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors duration-[var(--duration-fast)] hover:bg-bg/70 [&:last-child>td]:border-b-0", className)} {...rest} />;
}
