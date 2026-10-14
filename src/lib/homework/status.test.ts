import { describe, expect, it } from "vitest";
import { statusDate } from "./status";

describe("매일 숙제 제출 현황 기준 날짜", () => {
  it("기간 안이면 오늘, 끝났으면 마지막 날, 시작 전이면 첫날", () => {
    expect(statusDate("2026-10-10", "2026-10-20", "2026-10-14")).toBe("2026-10-14");
    expect(statusDate("2026-10-01", "2026-10-07", "2026-10-14")).toBe("2026-10-07");
    expect(statusDate("2026-10-20", "2026-10-25", "2026-10-14")).toBe("2026-10-20");
  });
});
