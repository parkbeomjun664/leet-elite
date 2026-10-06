"use client";

import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { usePathname } from "next/navigation";
import { activeItem, isActive, type NavItem } from "@/lib/nav";

type Props = {
  nav: NavItem[];
  roleLabel: string; // "원장님", "선생님"
  userName: string;
};

// 흰 한 줄 메뉴: 로고 · 메뉴 · 사용자 (10/1: 버건디 메뉴 바 대신 가볍게)
// 선택된 메뉴는 검정 글씨 + 검정 밑줄 (10/5 디자인 시스템: 빨강은 로고·주 버튼에만)
// PC(lg 이상)는 한 줄, 좁은 화면은 메뉴를 둘째 줄에서 옆으로 밀어 본다. 하위 메뉴는 그 아래 줄
export function TopBar({ nav, roleLabel, userName }: Props) {
  const pathname = usePathname();
  const current = activeItem(nav, pathname);
  const home = nav[0];

  const menu = (
    <ul className="flex h-full overflow-x-auto">
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
              {active && <span className="absolute inset-x-3.5 bottom-0 h-0.5 bg-ink" />}
            </Link>
          </li>
        );
      })}
    </ul>
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

      {/* 하위 메뉴 (예: 학생관리 → 재원생 · 휴·퇴원생) */}
      {current?.children && (
        <nav aria-label={`${current.label} 하위 메뉴`} className="border-t border-line-soft bg-card">
          <ul className="mx-auto flex max-w-[1280px] overflow-x-auto px-1">
            {current.children.map((child) => {
              const active = isActive(pathname, child.href, true);
              return (
                <li key={child.href} className="shrink-0">
                  <Link
                    href={child.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-11 items-center px-4 text-body whitespace-nowrap ${
                      active ? "font-semibold text-ink" : "text-sub hover:text-ink"
                    }`}
                  >
                    {child.label}
                    {active && <span className="absolute inset-x-4 bottom-0 h-0.5 bg-ink" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
