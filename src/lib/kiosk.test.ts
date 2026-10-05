// 출결 키패드 규칙 테스트 (10/5: 4자리 고정, 다 차면 바로 처리). 실행: npm test
import { describe, expect, it } from "vitest";
import { isKioskCode, KIOSK_CODE_LEN, shouldSubmitNow } from "./kiosk";
import { students } from "./mock/data";

describe("키패드 바로 처리", () => {
  it("4칸이 다 차면 바로 처리 (있는 번호든 없는 번호든)", () => {
    expect(shouldSubmitNow("1234")).toBe(true);
    expect(shouldSubmitNow("9999")).toBe(true);
  });
  it("4칸이 차기 전에는 기다린다", () => {
    expect(shouldSubmitNow("")).toBe(false);
    expect(shouldSubmitNow("123")).toBe(false);
  });
  it("출결 번호는 숫자 4자리만", () => {
    expect(KIOSK_CODE_LEN).toBe(4);
    expect(isKioskCode("1234")).toBe(true);
    expect(isKioskCode("123")).toBe(false);
    expect(isKioskCode("10024")).toBe(false);
    expect(isKioskCode("12a4")).toBe(false);
  });
});

describe("가상 데이터의 출결 번호", () => {
  it("모두 4자리이고 서로 겹치지 않는다", () => {
    const codes = students.map((s) => s.attendanceCode);
    expect(codes.every(isKioskCode)).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
