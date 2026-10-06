"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * 메뉴·탭으로 다른 화면에 갈 때 본문이 살짝 밀려 들어오는 전환 (docs/design.md 8번, 움직임은 globals.css page-enter)
 * 주소(pathname)가 바뀔 때만 움직인다. 같은 화면 안의 변화(출결 저장 등)에는 움직이지 않는다
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-enter" exit="none" default="none">
      {children}
    </ViewTransition>
  );
}
