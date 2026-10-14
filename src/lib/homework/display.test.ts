import { describe, expect, it } from "vitest";
import { dueLabel, dueTone, targetSummary } from "./display";

describe("마감 표시", () => {
  it("지남·오늘·그 뒤", () => {
    expect(dueTone("2026-10-13", "2026-10-14")).toBe("past");
    expect(dueTone("2026-10-14", "2026-10-14")).toBe("today");
    expect(dueTone("2026-10-16", "2026-10-14")).toBe("later");
  });
  it("글자는 10/16(금)", () => {
    expect(dueLabel("2026-10-16")).toBe("10/16(금)");
    expect(dueLabel("2026-11-01")).toBe("11/1(일)");
  });
});

describe("대상 요약", () => {
  const classes = [
    { name: "초중", studentIds: ["a", "b", "c"] },
    { name: "초고", studentIds: ["d", "e"] },
  ];
  it("한 반 전부면 반이름 · n명 (순서 상관없이)", () => {
    expect(targetSummary(["c", "a", "b"], classes, "가나다")).toBe("초중 · 3명");
  });
  it("반 일부·여러 반에 걸치면 첫 학생 외 n명", () => {
    expect(targetSummary(["a", "b"], classes, "강민")).toBe("강민 외 1명");
    expect(targetSummary(["a", "b", "c", "d", "e"], classes, "강민")).toBe("강민 외 4명");
  });
  it("한 명이면 이름만, 없으면 대상 없음", () => {
    expect(targetSummary(["d"], classes, "도윤")).toBe("도윤");
    expect(targetSummary([], classes, "")).toBe("대상 없음");
  });
});
