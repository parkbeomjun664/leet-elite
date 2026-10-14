"use client";

import {
  BriefcaseBusiness,
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
import { PageTransition } from "@/components/page-transition";
import { ProfileMenu } from "@/components/profile-menu";
import { SubNav } from "@/components/top-bar";
import { cn } from "@/lib/cn";
import { activeItem, isActive, type NavItem } from "@/lib/nav";

// 원장님·선생님 화면 틀 (10/12: 원장님 사이드바 확정 → 같은 날 선생님 화면도 같은 틀, decisions.md)
// PC(1024 이상) = 왼쪽 사이드바 220px. 오른쪽 경계 가운데 [‹‹] 버튼으로 아이콘만 남는 64px 막대로 접고 펼친다(이 컴퓨터에 기억)
//   맨 아래 = 프로필 카드(이니셜 아바타 · 이름 · 역할 · ⋯ → 내 정보 · 로그아웃). 접으면 아바타만
// 휴대폰·태블릿 = 얇은 머리줄(오른쪽 아바타 → 같은 메뉴) + 아래 탭 5개
// 하위 메뉴(재원생·휴퇴원생·보호자 등)는 사이드바에서 그 메뉴 아래에 펼친다. 사이드바를 접었거나 휴대폰이면 본문 맨 위 하위 메뉴 줄로
// 본문에 data-tone="page"가 있으면(원장 홈) 바탕을 토스 스타일 회색으로 (design.md 1-2)

const ICON: Record<string, LucideIcon> = {
  홈: House,
  출결: CalendarCheck,
  숙제: NotebookPen,
  학생관리: Users,
  "담당 학생": Users,
  "반·선생님": School,
  보강: CalendarClock,
  메시지: MessageCircle,
  출퇴근: BriefcaseBusiness,
  더보기: Ellipsis,
};

export type ChromeTab = { label: string; href: string };

export function AppChrome({
  nav,
  role,
  userName,
  tabs,
  extraHomePaths = [],
  children,
}: {
  nav: NavItem[];
  role: "원장" | "선생님";
  userName: string | null;
  /** 휴대폰 아래 탭 (5개) */
  tabs: ChromeTab[];
  /** 아래 탭에서 홈으로 칠 다른 주소 (원장 홈의 처리할 일 목록 등) */
  extraHomePaths?: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = activeItem(nav, pathname);
  const home = nav[0].href;
  const collapseKey = role === "원장" ? "leet-admin-sidebar" : "leet-teacher-sidebar"; // "collapsed" 이면 접힘

  // 접힘 상태: 이 컴퓨터에만 기억 (저장소를 못 쓰면 펼친 채로)
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 저장된 값을 읽어 온다 (서버에서는 알 수 없음)
      if (localStorage.getItem(collapseKey) === "collapsed") setCollapsed(true);
    } catch {}
  }, [collapseKey]);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(collapseKey, c ? "open" : "collapsed");
      } catch {}
      return !c;
    });

  const tabActive = (href: string) => (href === home ? pathname === home || extraHomePaths.includes(pathname) : isActive(pathname, href));

  return (
    <div
      data-collapsed={collapsed}
      className="group/chrome min-h-dvh bg-card has-[[data-tone=page]]:bg-page lg:flex"
    >
      {/* ── PC: 왼쪽 사이드바 ── */}
      <aside
        aria-label={`${role === "원장" ? "원장님" : "선생님"} 메뉴`}
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-hairline bg-sidebar-glow transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out)] lg:flex",
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

        {/* 접기·펼치기: 사이드바 오른쪽 경계 세로 가운데에 걸친 네모 버튼 36px (10/12 범준님: 동그라미 28px은 너무 작다) */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
          title={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
          className="press absolute top-1/2 -right-[18px] z-40 grid size-9 -translate-y-1/2 place-items-center rounded-[var(--radius-button-sm)] border border-line bg-card text-sub shadow-[var(--shadow-chip)] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {collapsed ? <ChevronsRight aria-hidden className="size-5" /> : <ChevronsLeft aria-hidden className="size-5" />}
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
                      // 고른 메뉴 = 연회색 바탕 + 굵게 + 왼쪽 버건디 선 (선택 표시는 버건디, 10/9). 10/14 사이드바를 흰색으로 바꾸며 바탕을 page 회색으로
                      "press flex h-10 items-center gap-3 rounded-[var(--radius-control)] text-body transition-colors duration-[var(--duration-fast)]",
                      collapsed ? "justify-center" : "px-3",
                      on ? "bg-page font-semibold text-strong shadow-[inset_3px_0_0_var(--color-brand)]" : "text-base hover:bg-block hover:text-strong",
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
                                childOn ? "font-semibold text-brand" : "text-muted hover:bg-block hover:text-strong",
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

        {/* 프로필: 바깥 여백 12 + 화면 끝에서 16 + 안전 영역 */}
        <div className={cn("shrink-0 px-3 pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))]", collapsed && "flex justify-center px-0")}>
          <ProfileMenu name={userName} role={role} homeHref={home} variant={collapsed ? "avatar" : "card"} />
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
            <ProfileMenu name={userName} role={role} homeHref={home} variant="header" />
          </div>
        </header>

        <main className="pb-[calc(80px+env(safe-area-inset-bottom,0px))] lg:pb-0">
          {/* 하위 메뉴 줄: 휴대폰, 또는 사이드바를 접었을 때만 (펼친 사이드바에는 이미 있다) */}
          <div className="lg:hidden group-data-[collapsed=true]/chrome:lg:block">
            <SubNav nav={nav} />
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
            const Icon = ICON[it.label] ?? House;
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
