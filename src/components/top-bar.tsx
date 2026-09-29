"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeItem, isActive, type NavItem } from "@/lib/nav";

type Props = {
  nav: NavItem[];
  roleLabel: string; // "원장님", "선생님"
  userName: string;
};

// 에듀OK와 같은 3단 구조: 로고 줄 → 버건디 메뉴 바 → 하위 메뉴 줄
export function TopBar({ nav, roleLabel, userName }: Props) {
  const pathname = usePathname();
  const current = activeItem(nav, pathname);
  const home = nav[0];

  return (
    <header className="sticky top-0 z-30">
      {/* 1단: 로고 · 사용자 */}
      <div className="border-b border-line bg-card">
        <div className="mx-auto flex h-12 max-w-[1280px] items-center justify-between px-4">
          <Link href={home.href} className="flex items-center gap-2" aria-label="홈으로">
            {/* 로고 PNG는 위아래 여백이 커서 음수 여백으로 글자 줄과 맞춘다 */}
            <Image src="/brand/leet-logo.png" alt="" width={1414} height={2000} className="-my-1 h-9 w-auto mix-blend-multiply" />
            <span className="text-[17px] font-extrabold tracking-tight text-brand">LEET</span>
            <span className="text-[15px] font-semibold text-ink">영어학원</span>
            <span className="ml-1 hidden border-l border-line pl-2.5 text-sm text-sub sm:inline">리트 엘리트</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-sub sm:inline">
              <b className="font-semibold text-ink">{userName}</b> {roleLabel}
            </span>
            {/* TODO(2단계): Supabase 로그아웃 연결 */}
            <Link
              href="/login"
              className="flex h-8 items-center rounded-[var(--radius-control)] border border-line px-3 text-sub hover:border-ink/30 hover:text-ink"
            >
              로그아웃
            </Link>
          </div>
        </div>
      </div>

      {/* 2단: 큰 메뉴 (버건디 바) */}
      {/* PC: 에듀OK처럼 가운데 정렬 + 같은 칸 너비. 좁은 화면: 왼쪽부터 옆으로 밀어 보기 */}
      <nav aria-label="주 메뉴" className="bg-brand-dark">
        <ul className="mx-auto flex max-w-[1280px] overflow-x-auto md:justify-center">
          {nav.map((item) => {
            const active = current?.href === item.href;
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-12 items-center justify-center px-4 text-base font-semibold whitespace-nowrap transition-colors md:min-w-[128px] lg:min-w-[144px] ${
                    active ? "bg-brand text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 3단: 하위 메뉴 */}
      {current?.children && (
        <nav aria-label={`${current.label} 하위 메뉴`} className="border-b border-line bg-card">
          <ul className="mx-auto flex max-w-[1280px] overflow-x-auto md:justify-center">
            {current.children.map((child) => {
              const active = isActive(pathname, child.href, true);
              return (
                <li key={child.href} className="shrink-0">
                  <Link
                    href={child.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-11 items-center px-4 text-[15px] whitespace-nowrap ${
                      active ? "font-bold text-brand" : "text-sub hover:text-ink"
                    }`}
                  >
                    {child.label}
                    {active && <span className="absolute inset-x-4 bottom-0 h-0.5 bg-brand" />}
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
