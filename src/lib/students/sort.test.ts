import { describe, expect, it } from "vitest";
import { nextSort, sortStudents } from "./sort";

const rows = [
  { id: "s3", name: "하은", attendanceCode: "2001", enrolledOn: "2026-03-02" },
  { id: "s1", name: "가윤", attendanceCode: "3001", enrolledOn: "2025-09-01" },
  { id: "s2", name: "나리", attendanceCode: "1001", enrolledOn: "2026-03-02" },
  { id: "s0", name: "가윤", attendanceCode: "4001", enrolledOn: "2024-01-05" }, // 동명이인
];
const ids = (r: typeof rows) => r.map((x) => x.id);

describe("정렬", () => {
  it("이름 가나다, 동명이인은 id 순", () => {
    expect(ids(sortStudents(rows, { key: "name", dir: "asc" }))).toEqual(["s0", "s1", "s2", "s3"]);
  });
  it("출결 번호 내림차순", () => {
    expect(ids(sortStudents(rows, { key: "attendanceCode", dir: "desc" }))).toEqual(["s0", "s1", "s3", "s2"]);
  });
  it("입학일 최근부터, 같은 날이면 이름순", () => {
    expect(ids(sortStudents(rows, { key: "enrolledOn", dir: "desc" }))).toEqual(["s2", "s3", "s1", "s0"]);
  });
  it("원래 배열은 그대로", () => {
    sortStudents(rows, { key: "name", dir: "asc" });
    expect(rows[0].id).toBe("s3");
  });
});

describe("머리글 누르기", () => {
  it("같은 열이면 뒤집기, 다른 열이면 기본 방향", () => {
    expect(nextSort({ key: "name", dir: "asc" }, "name")).toEqual({ key: "name", dir: "desc" });
    expect(nextSort({ key: "name", dir: "asc" }, "enrolledOn")).toEqual({ key: "enrolledOn", dir: "desc" });
    expect(nextSort({ key: "enrolledOn", dir: "desc" }, "attendanceCode")).toEqual({ key: "attendanceCode", dir: "asc" });
  });
});
