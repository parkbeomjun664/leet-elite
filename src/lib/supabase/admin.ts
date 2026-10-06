import type { Database } from "./database.types";
import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * 관리자 키(비밀 키)로 동작하는 Supabase. RLS를 건너뛰므로 서버에서만, 꼭 필요한 곳에만 쓴다
 * (로그인 시도 기록, 계정 만들기·비밀번호 재설정). 브라우저로 가는 코드에서 부르면 빌드가 막힌다(server-only)
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY가 없습니다 (.env.local 또는 Vercel 환경변수)");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
