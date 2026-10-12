import { beforeEach, describe, expect, it, vi } from "vitest";

// 계정 발급 서버 함수의 문지기 (10/13): 원장님이 아니면 관리자 키 클라이언트를 만들기도 전에 거부한다
const state = vi.hoisted(() => ({
  claims: null as null | { sub: string; app_metadata?: { role?: string } },
  profile: null as null | { role: string; is_active: boolean },
  adminCalls: 0,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/source", () => ({ isMockRequest: async () => false }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: state.claims ? { claims: state.claims } : null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.profile }) }) }) }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    state.adminCalls++;
    throw new Error("시험: 관리자 키까지 오면 안 됨");
  },
}));

const { issueAccount, isActiveAdmin, LOGIN_ID_RULE } = await import("./issue");

beforeEach(() => {
  state.claims = null;
  state.profile = null;
  state.adminCalls = 0;
});

describe("계정 발급 권한 (STU-08)", () => {
  it("로그인 안 함 → 거부", async () => {
    expect(await isActiveAdmin()).toBe(false);
    expect(await issueAccount("student", "x", "01055501234")).toEqual({ ok: false, error: "계정을 발급할 권한이 없어요." });
    expect(state.adminCalls).toBe(0);
  });

  it("선생님·학생 → 거부", async () => {
    for (const role of ["teacher", "student", "parent", "kiosk"]) {
      state.claims = { sub: "u1", app_metadata: { role } };
      state.profile = { role, is_active: true };
      expect(await isActiveAdmin()).toBe(false);
      expect((await issueAccount("teacher", "x", "01055501234")).ok).toBe(false);
    }
    expect(state.adminCalls).toBe(0);
  });

  it("토큰은 원장님이어도 DB에서 사용 중지됐거나 역할이 바뀌었으면 거부", async () => {
    state.claims = { sub: "u1", app_metadata: { role: "admin" } };
    state.profile = { role: "admin", is_active: false };
    expect(await isActiveAdmin()).toBe(false);
    state.profile = { role: "teacher", is_active: true };
    expect(await isActiveAdmin()).toBe(false);
    state.profile = { role: "admin", is_active: true };
    expect(await isActiveAdmin()).toBe(true);
  });

  it("아이디가 규칙에 맞지 않으면 권한 확인 전에 칸 안내", async () => {
    expect(await issueAccount("student", "x", "조나윤")).toEqual({ ok: false, field: "loginId", error: LOGIN_ID_RULE });
    expect(await issueAccount("student", "x", "  ")).toMatchObject({ ok: false, field: "loginId" });
  });
});
