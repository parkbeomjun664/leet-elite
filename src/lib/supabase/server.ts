import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { KEEP_COOKIE, sessionCookieOptions } from "./cookies";

/**
 * 서버 화면·서버 함수용 Supabase. 로그인한 사람의 권한으로 동작한다(RLS 적용)
 * keep: 로그인할 때처럼 "상태 유지" 여부를 직접 정할 때만 넘긴다 (없으면 쿠키를 따른다)
 */
export async function createClient(opts?: { keep?: boolean }) {
  const cookieStore = await cookies();
  const keep = opts?.keep ?? cookieStore.get(KEEP_COOKIE)?.value === "1";
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, sessionCookieOptions(options, keep)));
        } catch {
          // 서버 화면(그리기 중)에서는 쿠키를 쓸 수 없다. 로그인 연장은 proxy가 맡으므로 무시한다
        }
      },
    },
  });
}
