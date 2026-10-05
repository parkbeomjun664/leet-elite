"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getToast, subscribeToast } from "@/lib/toast";

/**
 * 토스트를 그리는 자리. 루트 레이아웃에 하나만 둔다
 * 아래 가운데, 휴대폰 화면에서는 하단 탭(64px) 위. 나타날 때 8px 올라오며(200ms)
 */
export function Toaster() {
  const item = useSyncExternalStore(subscribeToast, getToast, () => null);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4 md:bottom-8">
      {/* 화면 읽기 프로그램: 성공은 조용히(status), 실패는 바로(alert) */}
      <div role="status" aria-live="polite" className="sr-only">
        {item?.kind === "success" ? item.message : ""}
      </div>
      <div role="alert" className="sr-only">
        {item?.kind === "error" ? item.message : ""}
      </div>
      {item && (
        <div
          key={item.id}
          data-testid="toast"
          data-kind={item.kind}
          className="pointer-events-auto flex max-w-[420px] animate-toast-in items-center gap-2 rounded-[var(--radius-card)] bg-ink px-4 py-3 text-body text-white shadow-float"
        >
          {item.kind === "success" ? (
            <CircleCheck aria-hidden className="size-5 shrink-0 text-ok-on-dark" />
          ) : (
            <CircleAlert aria-hidden className="size-5 shrink-0 text-brand-on-dark" />
          )}
          <span>{item.message}</span>
        </div>
      )}
    </div>
  );
}
