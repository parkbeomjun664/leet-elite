import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16: middleware 대신 proxy. 모든 화면 요청 앞에서 로그인·역할을 확인한다
export async function proxy(request: NextRequest) {
  // 화면 흐름 테스트(가상 데이터)용: 개발 서버에서만, 이 값을 줄 때만 출입 통제를 끈다. 배포판(production)에서는 무시
  if (process.env.NODE_ENV !== "production" && process.env.LEET_E2E_NO_AUTH === "1") return NextResponse.next();
  return updateSession(request);
}

export const config = {
  // 정적 파일·이미지·아이콘·PWA 파일은 건너뛴다
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
