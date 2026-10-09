"use client";

import { CalendarCheck, CalendarClock, Ellipsis, House, MessageCircle, NotebookPen, School, Users, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";
import { PageTransition } from "@/components/page-transition";
import { SubNav, TopBar } from "@/components/top-bar";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";

// 원장님 화면 틀. 기존 화면 = 상단 메뉴, 새 홈(/admin/home-v2, 10/9 비교용) = PC 왼쪽 사이드바 · 휴대폰 아래 탭
// 새 홈 구조가 확정되면 다른 원장님 화면도 사이드바로 옮길지 정한다 (decisions.md "홈 구조 변경 이유")

export const HOME_V2 = "/admin/home-v2";

type SideItem = { label: string; href: string; icon: LucideIcon };

// 사이드바 메뉴 7개 (홈은 새 홈)
const SIDE: SideItem[] = [
  { label: "홈", href: HOME_V2, icon: House },
  { label: "출결", href: "/admin/attendance", icon: CalendarCheck },
  { label: "숙제", href: "/admin/homework", icon: NotebookPen },
  { label: "학생", href: "/admin/students", icon: Users },
  { label: "반", href: "/admin/classes", icon: School },
  { label: "보강", href: "/admin/makeups", icon: CalendarClock },
  { label: "메시지", href: "/admin/messages", icon: MessageCircle },
];

// 휴대폰 아래 탭 5개: 홈·출결·숙제·메시지·더보기
const TABS: SideItem[] = [SIDE[0], SIDE[1], SIDE[2], SIDE[6], { label: "더보기", href: `${HOME_V2}/more`, icon: Ellipsis }];

export function AdminChrome({ nav, userName, children }: { nav: NavItem[]; userName: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => (href === HOME_V2 ? pathname === href || pathname === `${HOME_V2}/todo` : pathname.startsWith(href));

  if (!pathname.startsWith(HOME_V2)) {
    // 기존 화면: 흰 바탕, 상단 메뉴 + 하위 메뉴 줄 (10/7·10/8)
    return (
      <div className="min-h-dvh bg-card">
        <TopBar nav={nav} roleLabel="원장님" userName={userName} />
        {/* 하위 메뉴 줄은 본문 칸 맨 위에, 여백 칸은 주소마다 새로 (메뉴 이동 중 화면 밀림 0, 10/8) */}
        <main>
          <SubNav nav={nav} />
          <PageTransition className="mx-auto max-w-[1280px] px-4 py-6">{children}</PageTransition>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-card lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* ── PC(1024 이상): 왼쪽 사이드바 220px. 위 로고 · 메뉴 · 아래 사용자 ── */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line-soft bg-bg lg:flex">
        <Link href={HOME_V2} className="flex h-16 shrink-0 items-center gap-2 px-5" aria-label="홈으로">
          <Image src="/brand/leet-mark.png" alt="" width={407} height={512} className="h-7 w-auto" />
          <span className="text-[17px] font-extrabold tracking-tight text-brand">LEET</span>
          <span className="text-[15px] font-semibold text-ink">영어학원</span>
        </Link>
        <nav aria-label="주 메뉴" className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-0.5">
            {SIDE.map((it) => {
              const on = active(it.href);
              const Icon = it.icon;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      // 고른 메뉴 = 흰 바탕 + 왼쪽 버건디 선 (선택 표시는 버건디, 10/9 저녁)
                      "press flex h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-body transition-colors duration-[var(--duration-fast)]",
                      on ? "bg-card font-semibold text-ink shadow-[inset_3px_0_0_var(--color-brand)]" : "text-sub hover:bg-line-soft hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-[18px]" strokeWidth={1.8} />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line-soft px-5 py-4 text-body">
          <span className="min-w-0 leading-tight">
            <b className="block truncate font-semibold text-ink">{userName}</b>
            <span className="text-caption text-sub">원장님</span>
          </span>
          <LogoutButton className="shrink-0 text-caption" />
        </div>
      </aside>

      {/* ── 휴대폰·태블릿(1024 미만): 얇은 머리줄 + 아래 탭 5개 ── */}
      <header className="sticky top-0 z-30 border-b border-line-soft bg-card pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Link href={HOME_V2} className="flex min-h-11 items-center gap-1.5" aria-label="홈으로">
            <Image src="/brand/leet-mark.png" alt="" width={407} height={512} className="h-7 w-auto" />
            <span className="text-[17px] font-extrabold tracking-tight text-brand">LEET</span>
            <span className="text-body font-semibold text-ink">영어학원</span>
          </Link>
          <LogoutButton className="shrink-0 text-caption" />
        </div>
      </header>

      <main className="min-w-0 pb-[calc(80px+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <PageTransition className="mx-auto max-w-[1280px] px-4 py-6 lg:px-8">{children}</PageTransition>
      </main>

      <nav aria-label="아래 메뉴" className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-card pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
        <ul className="grid h-16 grid-cols-5">
          {TABS.map((it) => {
            const on = active(it.href);
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
