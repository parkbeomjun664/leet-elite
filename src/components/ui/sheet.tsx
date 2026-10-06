"use client";

import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState, type PointerEvent, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/cn";

// 닫힘 움직임 시간 (globals.css --duration-fast와 같게)
const CLOSE_MS = 150;
// 하단 시트를 이만큼(px) 끌어 내리거나, 빠르게(px/ms) 내리면 닫는다
const DRAG_CLOSE_PX = 96;
const DRAG_CLOSE_SPEED = 0.6;

const SheetCloseContext = createContext<() => void>(() => {});

/** 시트 안의 [취소] 같은 버튼이 닫힘 움직임을 거쳐 닫히게 할 때 쓴다 */
export function useSheetClose() {
  return useContext(SheetCloseContext);
}

/**
 * 목록을 보면서 한 명을 다루는 창 (학생 상세, 출결 입력, 학생 정보 수정)
 * - 768px 이상: 오른쪽에서 밀려 들어오는 패널
 * - 768px 미만(휴대폰): 아래에서 올라오는 하단 시트. 손잡이·제목 줄을 아래로 끌면 닫힌다 (docs/design.md 8번)
 * Esc 또는 바깥을 누르면 닫힌다. 열림 250ms, 닫힘 150ms 뒤 onClose를 부른다
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
  // 끌기: 시작 위치·시각. 끄는 동안은 다시 그리지 않고 style만 바꾼다 (저가 기기에서 끊기지 않게)
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);

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

  // 하단 시트일 때만 끌기 (PC 오른쪽 패널에서는 무시)
  const isBottomSheet = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767.98px)").matches;
  const onDragStart = (e: PointerEvent<HTMLElement>) => {
    if (!isBottomSheet() || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  };
  const onDragMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || !panel.current) return;
    // 위로는 거의 안 움직이고(저항), 아래로는 손가락을 따라간다
    d.dy = e.clientY - d.y;
    const y = d.dy > 0 ? d.dy : d.dy / 6;
    panel.current.style.translate = `0 ${y}px`;
  };
  const onDragEnd = () => {
    const d = drag.current;
    drag.current = null;
    const el = panel.current;
    if (!d || !el) return;
    el.style.transition = "";
    const speed = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > DRAG_CLOSE_PX || (d.dy > 24 && speed > DRAG_CLOSE_SPEED)) {
      // 지금 끌린 자리에서 아래로 빠지며 닫힌다
      el.style.translate = "";
      requestClose();
    } else {
      el.style.translate = ""; // 제자리로 (transition으로 돌아감)
    }
  };

  if (!open) return null;

  const dragProps = { onPointerDown: onDragStart, onPointerMove: onDragMove, onPointerUp: onDragEnd, onPointerCancel: onDragEnd };

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
          data-sheet
          className={cn(
            "absolute flex flex-col bg-card shadow-float outline-none transition-[opacity,translate] duration-[var(--duration-fast)] ease-[var(--ease-in)]",
            // 휴대폰: 하단 시트 (화면 92%까지, 위 모서리 12)
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[var(--radius-mcard)] animate-sheet-up",
            // 768 이상: 오른쪽 패널
            "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-full md:rounded-none md:animate-sheet-in",
            closing && "translate-y-full md:translate-x-6 md:translate-y-0 md:opacity-0",
            width,
          )}
        >
          {/* 손잡이: 하단 시트에서만 보이고, 끌어서 닫는다 */}
          <div {...dragProps} className="flex touch-none justify-center pt-2 pb-1 md:hidden" aria-hidden>
            <span className="h-1 w-9 rounded-full bg-line" />
          </div>
          <header
            {...dragProps}
            className="flex touch-none items-start justify-between gap-3 border-b border-line-soft px-5 pt-1 pb-4 md:touch-auto md:pt-[calc(1rem+env(safe-area-inset-top,0px))]"
          >
            <div className="min-w-0">
              <h2 className="truncate text-heading font-bold">{title}</h2>
              {subtitle && <p className="mt-0.5 truncate text-caption text-sub">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="press grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-xl text-sub hover:bg-line-soft hover:text-ink md:size-9"
              aria-label="닫기"
            >
              ×
            </button>
          </header>
          <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", !footer && "pb-[env(safe-area-inset-bottom,0px)]")}>{children}</div>
          {footer && (
            <footer className="border-t border-line-soft px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">{footer}</footer>
          )}
        </div>
      </div>
    </SheetCloseContext.Provider>
  );
}
