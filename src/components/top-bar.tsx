"use client";

import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ScrollRow } from "@/components/ui/scroll-row";
import { usePathname } from "next/navigation";
import { activeItem, isActive, type NavItem } from "@/lib/nav";

type Props = {
  nav: NavItem[];
  roleLabel: string; // "원장님", "선생님"
  userName: string;
};

// 흰 한 줄 메뉴: 로고 · 메뉴 · 사용자 (10/1: 버건디 메뉴 바 대신 가볍게)
// 선택된 메뉴는 검정 글씨 + 버건디 밑줄 (10/9 저녁: 브랜드 색을 선택 표시에, docs/design.md 1번)
// PC(lg 이상)는 한 줄, 좁은 화면은 메뉴를 둘째 줄에서 옆으로 밀어 본다. 하위 메뉴는 그 아래 줄
export function TopBar({ nav, roleLabel, userName }: Props) {
  const pathname = usePathname();
  const current = activeItem(nav, pathname);
  const home = nav[0];

  // 좁은 화면에서 옆으로 밀어 보는 메뉴: 스크롤바 숨김 + 오른쪽 끝 흰 페이드, 지금 메뉴가 밖이면 가운데로 (10/8 UI 5)
  const menu = (
    <ScrollRow activeKey={pathname} className="h-full">
      <ul className="flex h-full">
        {nav.map((item) => {
          const active = current?.href === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full items-center px-3.5 text-body whitespace-nowrap transition-colors duration-[var(--duration-fast)] ${
                  active ? "font-semibold text-ink" : "text-sub hover:text-ink"
                }`}
              >
                {item.label}
                {active && <span className="absolute inset-x-3.5 bottom-0 h-0.5 bg-brand" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </ScrollRow>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line-soft bg-card">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-4">
        <Link href={home.href} className="flex min-h-11 shrink-0 items-center gap-2" aria-label="홈으로">
          {/* 여백을 잘라 낸 투명 로고 (scripts/make-icons.mjs 로 생성) */}
          <Image src="/brand/leet-mark.png" alt="" width={407} height={512} className="h-7 w-auto" />
          <span className="text-[17px] font-extrabold tracking-tight text-brand">LEET</span>
          <span className="text-[15px] font-semibold text-ink">영어학원</span>
        </Link>
        <nav aria-label="주 메뉴" className="hidden h-full min-w-0 flex-1 lg:block">
          {menu}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3 text-body">
          <span className="hidden text-sub sm:inline">
            <b className="font-semibold text-ink">{userName}</b> {roleLabel}
          </span>
          <LogoutButton />
        </div>
      </div>

      {/* 좁은 화면: 메뉴 둘째 줄 */}
      <nav aria-label="주 메뉴" className="h-12 border-t border-line-soft px-1 lg:hidden">
        {menu}
      </nav>
    </header>
  );
}

/**
 * 하위 메뉴 줄 (예: 학생관리 → 재원생 · 휴·퇴원생 · 보호자). 레이아웃의 <main> 맨 위에 둔다 (10/8)
 * 헤더 안에 있으면 이 줄이 생기고 없어질 때마다 본문 전체가 45px 밀려(CLS) 보여서, 본문 칸 안으로 옮겼다
 * 스크롤해도 헤더 바로 아래에 붙어 있다 (헤더 높이: PC 65px, 좁은 화면 메뉴 둘째 줄까지 113px)
 */
export function SubNav({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  const current = activeItem(nav, pathname);
  if (!current?.children) return null;
  return (
    <nav aria-label={`${current.label} 하위 메뉴`} className="sticky top-[113px] z-20 border-b border-line-soft bg-card lg:top-[65px]">
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
