import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 이 요청을 가상 데이터로 그릴지 (화면 흐름 테스트·스크린샷 비교용)
 * - 개발 서버를 LEET_E2E=1로 켰고(시험 모드), 로그인하지 않은 요청일 때만 true
 *   (시험 모드에서는 출입 통제를 건너뛴 요청이 로그인 없이 들어온다 → src/proxy.ts)
 * - 배포판(production)에서는 항상 false: 실제 DB만 쓴다
 */
export async function isMockRequest(): Promise<boolean> {
  if (process.env.NODE_ENV === "production" || process.env.LEET_E2E !== "1") return false;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return !data?.claims;
}
