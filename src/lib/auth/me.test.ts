import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/source", () => ({ isMockRequest: async () => true }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

const { displayableName } = await import("./me");

describe("사이드바 프로필 이름 (10/12)", () => {
  it("실제 이름은 그대로", () => {
    expect(displayableName("김하윤")).toBe("김하윤");
    expect(displayableName("  Jenny ")).toBe("Jenny");
  });
  it("괄호 안 내부 정보는 지운다 (10/12 v4)", () => {
    expect(displayableName("김하윤 (원장)")).toBe("김하윤");
    expect(displayableName("Jenny(t1)")).toBe("Jenny");
    expect(displayableName("총괄관리자 (admin)")).toBeNull();
    expect(displayableName("(관리용)")).toBeNull();
  });
  it("내부 이름·빈 값은 숨긴다 → 화면은 원장님·선생님", () => {
    expect(displayableName("총괄관리자")).toBeNull();
    expect(displayableName("관리자")).toBeNull();
    expect(displayableName("")).toBeNull();
    expect(displayableName(null)).toBeNull();
  });
});
