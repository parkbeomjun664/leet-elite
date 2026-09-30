"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 필터 줄: 왼쪽 이름표 + 탭들 (에듀OK의 반·상태 선택 줄) */
export function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    // 탭이 여러 줄로 넘어가도 이름표는 첫 줄에 맞춘다
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center text-sm font-semibold text-sub">{label}</span>
      {/* 휴대폰: 한 줄로 옆으로 밀어 보기 / 태블릿 이상: 여러 줄로 */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:flex-wrap [&>*]:shrink-0">{children}</div>
    </div>
  );
}

/** 탭 하나. 선택되면 진한 배경 */
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
        "h-9 rounded-[var(--radius-control)] px-3 text-[15px] transition-colors",
        active ? "bg-ink font-semibold text-white" : "text-ink/80 hover:bg-line-soft",
      )}
    >
      {children}
      {count !== undefined && <span className="ml-1 text-sm opacity-70 tabular">{count}</span>}
    </button>
  );
}

/** 화면 안의 탭 (예: 학생 상세의 수업·숙제·메시지). 아래 밑줄 방식 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div role="tablist" className="flex border-b border-line">
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
              "relative h-11 px-4 text-[15px] whitespace-nowrap",
              active ? "font-bold text-brand" : "text-sub hover:text-ink",
            )}
          >
            {it.label}
            {it.count !== undefined && <span className="ml-1 text-sm tabular opacity-80">{it.count}</span>}
            {active && <span className="absolute inset-x-3 bottom-[-1px] h-0.5 bg-brand" />}
          </button>
        );
      })}
    </div>
  );
}
