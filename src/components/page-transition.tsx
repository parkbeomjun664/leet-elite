"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * 메뉴·탭으로 다른 화면에 갈 때 본문이 150ms 동안 겹쳐 바뀌는 전환 (docs/design.md 8번, 움직임은 globals.css page-enter·page-exit)
 * 이전 본문은 흐려지며 남아 있다가 사라진다 → 이동 중 본문이 비는 프레임이 없다 (10/8)
 * 주소(pathname)가 바뀔 때만 움직인다. 같은 화면 안의 변화(출결 저장 등)에는 움직이지 않는다
 */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">
      {/* className이 있으면 여백 칸까지 주소마다 새로 그린다: 하위 메뉴 줄이 생기거나 없어져도 "같은 칸이 밀렸다"(CLS)로 보이지 않게 (10/8) */}
      {className ? <div className={className}>{children}</div> : children}
    </ViewTransition>
  );
}
