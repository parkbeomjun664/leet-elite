"use client";

import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/cn";

// 닫힘 움직임 시간 (globals.css --duration-fast와 같게)
const CLOSE_MS = 150;

const SheetCloseContext = createContext<() => void>(() => {});

/** 시트 안의 [취소] 같은 버튼이 닫힘 움직임을 거쳐 닫히게 할 때 쓴다 */
export function useSheetClose() {
  return useContext(SheetCloseContext);
}

/**
 * 옆에서 나오는 창 (PC: 오른쪽 패널 / 휴대폰: 화면 전체)
 * 학생 상세, 출결 입력처럼 목록을 보면서 한 명을 다룰 때 쓴다.
 * Esc 또는 바깥을 누르면 닫힌다. 열릴 때 오른쪽에서 밀려 들어오고(250ms), 닫힐 때 150ms 뒤 onClose를 부른다
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "md:w-[520px]",
  closeRef,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  /** 창 밖(footer 등)에서 닫힘 움직임을 거쳐 닫을 때: closeRef.current?.() */
  closeRef?: Ref<() => void>;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const requestClose = useCallback(() => {
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setClosing(false);
      onClose();
    }, CLOSE_MS);
  }, [onClose]);

  useImperativeHandle(closeRef, () => requestClose, [requestClose]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <SheetCloseContext.Provider value={requestClose}>
      <div className="fixed inset-0 z-40" data-state={closing ? "closing" : "open"}>
        <button
          type="button"
          aria-label="닫기"
          onClick={requestClose}
          className={cn(
            "absolute inset-0 bg-ink/30 animate-fade-in transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-in)]",
            closing && "opacity-0",
          )}
        />
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 right-0 flex w-full flex-col bg-card shadow-float outline-none animate-sheet-in transition-[opacity,translate] duration-[var(--duration-fast)] ease-[var(--ease-in)]",
            closing && "translate-x-6 opacity-0",
            width,
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b border-line-soft px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4">
            <div className="min-w-0">
              <h2 className="truncate text-heading font-bold">{title}</h2>
              {subtitle && <p className="mt-0.5 truncate text-caption text-sub">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="press grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-xl text-sub hover:bg-line-soft hover:text-ink"
              aria-label="닫기"
            >
              ×
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && (
            <footer className="border-t border-line-soft px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">{footer}</footer>
          )}
        </div>
      </div>
    </SheetCloseContext.Provider>
  );
}
