import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

// 관리 화면용 표: 줄무늬 없이 가는 구분선, 머리줄은 흰 바탕 + 회색 글씨(10/2 흰 디자인). 넓으면 표만 가로 스크롤

export function Table({ className, ...rest }: ComponentProps<"table">) {
  return (
    // 상자 없이 위아래 1px 선만 (10/7 오후)
    <div className="overflow-x-auto border-y border-line-soft bg-card">
      <table className={cn("w-full border-collapse text-body", className)} {...rest} />
    </div>
  );
}

/**
 * 머리칸. 글씨 14px (10/12 범준님: 13px은 본문 15px보다 너무 작아 보임)
 * @param flush 안쪽 여백 없음: 칸 안에 정렬 버튼처럼 자기 여백을 가진 것을 넣을 때 (여백이 두 번 들어가 아래 칸과 어긋나지 않게)
 */
export function Th({ className, flush = false, ...rest }: ComponentProps<"th"> & { flush?: boolean }) {
  return (
    <th
      className={cn(
        "border-b border-line-soft bg-card text-left text-note font-semibold whitespace-nowrap text-sub",
        !flush && "px-3 py-2.5",
        className,
      )}
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
