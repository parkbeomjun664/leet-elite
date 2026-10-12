import { describe, expect, it } from "vitest";
import type { DayStatus } from "@/lib/attendance";
import { blockState, buildClassBlocks, dayPhase, durationKo, showProgress, sortBlocks, summarize, untilLabel, type Block } from "./timeline";

const e = (classId: string, name: string, start: string, end: string, status: DayStatus = "upcoming") => ({
  classId,
  className: `반${classId}`,
  teacherName: "Jenny",
  student: { id: name, name, start, end, status },
});

describe("반 블록 묶기 (같은 반은 한 블록)", () => {
  it("시작은 가장 이른 시각, 끝은 가장 늦은 끝, 늦게 시작하는 학생은 시각별로 센다", () => {
    const [b] = buildClassBlocks([e("c1", "가", "14:30", "15:50"), e("c1", "나", "14:30", "15:50"), e("c1", "다", "15:10", "16:30"), e("c1", "라", "17:00", "18:00")]);
    expect(b).toMatchObject({ id: "c1", start: "14:30", end: "18:00", total: 4 });
    expect(b.lateStarts).toEqual([
      { start: "15:10", count: 1 },
      { start: "17:00", count: 1 },
    ]);
  });
  it("다른 반은 따로, 등원(하원 포함)·결석·미등원 세기", () => {
    const blocks = buildClassBlocks([
      e("c1", "가", "15:00", "16:00", "checked_in"),
      e("c1", "나", "15:00", "16:00", "checked_out"),
      e("c1", "다", "15:00", "16:00", "absent"),
      e("c1", "마", "15:00", "16:00", "not_arrived"),
      e("c2", "라", "15:00", "16:00", "upcoming"),
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ classId: "c1", arrived: 2, absent: 1, notArrived: 1, total: 4, lateStarts: [] });
    expect(blocks[1]).toMatchObject({ classId: "c2", arrived: 0, notArrived: 0, total: 1 });
  });
});

describe("상태·순서·요약", () => {
  it("끝남 / 수업 중 / 예정 (끝나는 시각 정각이면 끝남)", () => {
    const b = { start: "15:00", end: "16:00" };
    expect(blockState(b, "14:59")).toBe("예정");
    expect(blockState(b, "15:00")).toBe("수업 중");
    expect(blockState(b, "16:00")).toBe("끝남");
  });
  it("시간순, 같은 시각이면 반 블록이 보강보다 먼저", () => {
    const blocks: Block[] = [
      { kind: "makeup", id: "m", start: "15:00", end: "16:00", studentName: "가", teacherName: null, reason: "" },
      ...buildClassBlocks([e("c1", "나", "15:00", "16:00"), e("c2", "다", "14:00", "15:00")]),
    ];
    expect(sortBlocks(blocks).map((b) => b.id)).toEqual(["c2", "c1", "m"]);
  });
  it("지금 수업 중인 반 수 · 등원 x/y · 결석", () => {
    const blocks = buildClassBlocks([
      e("c1", "가", "15:00", "16:00", "checked_in"),
      e("c1", "나", "15:00", "16:00", "absent"),
      e("c2", "다", "17:00", "18:00"),
    ]);
    expect(summarize(blocks, "15:30")).toEqual({ inClass: 1, arrived: 1, total: 3, absent: 1, notArrived: 0 });
  });
});

// ── v4 (10/12) ──

describe("요약 히어로 3상태 (dayPhase)", () => {
  const blocks = sortBlocks([
    ...buildClassBlocks([e("c1", "가", "14:30", "16:20", "checked_in"), e("c2", "나", "17:00", "20:00")]),
    { kind: "makeup", id: "m1", start: "20:30", end: "21:30", studentName: "다", teacherName: null, reason: "" },
  ]);
  it("첫 수업 전: 첫 반과 남은 분", () => {
    const p = dayPhase(blocks, "10:41");
    expect(p.phase).toBe("before");
    if (p.phase === "before") {
      expect(p.first.classId).toBe("c1");
      expect(p.minutesToFirst).toBe(229);
      expect(durationKo(p.minutesToFirst)).toBe("3시간 49분");
    }
  });
  it("수업 중: 진행 중인 반 · 쉬는 사이면 빈 목록 + 다음 반", () => {
    const a = dayPhase(blocks, "15:00");
    expect(a.phase === "during" && a.live.map((b) => b.classId)).toEqual(["c1"]);
    const gap = dayPhase(blocks, "16:40");
    expect(gap.phase === "during" && gap.live).toEqual([]);
    expect(gap.phase === "during" && gap.next?.classId).toBe("c2");
    // 보강이 끝나기 전까지는 수업 중
    expect(dayPhase(blocks, "21:00").phase).toBe("during");
  });
  it("모든 수업(보강 포함)이 끝나면 끝", () => {
    expect(dayPhase(blocks, "21:30")).toEqual({ phase: "after", lastEnd: "21:30" });
  });
  it("오늘 수업이 없으면 none", () => {
    expect(dayPhase([], "10:00")).toEqual({ phase: "none" });
  });
});

describe("블록 오른쪽 글 · 진행 막대 시점", () => {
  it("n분 후 / n시간 후 / 곧", () => {
    expect(untilLabel("17:00", "16:20")).toBe("40분 후");
    expect(untilLabel("19:10", "16:00")).toBe("3시간 후");
    expect(untilLabel("17:00", "15:00")).toBe("2시간 후");
    expect(untilLabel("17:00", "17:00")).toBe("곧");
  });
  it("진행 막대는 시작 10분 전부터", () => {
    expect(showProgress({ start: "17:00" }, "16:49")).toBe(false);
    expect(showProgress({ start: "17:00" }, "16:50")).toBe(true);
    expect(showProgress({ start: "17:00" }, "18:00")).toBe(true);
  });
  it("시간 글", () => {
    expect(durationKo(40)).toBe("40분");
    expect(durationKo(120)).toBe("2시간");
    expect(durationKo(0)).toBe("0분");
  });
});
