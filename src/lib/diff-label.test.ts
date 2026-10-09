import { describe, expect, it } from "vitest";
import { diffLabel } from "./diff-label";

describe("어제와 비교 한 줄", () => {
  it("늘면 +, 줄면 -, 같으면 같음", () => {
    expect(diffLabel(3, 2)).toBe("어제보다 +1");
    expect(diffLabel(1, 3)).toBe("어제보다 -2");
    expect(diffLabel(4, 4)).toBe("어제와 같음");
  });
  it("어제 숫자가 없으면 보여 주지 않는다", () => {
    expect(diffLabel(3, undefined)).toBeNull();
    expect(diffLabel(3, null)).toBeNull();
  });
});
