import type { Database } from "./database.types";
import { createBrowserClient } from "@supabase/ssr";

/** 브라우저(클라이언트 부품)용 Supabase. 로그인한 사람의 권한으로 동작한다(RLS 적용) */
export function createClient() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
