import { describe, expect, it } from "vitest";
import { needsMakeup, waitingFeedback } from "./checks";

describe("피드백 안 한 숙제", () => {
  const subs = [
    { studentId: "a", submittedAt: "2026-10-04 20:00", teacherComment: null }, // 그제: 범위 밖
    { studentId: "b", submittedAt: "2026-10-05 15:00", teacherComment: null },
    { studentId: "c", submittedAt: "2026-10-05 15:30", teacherComment: "잘했어요" }, // 코멘트 있음
    { studentId: "d", submittedAt: "2026-10-06 14:00", teacherComment: null },
    { studentId: "e", submittedAt: "2026-10-06 19:00", teacherComment: null }, // 지금보다 뒤
  ];
  it("어제부터 지금까지 제출됐고 코멘트가 없는 것만", () => {
    expect(waitingFeedback(subs, "2026-10-05", "2026-10-06 16:00").map((s) => s.studentId)).toEqual(["b", "d"]);
  });
});

describe("보강 잡을 학생", () => {
  it("결석 뒤 보강(예정·완료)이 없으면 넣고, 있으면 뺀다", () => {
    const r = needsMakeup(
      [
        { studentId: "a", date: "2026-10-01" },
        { studentId: "b", date: "2026-10-02" },
        { studentId: "c", date: "2026-10-03" },
        { studentId: "d", date: "2026-10-04" },
      ],
      [
        { studentId: "b", date: "2026-10-07", status: "scheduled" }, // 예정 보강 있음
        { studentId: "c", date: "2026-10-04", status: "done" }, // 이미 함
        { studentId: "d", date: "2026-10-08", status: "cancelled" }, // 취소는 없는 것으로
        { studentId: "a", date: "2026-09-28", status: "done" }, // 결석 전 보강은 상관없음
      ],
    );
    expect(r).toEqual([
      { studentId: "d", lastAbsent: "2026-10-04" },
      { studentId: "a", lastAbsent: "2026-10-01" },
    ]);
  });
  it("여러 번 결석하면 가장 최근 결석 뒤의 보강만 인정", () => {
    const r = needsMakeup(
      [
        { studentId: "a", date: "2026-10-01" },
        { studentId: "a", date: "2026-10-05" },
      ],
      [{ studentId: "a", date: "2026-10-03", status: "done" }],
    );
    expect(r).toEqual([{ studentId: "a", lastAbsent: "2026-10-05" }]);
  });
});
