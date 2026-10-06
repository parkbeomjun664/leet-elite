import type { Database } from "./database.types";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isRole, routeFor, type Role } from "@/lib/auth/roles";
import { KEEP_COOKIE, sessionCookieOptions } from "./cookies";

/**
 * 요청마다: 로그인 토큰을 확인·연장하고(쿠키 갱신), 역할에 맞지 않는 화면이면 돌려보낸다
 * 역할은 토큰의 app_metadata.role (사용자가 고칠 수 없는 칸). 실제 데이터 권한은 RLS가 따로 막는다
 */
export async function updateSession(request: NextRequest) {
  const keep = request.cookies.get(KEEP_COOKIE)?.value === "1";
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, sessionCookieOptions(options, keep)));
      },
    },
  });

  // getClaims: 토큰 서명을 확인하고, 만료됐으면 연장한다. 이 줄을 지우면 로그인이 이유 없이 풀릴 수 있다 (Supabase 안내)
  const { data } = await supabase.auth.getClaims();
  const roleClaim = data?.claims?.app_metadata?.role;
  const role: Role | null = data?.claims && isRole(roleClaim) ? roleClaim : null;

  const mustChangePassword = data?.claims?.app_metadata?.must_change_password === true;
  const route = routeFor(request.nextUrl.pathname, role, request.nextUrl.search, { mustChangePassword });
  if (!route) return response;

  const url = new URL(route.redirect, request.url);
  const redirect = NextResponse.redirect(url);
  // 연장한 로그인 쿠키를 돌려보내는 응답에도 실어 보낸다
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
