// 출결 키패드 "바로 처리" 규칙 테스트. 실행: npm test
import { describe, expect, it } from "vitest";
import { longerPrefixesOf, shouldSubmitNow } from "./kiosk";

describe("키패드 바로 처리", () => {
  const codes = new Set(["1004", "1002", "10024", "5121", "512199"]);
  const prefixes = longerPrefixesOf(codes);

  it("학생이 한 명만 정해지면 [확인] 없이 바로 처리 (1004)", () => {
    expect(shouldSubmitNow("1004", codes, prefixes)).toBe(true);
  });
  it("더 긴 번호의 앞자리면 기다린다 (1002 → 10024가 있음)", () => {
    expect(shouldSubmitNow("1002", codes, prefixes)).toBe(false);
    expect(shouldSubmitNow("10024", codes, prefixes)).toBe(true);
  });
  it("없는 번호는 처리하지 않고 더 누르기를 기다린다", () => {
    expect(shouldSubmitNow("1003", codes, prefixes)).toBe(false);
    expect(shouldSubmitNow("100", codes, prefixes)).toBe(false);
  });
  it("6자리가 차면 무조건 처리 (없는 번호면 '없는 번호' 안내로 넘어감)", () => {
    expect(shouldSubmitNow("512199", codes, prefixes)).toBe(true);
    expect(shouldSubmitNow("999999", codes, prefixes)).toBe(true);
  });
  it("앞자리 목록은 4자리부터만 만든다", () => {
    expect([...longerPrefixesOf(["512199"])]).toEqual(["5121", "51219"]);
  });
});
