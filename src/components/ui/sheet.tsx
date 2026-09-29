"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 옆에서 나오는 창 (PC: 오른쪽 패널 / 휴대폰: 화면 전체)
 * 학생 상세, 출결 입력처럼 목록을 보면서 한 명을 다룰 때 쓴다.
 * Esc 또는 바깥을 누르면 닫힌다.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "md:w-[520px]",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/30" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-card shadow-[-8px_0_24px_rgba(40,20,20,0.12)] outline-none",
          width,
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[15px] text-sub">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-xl text-sub hover:bg-line-soft hover:text-ink"
            aria-label="닫기"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <footer className="border-t border-line px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">{footer}</footer>
        )}
      </div>
    </div>
  );
}
