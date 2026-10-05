import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// 화면 흐름 테스트(가상 데이터)용 통과 표시. 개발 서버에서 LEET_E2E=1일 때, 이 머리글이 달린 요청만 출입 통제를 건너뛴다
// 배포판(production)에서는 무시한다. 로그인 흐름 테스트(e2e/auth.spec.ts)는 이 머리글 없이 실제로 로그인한다
export const E2E_BYPASS_HEADER = "x-leet-e2e-no-auth";

// Next 16: middleware 대신 proxy. 모든 화면 요청 앞에서 로그인·역할을 확인한다
export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production" && process.env.LEET_E2E === "1" && request.headers.get(E2E_BYPASS_HEADER) === "1") {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  // 정적 파일·이미지·아이콘·PWA 파일은 건너뛴다
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
