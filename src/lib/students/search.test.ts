import { describe, expect, it } from "vitest";
import { findRange, matchStudent, toChoseong, type SearchTarget } from "./search";

const s: SearchTarget = {
  name: "조나윤",
  school: "한빛초",
  grade: "초2",
  phone: "010-5550-1006",
  attendanceCode: "1234",
  memo: "휴대폰 없음 (보호자 번호로 연락)",
  guardians: [{ name: "조나윤맘", phone1: "010-5551-2002" }],
};

describe("초성", () => {
  it("한글은 초성으로, 다른 글자는 그대로 (글자 수 같음)", () => {
    expect(toChoseong("조나윤 A1")).toBe("ㅈㄴㅇ A1");
    expect(toChoseong("쌍둥이")).toBe("ㅆㄷㅇ");
  });
  it("초성으로 이름을 찾는다", () => {
    expect(matchStudent(s, "ㅈㄴㅇ")?.field).toBe("name");
    expect(matchStudent(s, "ㄴㅇ")?.field).toBe("name");
    expect(matchStudent(s, "ㅈㅁ")).toBeNull();
  });
});

describe("숫자 검색", () => {
  it("출결 번호를 먼저, 그다음 휴대폰 뒷자리", () => {
    expect(matchStudent(s, "1234")?.field).toBe("code");
    expect(matchStudent(s, "1006")?.field).toBe("phone");
    expect(matchStudent(s, "5550-10")?.field).toBe("phone");
  });
  it("보호자 전화로도 찾는다", () => {
    expect(matchStudent(s, "2002")).toMatchObject({ field: "guardian", label: "보호자" });
  });
  it("숫자 한 글자는 너무 많이 걸려서 찾지 않는다", () => {
    expect(matchStudent(s, "1")).toBeNull();
  });
});

describe("글자 검색", () => {
  it("이름·학교·학년·메모·보호자 이름", () => {
    expect(matchStudent(s, "나윤")?.field).toBe("name");
    expect(matchStudent(s, "한빛")?.field).toBe("school");
    expect(matchStudent(s, "초2")?.field).toBe("school");
    expect(matchStudent(s, "연락")?.field).toBe("memo");
    expect(matchStudent({ ...s, guardians: [{ name: "김엄마", phone1: null }] }, "김엄마")).toMatchObject({ field: "guardian", text: "김엄마" });
    expect(matchStudent(s, "없는말")).toBeNull();
  });
  it("빈 검색어는 맞지 않음 (거르기는 화면에서 건너뛴다)", () => {
    expect(matchStudent(s, "  ")).toBeNull();
  });
});

describe("굵게 보여 줄 자리", () => {
  it("그대로 들어 있는 글자", () => expect(findRange("조나윤", "나윤")).toEqual([1, 3]));
  it("초성", () => expect(findRange("조나윤", "ㄴㅇ")).toEqual([1, 3]));
  it("하이픈을 건너뛴 숫자", () => expect(findRange("010-5550-1006", "55501006")).toEqual([4, 13]));
  it("없으면 null", () => expect(findRange("조나윤", "민")).toBeNull());
});
