import "server-only";
import { isMockRequest } from "@/lib/data/source";
import { createClient } from "@/lib/supabase/server";

// 사이드바 프로필에 보일 내 이름 (10/12): profiles.display_name
// "총괄관리자"처럼 계정을 만들 때 붙인 내부 이름이면 보이지 않는다 → 화면은 "원장님"·"선생님"으로 대신
const INTERNAL_NAMES = /^(총괄)?관리자$|^admin$/i;

/** 사람에게 보여 줄 이름만 남긴다 (빈 값·내부 이름이면 null) */
export function displayableName(name: string | null | undefined): string | null {
  const n = name?.trim();
  if (!n || INTERNAL_NAMES.test(n)) return null;
  return n;
}

/** 로그인한 사람의 이름. 시험 모드(가상 데이터)·로그인 전·읽기 실패면 null */
export async function myDisplayName(): Promise<string | null> {
  if (await isMockRequest()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  // 내 계정 줄은 RLS(own_profile)로 읽힌다
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
  return displayableName(profile?.display_name);
}
