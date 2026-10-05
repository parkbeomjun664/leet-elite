import { describe, expect, it } from "vitest";
import { afterFailure, ID_RULE, IP_RULE, isLocked, type Attempt } from "./lockout";
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

describe("로그인 시도 제한 (AUTH-10)", () => {
  const t0 = new Date("2026-10-06T10:00:00Z");
  const at = (min: number) => new Date(t0.getTime() + min * 60 * 1000);

  it("같은 아이디 5번 연속 틀리면 10분 잠금", () => {
    let a: Attempt | null = null;
    for (let i = 1; i <= 4; i++) {
      a = afterFailure(a, at(i), ID_RULE);
      expect(isLocked(a, at(i))).toBe(false);
    }
    a = afterFailure(a, at(5), ID_RULE);
    expect(a.fail_count).toBe(5);
    expect(isLocked(a, at(5))).toBe(true);
    expect(isLocked(a, at(14.9))).toBe(true);
    expect(isLocked(a, at(15.1))).toBe(false);
  });

  it("잠금이 끝난 뒤 틀리면 1부터 다시 센다", () => {
    let a: Attempt | null = null;
    for (let i = 1; i <= 5; i++) a = afterFailure(a, at(i), ID_RULE);
    a = afterFailure(a, at(20), ID_RULE);
    expect(a.fail_count).toBe(1);
    expect(isLocked(a, at(20))).toBe(false);
  });

  it("같은 IP: 10분 안에 20번이면 잠금, 10분이 지난 기록은 새로 센다", () => {
    let a: Attempt | null = null;
    for (let i = 0; i < 19; i++) a = afterFailure(a, at(i * 0.1), IP_RULE);
    expect(isLocked(a, at(2))).toBe(false);
    a = afterFailure(a, at(2), IP_RULE);
    expect(isLocked(a, at(2))).toBe(true);

    let b: Attempt | null = afterFailure(null, at(0), IP_RULE);
    b = afterFailure(b, at(11), IP_RULE);
    expect(b.fail_count).toBe(1);
  });
});

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
