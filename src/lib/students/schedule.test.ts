import { describe, expect, it } from "vitest";
import { parseClassesSchedule, sameSchedule, scheduleOverlap } from "./schedule";

const slot = (weekday: number, start: string, durationMin = 90) => ({ weekday, start, durationMin });

describe("반 · 수업 시간 저장 규칙", () => {
  it("요일마다 다른 시간, 여러 반", () => {
    const r = parseClassesSchedule({ classIds: ["c1", "c2", "c1"], schedule: [slot(2, "15:00", 120), slot(4, "15:10", 120)] });
    expect(r).toMatchObject({ ok: true, value: { classIds: ["c1", "c2"] } }); // 같은 반 두 번은 하나로
  });
  it("반도 시간표도 비워 둘 수 있다", () => {
    expect(parseClassesSchedule({ classIds: [], schedule: [] }).ok).toBe(true);
  });
  it("같은 요일에 시간이 겹치면 안내", () => {
    expect(scheduleOverlap([slot(3, "14:30", 80), slot(3, "15:00", 60)])).toBe("수요일 14:30과 15:00 수업 시간이 겹쳐요");
    expect(parseClassesSchedule({ classIds: [], schedule: [slot(3, "15:00"), slot(3, "15:00")] })).toMatchObject({ ok: false, field: "schedule" });
  });
  it("같은 요일이어도 겹치지 않으면 괜찮다 (끝나는 시각 = 다음 시작)", () => {
    expect(scheduleOverlap([slot(1, "14:00", 60), slot(1, "15:00", 60)])).toBeNull();
  });
  it("수업 시간(분)은 10~300, 밤 12시를 넘기면 안 됨", () => {
    expect(parseClassesSchedule({ classIds: [], schedule: [slot(1, "15:00", 5)] })).toMatchObject({ ok: false, error: "수업 시간은 10분 이상으로 입력해 주세요" });
    expect(parseClassesSchedule({ classIds: [], schedule: [slot(1, "15:00", 301)] })).toMatchObject({ ok: false, field: "schedule" });
    expect(parseClassesSchedule({ classIds: [], schedule: [slot(6, "23:30", 90)] })).toMatchObject({ ok: false, error: "토요일 수업이 밤 12시를 넘겨요" });
  });
  it("시간표가 같은지 (순서 무시)", () => {
    expect(sameSchedule([slot(1, "15:00"), slot(3, "16:00")], [slot(3, "16:00"), slot(1, "15:00")])).toBe(true);
    expect(sameSchedule([slot(1, "15:00")], [slot(1, "15:00", 60)])).toBe(false);
  });
});
