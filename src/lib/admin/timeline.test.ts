import { describe, expect, it } from "vitest";
import type { DayStatus } from "@/lib/attendance";
import { blockState, buildClassBlocks, sortBlocks, summarize, type Block } from "./timeline";

const e = (classId: string, name: string, start: string, end: string, status: DayStatus = "upcoming") => ({
  classId,
  className: `반${classId}`,
  teacherName: "Jenny",
  student: { id: name, name, start, end, status },
});

describe("반 블록 묶기", () => {
  it("같은 반에서 30분 안에 시작하면 한 블록, 끝은 가장 늦은 끝", () => {
    const [b] = buildClassBlocks([e("c1", "가", "14:30", "15:50"), e("c1", "나", "14:40", "16:00")]);
    expect(b).toMatchObject({ start: "14:30", end: "16:00", total: 2 });
  });
  it("같은 반이라도 30분 넘게 차이 나면 두 블록", () => {
    const blocks = buildClassBlocks([e("c1", "가", "14:30", "15:50"), e("c1", "나", "17:00", "18:00")]);
    expect(blocks.map((b) => b.start)).toEqual(["14:30", "17:00"]);
  });
  it("다른 반은 따로, 등원(하원 포함)·결석 세기", () => {
    const blocks = buildClassBlocks([
      e("c1", "가", "15:00", "16:00", "checked_in"),
      e("c1", "나", "15:00", "16:00", "checked_out"),
      e("c1", "다", "15:00", "16:00", "absent"),
      e("c2", "라", "15:00", "16:00", "not_arrived"),
    ]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ classId: "c1", arrived: 2, absent: 1, total: 3 });
    expect(blocks[1]).toMatchObject({ classId: "c2", arrived: 0, total: 1 });
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
    expect(sortBlocks(blocks).map((b) => b.id)).toEqual(["c2-14:00", "c1-15:00", "m"]);
  });
  it("지금 수업 중인 반 수 · 등원 x/y · 결석", () => {
    const blocks = buildClassBlocks([
      e("c1", "가", "15:00", "16:00", "checked_in"),
      e("c1", "나", "15:00", "16:00", "absent"),
      e("c2", "다", "17:00", "18:00"),
    ]);
    expect(summarize(blocks, "15:30")).toEqual({ inClass: 1, arrived: 1, total: 3, absent: 1 });
  });
});
