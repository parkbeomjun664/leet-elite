// 첫 테스트 (10/2): 틀리면 출결이 통째로 어긋나는 계산들을 고정해 둔다. 실행: npm test
import { describe, expect, it } from "vitest";
import { studentDay } from "./attendance";
import { addDays, addMinutes, nowTimeKST, todayKST, weekdayOf } from "./date";
import { parseRosterName, weekdaysFromMemo } from "./mock/real-roster";
import type { Student } from "./mock/types";

describe("한국 시간 (date.ts)", () => {
  it("UTC 밤 11시는 한국 다음 날 아침 8시다 (베타 버전의 '오전 9시 전 기록이 전날로' 버그 방지)", () => {
    const utc2300 = new Date("2026-09-30T23:00:00Z");
    expect(todayKST(utc2300)).toBe("2026-10-01");
    expect(nowTimeKST(utc2300)).toBe("08:00");
  });
  it("날짜 더하기는 달·해가 넘어가도 맞다", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });
  it("시각 더하기: 수업 끝 시각 계산", () => {
    expect(addMinutes("15:00", 90)).toBe("16:30");
    expect(addMinutes("14:40", 80)).toBe("16:00");
  });
  it("요일: 2026-10-01은 목요일(4)", () => {
    expect(weekdayOf("2026-10-01")).toBe(4);
  });
});

describe("오늘 출결 상태 (attendance.ts)", () => {
  const student = {
    id: "s1",
    schedule: [{ weekday: 4, start: "15:00", durationMin: 90 }],
  } as unknown as Student;
  const date = "2026-10-01"; // 목요일

  it("수업 시작 전이면 '수업 전'", () => {
    expect(studentDay(student, [], date, "14:59").status).toBe("upcoming");
  });
  it("수업 시작이 지났는데 등원 기록이 없으면 '미등원'", () => {
    expect(studentDay(student, [], date, "15:00").status).toBe("not_arrived");
  });
  it("등원만 있으면 '등원', 하원까지 있으면 '하원', 결석이면 '결석'", () => {
    const rec = (checkInAt: string | null, checkOutAt: string | null, status: "present" | "absent" = "present") => [
      { studentId: "s1", date, checkInAt, checkOutAt, status, memo: "" },
    ];
    expect(studentDay(student, rec("14:58", null), date, "16:00").status).toBe("checked_in");
    expect(studentDay(student, rec("14:58", "16:31"), date, "17:00").status).toBe("checked_out");
    expect(studentDay(student, rec(null, null, "absent"), date, "16:00").status).toBe("absent");
  });
  it("그날 수업이 없으면 '수업 없음'", () => {
    expect(studentDay(student, [], "2026-10-02", "16:00").status).toBe("no_class");
  });
  it("지난 날짜(nowTime 없음)에 기록이 없으면 미등원", () => {
    expect(studentDay(student, [], date, null).status).toBe("not_arrived");
  });
});

describe("에듀OK 명단 해석 (real-roster.ts)", () => {
  it("상태·이름·학교·학년을 나눈다", () => {
    expect(parseRosterName("(재)홍길동(한빛중3)")).toEqual({ status: "enrolled", name: "홍길동", school: "한빛중", grade: "중3" });
    expect(parseRosterName("(퇴)홍길동(초6)")).toEqual({ status: "withdrawn", name: "홍길동", school: null, grade: "초6" });
    expect(parseRosterName("(휴)홍길동.새솔고2")).toMatchObject({ status: "on_leave", name: "홍길동", school: "새솔고", grade: "고2" });
    expect(parseRosterName("(재)홍길동 초5")).toMatchObject({ name: "홍길동", grade: "초5" });
    expect(parseRosterName("(재)홍길동")).toMatchObject({ name: "홍길동", school: null, grade: null });
  });
  it("메모 맨 앞 요일 글자를 요일 번호로", () => {
    expect(weekdaysFromMemo("월수금 하교후 바로")).toEqual([1, 3, 5]);
    expect(weekdaysFromMemo("월~목")).toEqual([1, 2, 3, 4]);
    expect(weekdaysFromMemo("화목 3~3:10에 시작")).toEqual([2, 4]);
    expect(weekdaysFromMemo("고혁 친구")).toBeNull();
  });
});
