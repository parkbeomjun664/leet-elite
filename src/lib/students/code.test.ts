import { describe, expect, it } from "vitest";
import { phoneLast4, suggestCode } from "./code";

describe("출결 번호 추천", () => {
  it("휴대폰 뒷 4자리를 먼저 (하이픈 상관없이)", () => {
    expect(phoneLast4("010-5550-1234")).toBe("1234");
    expect(phoneLast4("01055501234")).toBe("1234");
    expect(phoneLast4("")).toBeNull();
    expect(suggestCode("010-5550-1234", new Set(["1001"]))).toBe("1234");
  });
  it("뒷자리가 이미 쓰이면 1001부터 비어 있는 첫 번호", () => {
    expect(suggestCode("010-5550-1234", new Set(["1234", "1001", "1002"]))).toBe("1003");
  });
  it("휴대폰이 없으면 1001부터", () => {
    expect(suggestCode(null, new Set())).toBe("1001");
  });
});
