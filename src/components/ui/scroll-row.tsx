"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 옆으로 밀어 보는 한 줄 (상단 메뉴, 반 알약 줄 등, 10/8 UI 5·6)
 * - 운영체제 스크롤바는 숨긴다 (밀어서·휠로 그대로 움직임)
 * - 오른쪽에 더 있을 때만 끝에 흰색 페이드 → 끝 글자가 "초:"처럼 잘려 보이지 않고 "더 있다"로 읽힌다
 * - 선택된 칸(aria-current="page" 또는 aria-pressed="true")이 화면 밖이면 가운데로 보이게 (activeKey가 바뀔 때)
 */
export function ScrollRow({
  children,
  activeKey,
  className,
  scrollClassName,
}: {
  children: ReactNode;
  /** 선택이 바뀌었음을 알리는 값 (주소, 고른 반 id 등) */
  activeKey?: string;
  className?: string;
  /** 스크롤 칸에 줄 클래스 (안쪽 여백 등) */
  scrollClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  // 오른쪽에 더 있는지: 스크롤·크기 바뀔 때마다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  // 선택된 칸이 밖에 있으면 가운데로
  useEffect(() => {
    const el = ref.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]');
    if (!el || !active) return;
    const box = el.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    if (r.left >= box.left && r.right <= box.right) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: el.scrollLeft + (r.left - box.left) - (box.width - r.width) / 2, behavior: reduce ? "auto" : "smooth" });
  }, [activeKey]);

  return (
    <div className={cn("relative min-w-0", className)}>
      <div ref={ref} className={cn("scrollbar-none h-full overflow-x-auto", scrollClassName)}>
        {children}
      </div>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent transition-opacity duration-[var(--duration-fast)]",
          more ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
