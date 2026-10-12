import { describe, expect, it } from "vitest";
import { classStartsToday, isHomeworkDue } from "./homework-due";

describe("숙제 미제출 표시 시각 (10/12)", () => {
  it("반의 오늘 시작 시각은 학생들 중 가장 이른 시각", () => {
    const m = classStartsToday([
      { classId: "c1", start: "15:10" },
      { classId: "c1", start: "14:30" },
      { classId: "c2", start: "19:30" },
    ]);
    expect(m.get("c1")).toBe("14:30");
    expect(m.get("c2")).toBe("19:30");
    expect(m.get("c3")).toBeUndefined();
  });

  it("수업 시작 전에는 보이지 않고, 시작 시각부터 보인다", () => {
    expect(isHomeworkDue({ now: "14:29", classStart: "14:30" })).toBe(false);
    expect(isHomeworkDue({ now: "14:30", classStart: "14:30" })).toBe(true);
    expect(isHomeworkDue({ now: "18:00", classStart: "14:30" })).toBe(true);
  });

  it("오늘 수업이 없으면 보이지 않는다", () => {
    expect(isHomeworkDue({ now: "23:59", classStart: undefined })).toBe(false);
    expect(isHomeworkDue({ now: "23:59", classStart: null })).toBe(false);
  });

  it("마감 시각이 있으면 수업 시작보다 마감을 따른다", () => {
    expect(isHomeworkDue({ now: "15:00", classStart: "14:30", due: "18:00" })).toBe(false);
    expect(isHomeworkDue({ now: "18:00", classStart: "14:30", due: "18:00" })).toBe(true);
    expect(isHomeworkDue({ now: "10:00", classStart: null, due: "09:00" })).toBe(true);
  });
});
