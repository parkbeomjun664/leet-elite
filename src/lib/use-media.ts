"use client";

import { useSyncExternalStore } from "react";

/**
 * 화면 너비 조건이 맞는지 알려 준다. 예: useMedia("(min-width: 1024px)") → PC면 true
 * 서버에서 그릴 때는 알 수 없으므로 false(휴대폰 기준)로 시작한다.
 */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
