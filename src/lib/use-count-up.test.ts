import { describe, expect, it } from "vitest";
import { countUpAt } from "./use-count-up";

describe("숫자 카운트업 (10/12)", () => {
  it("처음과 끝은 정확히 이전 값·새 값", () => {
    expect(countUpAt(3, 11, 0)).toBe(3);
    expect(countUpAt(3, 11, 1)).toBe(11);
  });
  it("중간은 그 사이 정수, 앞쪽이 빠르다(ease-out)", () => {
    const mid = countUpAt(0, 100, 0.5);
    expect(mid).toBeGreaterThan(50);
    expect(mid).toBeLessThan(100);
    expect(Number.isInteger(countUpAt(0, 7, 0.3))).toBe(true);
  });
  it("줄어드는 숫자도, 범위를 넘는 t도", () => {
    expect(countUpAt(10, 4, 1)).toBe(4);
    expect(countUpAt(10, 4, 2)).toBe(4);
    expect(countUpAt(10, 4, -1)).toBe(10);
  });
});
