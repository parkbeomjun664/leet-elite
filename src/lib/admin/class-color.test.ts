import { describe, expect, it } from "vitest";
import { classShort, classTone } from "./class-color";

describe("반 색·약칭 (10/12 v4)", () => {
  it("반 정렬 순서로 6색을 돌려 쓴다", () => {
    expect(classTone(1).dot).toBe("bg-class-1-fg");
    expect(classTone(6).bg).toBe("bg-class-6-bg");
    expect(classTone(7)).toEqual(classTone(1));
    expect(classTone(undefined)).toEqual(classTone(1));
  });
  it("약칭: 괄호 안 → 하이픈 뒤 → 앞 3글자", () => {
    expect(classShort("OB-초중")).toBe("초중");
    expect(classShort("OB-초고")).toBe("초고");
    expect(classShort("중등(브릿지)")).toBe("브릿지");
    expect(classShort("고등-코어")).toBe("코어");
    expect(classShort("고등-마스터")).toBe("마스터");
    expect(classShort("초고")).toBe("초고");
  });
});
