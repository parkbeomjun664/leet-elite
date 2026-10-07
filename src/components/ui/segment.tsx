"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// 탭은 두 종류만 (docs/design.md 4번)
// - 알약 Segment: 같은 화면 거르기 (반 거르기, 대화방 전환)
// - 밑줄 Tabs: 화면을 바꾸는 것 (하위 메뉴, 자녀 전환)

/** 필터 줄: 왼쪽 이름표 + 알약들 (에듀OK의 반·상태 선택 줄) */
export function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    // 알약이 여러 줄로 넘어가도 이름표는 첫 줄에 맞춘다
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center text-caption font-semibold text-sub">{label}</span>
      {/* 휴대폰: 한 줄로 옆으로 밀어 보기 / 태블릿 이상: 여러 줄로 */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:flex-wrap [&>*]:shrink-0">{children}</div>
    </div>
  );
}

/** 알약 하나. 선택되면 진한 바탕 */
export function Segment({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press h-11 rounded-[var(--radius-control)] px-3 text-body md:h-9", // 휴대폰은 손가락 44px
        active ? "bg-ink font-semibold text-white" : "text-ink hover:bg-bg",
      )}
    >
      {children}
      {count !== undefined && <span className="ml-1 text-caption tabular opacity-70">{count}</span>}
    </button>
  );
}

/**
 * 밑줄 탭. 선택이 바뀌면 밑줄이 새 자리로 미끄러져 간다 (200ms, 크기·위치만 움직임)
 * 밑줄은 1px 폭 막대를 translateX + scaleX로 늘려서 그린다 (폭을 직접 바꾸면 저가 기기에서 끊김)
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
  /** 화면 읽기용 이름 */
  label?: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (el) setBar({ x: el.offsetLeft + 12, w: Math.max(el.offsetWidth - 24, 0) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, items.length]);

  return (
    <div ref={list} role="tablist" aria-label={label} className="relative flex border-b border-line">
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={cn(
              "h-11 px-4 text-body whitespace-nowrap transition-colors duration-[var(--duration-fast)]",
              active ? "font-semibold text-ink" : "text-sub hover:text-ink",
            )}
          >
            {it.label}
            {it.count !== undefined && <span className="ml-1 text-caption tabular opacity-80">{it.count}</span>}
          </button>
        );
      })}
      {bar && (
        <span
          aria-hidden
          className="absolute bottom-[-1px] left-0 h-0.5 w-px origin-left bg-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)]"
          style={{ transform: `translateX(${bar.x}px) scaleX(${bar.w})` }}
        />
      )}
    </div>
  );
}

/**
 * 켜고 끄는 알약 (여러 개 고르기: 반 소속, 사용 프로그램). 켜지면 검정 + ✓
 * 거르기 알약(Segment)과 달리 하나만 고르는 것이 아니라 각각 켜고 끈다 (aria-pressed)
 */
export function ToggleChip({ on, onToggle, children, disabled }: { on: boolean; onToggle: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "press h-11 rounded-[var(--radius-control)] px-3 text-body disabled:cursor-not-allowed disabled:opacity-60 md:h-9", // 휴대폰은 손가락 44px
        on ? "bg-ink font-semibold text-white" : "bg-line-soft text-ink enabled:hover:bg-line",
      )}
    >
      {on && <span aria-hidden>✓ </span>}
      {children}
    </button>
  );
}
