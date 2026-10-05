import { describe, expect, it } from "vitest";
import { timeSelectOptions } from "./date";

describe("24시간제 시간 고르기 (timeSelectOptions)", () => {
  it("시는 00~23, 분은 1분 간격이면 00~59", () => {
    const { hours, minutes } = timeSelectOptions("14:30");
    expect(hours).toHaveLength(24);
    expect(hours[0]).toBe("00");
    expect(hours[23]).toBe("23");
    expect(minutes).toHaveLength(60);
  });

  it("5분 간격이면 00, 05 … 55", () => {
    const { minutes } = timeSelectOptions("14:30", 5);
    expect(minutes).toEqual(["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"]);
  });

  it("지금 값이 간격에 맞지 않으면 그 분도 순서대로 넣는다 (기존 기록 14:57을 잃지 않게)", () => {
    const { minutes } = timeSelectOptions("14:57", 5);
    expect(minutes).toContain("57");
    expect(minutes.indexOf("57")).toBe(minutes.indexOf("55") + 1);
  });
});
