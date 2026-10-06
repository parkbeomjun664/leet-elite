import { describe, expect, it } from "vitest";
import { normalizeLoginId, toLoginEmail } from "./login-id";

describe("로그인 아이디 (AUTH-02)", () => {
  it("휴대폰 번호는 하이픈·공백을 빼고 숫자만", () => {
    expect(normalizeLoginId(" 010-5550-1234 ")).toBe("01055501234");
    expect(normalizeLoginId("010 5550 1234")).toBe("01055501234");
  });
  it("원장님이 지정한 아이디는 소문자로", () => {
    expect(normalizeLoginId("Kim.Hayun")).toBe("kim.hayun");
  });
  it("쓸 수 없는 글자·너무 짧은 아이디는 null", () => {
    expect(normalizeLoginId("홍길동")).toBeNull();
    expect(normalizeLoginId("a@b")).toBeNull();
    expect(normalizeLoginId("a")).toBeNull();
    expect(normalizeLoginId("")).toBeNull();
  });
  it("내부 이메일", () => {
    expect(toLoginEmail("01055501234")).toBe("01055501234@login.leetenglish.kr");
  });
});

// 로그인 시도 제한(AUTH-10)은 DB 함수로 옮겼다(10/7). 검사는 supabase/tests/rls_check.sql

import { passwordProblem } from "./password-rule";

describe("새 비밀번호 규칙 (AUTH-03)", () => {
  it("6자 이상", () => {
    expect(passwordProblem("abc12", "s1")).toContain("6자");
    expect(passwordProblem("abc123", "s1")).toBeNull();
  });
  it("같은 글자 반복·아이디와 같은 비밀번호는 안 됨", () => {
    expect(passwordProblem("111111", "s1")).toContain("반복");
    expect(passwordProblem("01055501234", "01055501234")).toContain("아이디");
  });
});
