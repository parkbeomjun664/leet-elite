import { describe, expect, it } from "vitest";
import { KEEP_MAX_AGE, sessionCookieOptions } from "./cookies";

describe("로그인 상태 유지 쿠키 (AUTH-06)", () => {
  const base = { path: "/", sameSite: "lax" as const, maxAge: 400 * 24 * 60 * 60 };

  it("체크 안 함: 기한 없는 쿠키(브라우저를 닫으면 사라짐)", () => {
    const o = sessionCookieOptions({ ...base, expires: new Date() }, false);
    expect(o.maxAge).toBeUndefined();
    expect(o.expires).toBeUndefined();
    expect(o.path).toBe("/");
  });

  it("체크함: 30일", () => {
    expect(sessionCookieOptions(base, true).maxAge).toBe(KEEP_MAX_AGE);
  });

  it("로그아웃으로 지우는 쿠키(maxAge 0)는 그대로", () => {
    expect(sessionCookieOptions({ ...base, maxAge: 0 }, false).maxAge).toBe(0);
    expect(sessionCookieOptions({ ...base, maxAge: 0 }, true).maxAge).toBe(0);
  });
});
