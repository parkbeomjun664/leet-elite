import "server-only";
import type { AccountInfo } from "@/components/accounts/account-issuer";
import { classes as mockClasses, teachers as mockTeachers } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import { isMockRequest } from "./source";

/** 원장님 선생님 화면의 한 줄 (TCH-01, 10/13은 계정 발급까지만) */
export type AdminTeacher = {
  id: string;
  realName: string;
  nickname: string;
  active: boolean;
  /** 담당 반 이름 (보기만. 담당 지정은 반 관리에서, 10/26) */
  classNames: string[];
  account: AccountInfo | null;
};

/**
 * 선생님 목록. 로그인한 사람의 권한으로 읽는다 (RLS: 원장님만 전체, 실명은 원장님만)
 * 시험 모드(로그인 없음)에서는 가상 데이터. 계정은 없는 것으로
 */
export async function loadAdminTeachers(): Promise<AdminTeacher[]> {
  if (await isMockRequest()) {
    return mockTeachers.map((t) => ({
      id: t.id,
      realName: t.realName,
      nickname: t.nickname,
      active: true,
      classNames: mockClasses.filter((c) => c.teacherId === t.id).sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.name),
      account: null,
    }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select("id, real_name, nickname, is_active, profiles ( login_id, is_active ), classes ( name, is_active, sort_order )")
    .order("is_active", { ascending: false })
    .order("real_name");
  if (error) throw new Error(`선생님을 불러오지 못함: ${error.message}`);
  return data.map((t) => ({
    id: t.id,
    realName: t.real_name,
    nickname: t.nickname,
    active: t.is_active,
    classNames: t.classes
      .filter((c) => c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => c.name),
    account: t.profiles ? { loginId: t.profiles.login_id, active: t.profiles.is_active } : null,
  }));
}
