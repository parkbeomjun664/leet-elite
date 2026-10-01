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

/**
 * useMedia와 같지만, 서버와 첫 화면(hydration)에서는 null(아직 모름)을 돌려준다.
 * PC에서 휴대폰용 창이 한 순간 떴다 사라지는 것을 막을 때 쓴다.
 */
export function useMediaReady(query: string): boolean | null {
  return useSyncExternalStore<boolean | null>(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}
