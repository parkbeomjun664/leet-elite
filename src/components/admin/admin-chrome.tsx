"use client";

import {
  CalendarCheck,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  Ellipsis,
  House,
  MessageCircle,
  NotebookPen,
  School,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";
import { PageTransition } from "@/components/page-transition";
import { SubNav } from "@/components/top-bar";
import { cn } from "@/lib/cn";
import { activeItem, isActive, type NavItem } from "@/lib/nav";

// 원장님 화면 틀 (10/12 확정: 상단 메뉴 대신 왼쪽 사이드바, decisions.md)
// PC(1024 이상) = 왼쪽 사이드바 220px. 오른쪽 경계 가운데 [‹‹] 버튼으로 아이콘만 남는 64px 막대로 접고 펼친다(이 컴퓨터에 기억)
// 휴대폰·태블릿 = 얇은 머리줄 + 아래 탭 5개(홈·출결·숙제·메시지·더보기)
// 하위 메뉴(재원생·휴퇴원생·보호자 등)는 사이드바에서 그 메뉴 아래에 펼친다. 사이드바를 접었거나 휴대폰이면 본문 맨 위 하위 메뉴 줄로

const ICON: Record<string, LucideIcon> = {
  홈: House,
  출결: CalendarCheck,
  숙제: NotebookPen,
  학생관리: Users,
  "반·선생님": School,
  보강: CalendarClock,
  메시지: MessageCircle,
};

const COLLAPSE_KEY = "leet-admin-sidebar"; // "collapsed" 이면 접힘

export function AdminChrome({ nav, userName, children }: { nav: NavItem[]; userName: string; children: ReactNode }) {
  const pathname = usePathname();
  const current = activeItem(nav, pathname);
  const home = nav[0].href;

  // 접힘 상태: 이 컴퓨터에만 기억 (저장소를 못 쓰면 펼친 채로)
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 저장된 값을 읽어 온다 (서버에서는 알 수 없음)
      if (localStorage.getItem(COLLAPSE_KEY) === "collapsed") setCollapsed(true);
    } catch {}
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "open" : "collapsed");
      } catch {}
      return !c;
    });

  // 휴대폰 아래 탭 5개
  const tabs: { label: string; href: string; icon: LucideIcon }[] = [
    { label: "홈", href: home, icon: House },
    { label: "출결", href: "/admin/attendance", icon: CalendarCheck },
    { label: "숙제", href: "/admin/homework", icon: NotebookPen },
    { label: "메시지", href: "/admin/messages", icon: MessageCircle },
    { label: "더보기", href: "/admin/more", icon: Ellipsis },
  ];
  const tabActive = (href: string) => (href === home ? pathname === home || pathname === "/admin/todo" : isActive(pathname, href));

  return (
    <div data-collapsed={collapsed} className="group/chrome min-h-dvh bg-card lg:flex">
      {/* ── PC: 왼쪽 사이드바 ── */}
      <aside
        aria-label="원장님 메뉴"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line-soft bg-bg transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out)] lg:flex",
          collapsed ? "w-16" : "w-[220px]",
        )}
      >
        <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "pl-5")}>
          <Link href={home} className="flex min-w-0 items-center gap-2" aria-label="홈으로">
            <Image src="/brand/leet-mark.png" alt="" width={407} height={512} className="h-7 w-auto" />
            {!collapsed && (
              <>
                <span className="text-[17px] font-extrabold tracking-tight text-brand">LEET</span>
                <span className="truncate text-[15px] font-semibold text-ink">영어학원</span>
              </>
            )}
          </Link>
        </div>

        {/* 접기·펼치기: 사이드바 오른쪽 경계 세로 가운데에 걸친 동그란 버튼 (10/12 범준님) */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
          title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
          className="press absolute top-1/2 -right-3.5 z-40 grid size-7 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-sub shadow-[var(--shadow-chip)] hover:text-ink"
        >
          {collapsed ? <ChevronsRight aria-hidden className="size-4" /> : <ChevronsLeft aria-hidden className="size-4" />}
        </button>

        <nav aria-label="주 메뉴" className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const on = current?.href === item.href;
              const Icon = ICON[item.label] ?? House;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={on && !item.children ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      // 고른 메뉴 = 흰 바탕 + 왼쪽 버건디 선 (선택 표시는 버건디, 10/9)
                      "press flex h-10 items-center gap-3 rounded-[var(--radius-control)] text-body transition-colors duration-[var(--duration-fast)]",
                      collapsed ? "justify-center" : "px-3",
                      on ? "bg-card font-semibold text-ink shadow-[inset_3px_0_0_var(--color-brand)]" : "text-sub hover:bg-line-soft hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className={cn("size-[18px] shrink-0", on && "text-brand")} strokeWidth={1.8} />
                    {!collapsed && item.label}
                  </Link>
                  {/* 하위 메뉴: 지금 보고 있는 메뉴만 펼친다 */}
                  {!collapsed && on && item.children && (
                    <ul className="mt-0.5 mb-1 space-y-0.5 pl-9">
                      {item.children.map((child) => {
                        const childOn = isActive(pathname, child.href, true);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              aria-current={childOn ? "page" : undefined}
                              className={cn(
                                "flex h-8 items-center rounded-[var(--radius-control)] px-2 text-caption transition-colors duration-[var(--duration-fast)]",
                                childOn ? "font-semibold text-brand" : "text-sub hover:bg-line-soft hover:text-ink",
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={cn("flex shrink-0 items-center gap-2 border-t border-line-soft py-4 text-body", collapsed ? "justify-center px-1" : "justify-between px-5")}>
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <b className="block truncate font-semibold text-ink">{userName}</b>
              <span className="text-caption text-sub">원장님</span>
            </span>
          )}
          <LogoutButton className={cn("shrink-0", collapsed ? "text-[11px]" : "text-caption")} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* ── 휴대폰·태블릿: 얇은 머리줄 ── */}
        <header className="sticky top-0 z-30 border-b border-line-soft bg-card pt-[env(safe-area-inset-top,0px)] lg:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link href={home} className="flex min-h-11 items-center gap-1.5" aria-label="홈으로">
              <Image src="/brand/leet-mark.png" alt="" width={407} height={512} className="h-7 w-auto" />
              <span className="text-[17px] font-extrabold tracking-tight text-brand">LEET</span>
              <span className="text-body font-semibold text-ink">영어학원</span>
            </Link>
            <LogoutButton className="shrink-0 text-caption" />
          </div>
        </header>

        <main className="pb-[calc(80px+env(safe-area-inset-bottom,0px))] lg:pb-0">
          {/* 하위 메뉴 줄: 휴대폰, 또는 사이드바를 접었을 때만 (펼친 사이드바에는 이미 있다) */}
          <div className="lg:hidden group-data-[collapsed=true]/chrome:lg:block">
            <SubNav nav={nav} stickyClass="top-14 lg:top-0" />
          </div>
          {/* 본문 최대 폭 1600 (큰 모니터에서 양옆이 비지 않게, 10/12) */}
          <PageTransition className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">{children}</PageTransition>
        </main>
      </div>

      {/* ── 휴대폰·태블릿: 아래 탭 5개 ── */}
      <nav aria-label="아래 메뉴" className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-card pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
        <ul className="grid h-16 grid-cols-5">
          {tabs.map((it) => {
            const on = tabActive(it.href);
            const Icon = it.icon;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={on ? "page" : undefined}
                  className={cn("press flex h-full flex-col items-center justify-center gap-1 text-[11px]", on ? "font-bold text-ink" : "font-medium text-sub hover:text-ink")}
                >
                  <Icon aria-hidden className={cn("size-5", on && "text-brand")} strokeWidth={1.8} />
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
