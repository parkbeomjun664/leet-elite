"use client";

// 학부모 화면의 자녀 선택 (HOME-10). 자녀가 여러 명일 때만 보인다.
// 주소의 ?child=<학생 ID>로 선택을 기억한다 (이름이 아니라 ID로 연결: 동명이인)

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export function ChildSwitcher({ items, selectedId }: { items: { id: string; name: string }[]; selectedId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (items.length < 2) return null;

  // 다른 주소 값(시연용 ?at= 등)은 그대로 두고 child만 바꾼다
  const hrefFor = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("child", id);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <nav aria-label="자녀 선택" className="grid gap-1 rounded-[var(--radius-card)] border border-line bg-card p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((child) => {
        const active = child.id === selectedId;
        return (
          <Link
            key={child.id}
            href={hrefFor(child.id)}
            replace
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center justify-center truncate rounded-[var(--radius-control)] px-3 text-[17px] transition-colors",
              active ? "bg-ink font-bold text-white" : "font-medium text-sub hover:bg-line-soft hover:text-ink",
            )}
          >
            {child.name}
          </Link>
        );
      })}
    </nav>
  );
}
