import { describe, expect, it } from "vitest";
import { parseStudentBasic } from "./basic";

const base = {
  id: "s1",
  name: " 표승현 ",
  phone: "01055501002",
  school: " 한빛초 ",
  grade: "",
  enrolledOn: "2026-04-15",
  attendanceCode: "1002",
  programs: ["클래스카드"],
  memo: " 쌍둥이 ",
};

describe("학생 기본 정보 저장 규칙 (STU-01~03)", () => {
  it("앞뒤 공백을 지우고, 빈 칸은 null, 휴대폰은 하이픈 모양으로", () => {
    const r = parseStudentBasic(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({ name: "표승현", school: "한빛초", grade: null, phone: "010-5550-1002", memo: "쌍둥이" });
  });

  it("휴대폰은 비워 둘 수 있다 (없는 학생)", () => {
    const r = parseStudentBasic({ ...base, phone: "  " });
    expect(r.ok && r.value.phone).toBe(null);
  });

  it("이름이 비면 이름 칸에 안내", () => {
    expect(parseStudentBasic({ ...base, name: "  " })).toEqual({ ok: false, field: "name", error: "이름을 입력해 주세요" });
  });

  it("출결 번호는 숫자 4자리만", () => {
    for (const code of ["123", "12345", "12a4", ""]) {
      const r = parseStudentBasic({ ...base, attendanceCode: code });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.field).toBe("attendanceCode");
    }
  });

  it("휴대폰 형식이 틀리면 휴대폰 칸에 안내", () => {
    for (const p of ["010-123", "02-123-4567", "abc"]) {
      const r = parseStudentBasic({ ...base, phone: p });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.field).toBe("phone");
    }
  });

  it("목록에 없는 사용 프로그램은 거부", () => {
    const r = parseStudentBasic({ ...base, programs: ["클래스카드", "없는프로그램"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.field).toBe("programs");
  });

  it("입학일은 YYYY-MM-DD", () => {
    const r = parseStudentBasic({ ...base, enrolledOn: "2026/4/15" });
    expect(r.ok).toBe(false);
  });
});
