"use client";

import Link from "next/link";
import { ScrollRow } from "@/components/ui/scroll-row";
import { cn } from "@/lib/cn";
import { usePathname } from "next/navigation";
import { activeItem, isActive, type NavItem } from "@/lib/nav";

// 상단 메뉴(TopBar)는 10/12에 원장님·선생님 모두 왼쪽 사이드바(app-chrome.tsx)로 바뀌어 지웠다. 하위 메뉴 줄만 남는다

/**
 * 하위 메뉴 줄 (예: 학생관리 → 재원생 · 휴·퇴원생 · 보호자). 레이아웃의 <main> 맨 위에 둔다 (10/8)
 * 헤더 안에 있으면 이 줄이 생기고 없어질 때마다 본문 전체가 45px 밀려(CLS) 보여서, 본문 칸 안으로 옮겼다
 * 스크롤해도 머리줄 바로 아래에 붙어 있다 (휴대폰 머리줄 56px, PC는 머리줄 없음)
 */
/** @param stickyClass 붙어 있을 위치 (기본: 휴대폰 머리줄 아래, PC 맨 위) */
export function SubNav({ nav, stickyClass = "top-14 lg:top-0" }: { nav: NavItem[]; stickyClass?: string }) {
  const pathname = usePathname();
  const current = activeItem(nav, pathname);
  if (!current?.children) return null;
  return (
    <nav aria-label={`${current.label} 하위 메뉴`} className={cn("sticky z-20 border-b border-line-soft bg-card", stickyClass)}>
      <ScrollRow activeKey={pathname} className="mx-auto max-w-[1280px]">
        <ul className="flex px-1">
          {current.children.map((child) => {
            const active = isActive(pathname, child.href, true);
            return (
              <li key={child.href} className="shrink-0">
                <Link
                  href={child.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-11 items-center px-4 text-body whitespace-nowrap transition-colors duration-[var(--duration-fast)] ${
                    active ? "font-semibold text-ink" : "text-sub hover:text-ink"
                  }`}
                >
                  {child.label}
                  {active && <span className="absolute inset-x-4 bottom-0 h-0.5 bg-brand" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </ScrollRow>
    </nav>
  );
}
