import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password-rule";
import { makeTempPassword, TEMP_PASSWORD_LENGTH } from "./temp-password";

describe("임시 비밀번호 (AUTH-03·04)", () => {
  const many = Array.from({ length: 300 }, makeTempPassword);

  it("영문 소문자+숫자 8자, 영문·숫자가 하나씩은 있다", () => {
    for (const pw of many) {
      expect(pw).toHaveLength(TEMP_PASSWORD_LENGTH);
      expect(pw).toMatch(/^[a-z0-9]+$/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
    }
  });

  it("헷갈리는 글자(0·o·1·l·i)는 쓰지 않는다", () => {
    for (const pw of many) expect(pw).not.toMatch(/[0o1li]/);
  });

  it("비밀번호 규칙을 통과한다", () => {
    for (const pw of many) expect(passwordProblem(pw, "01055501234")).toBeNull();
  });

  it("매번 다르다", () => {
    expect(new Set(many).size).toBe(many.length);
  });
});
