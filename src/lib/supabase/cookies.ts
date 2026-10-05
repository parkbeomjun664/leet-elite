import type { CookieOptions } from "@supabase/ssr";

// 로그인 상태 유지 (AUTH-06). 체크하면 이 표시 쿠키를 30일 남기고, 로그인 쿠키도 30일 간다.
// 체크하지 않으면 로그인 쿠키에서 기한을 빼서 "브라우저를 닫으면 사라지는 쿠키"로 만든다 (공용 PC·태블릿)
export const KEEP_COOKIE = "leet-keep";
export const KEEP_MAX_AGE = 60 * 60 * 24 * 30;

export function sessionCookieOptions(options: CookieOptions, keep: boolean): CookieOptions {
  // 지우는 쿠키(maxAge 0)는 그대로 둔다
  if (options.maxAge === 0) return options;
  if (keep) return { ...options, maxAge: KEEP_MAX_AGE };
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
