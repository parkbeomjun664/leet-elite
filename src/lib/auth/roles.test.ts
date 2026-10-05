import { describe, expect, it } from "vitest";
import { routeFor, safeNext } from "./roles";

describe("화면 출입 규칙", () => {
  it("로그인 안 하면 /login으로, 보던 주소는 next로", () => {
    expect(routeFor("/", null)).toEqual({ redirect: "/login" });
    expect(routeFor("/teacher", null)).toEqual({ redirect: "/login?next=%2Fteacher" });
    expect(routeFor("/admin/students", null)).toEqual({ redirect: "/login?next=%2Fadmin%2Fstudents" });
    // 시연 시각 같은 주소 뒷부분도 남긴다
    expect(routeFor("/teacher", null, "?at=16:00")).toEqual({ redirect: "/login?next=%2Fteacher%3Fat%3D16%3A00" });
  });

  it("로그인 화면·디자인 미리보기는 로그인 없이 열린다", () => {
    expect(routeFor("/login", null)).toBeNull();
    expect(routeFor("/design-system", null)).toBeNull();
  });

  it("비슷한 이름의 주소는 공개로 보지 않는다", () => {
    expect(routeFor("/login-x", null)).toEqual({ redirect: "/login?next=%2Flogin-x" });
    expect(routeFor("/admins", "teacher")).toBeNull(); // 묶음 밖 (없는 화면 → 404)
  });

  it("로그인한 사람이 / 나 /login에 오면 자기 첫 화면", () => {
    expect(routeFor("/", "teacher")).toEqual({ redirect: "/teacher" });
    expect(routeFor("/login", "parent")).toEqual({ redirect: "/parent" });
  });

  it("역할별 화면 묶음", () => {
    expect(routeFor("/admin", "admin")).toBeNull();
    expect(routeFor("/admin", "teacher")).toEqual({ redirect: "/teacher" });
    expect(routeFor("/teacher", "admin")).toBeNull();
    expect(routeFor("/teacher/homework", "student")).toEqual({ redirect: "/student" });
    expect(routeFor("/student", "parent")).toEqual({ redirect: "/parent" });
    expect(routeFor("/parent", "student")).toEqual({ redirect: "/student" });
    expect(routeFor("/kiosk", "admin")).toBeNull();
    expect(routeFor("/kiosk", "teacher")).toEqual({ redirect: "/teacher" });
    expect(routeFor("/admin", "kiosk")).toEqual({ redirect: "/kiosk" });
  });

  it("비밀번호를 바꿔야 하는 계정은 바꾸는 화면에만 (AUTH-03)", () => {
    const must = { mustChangePassword: true };
    expect(routeFor("/teacher", "teacher", "", must)).toEqual({ redirect: "/account/password" });
    expect(routeFor("/", "student", "", must)).toEqual({ redirect: "/account/password" });
    expect(routeFor("/account/password", "student", "", must)).toBeNull();
    // 다 바꾼 뒤에는 그 화면도 그냥 열린다 (로그인한 누구나)
    expect(routeFor("/account/password", "parent")).toBeNull();
  });

  it("로그인 뒤 돌아갈 주소: 같은 사이트·그 역할이 열 수 있는 곳만", () => {
    expect(safeNext("/teacher?at=16:00", "teacher")).toBe("/teacher?at=16:00");
    expect(safeNext("/admin", "teacher")).toBe("/teacher");
    expect(safeNext("https://evil.example", "admin")).toBe("/admin");
    expect(safeNext("//evil.example", "admin")).toBe("/admin");
    expect(safeNext("/\\evil.example", "admin")).toBe("/admin");
    expect(safeNext(null, "student")).toBe("/student");
  });
});
