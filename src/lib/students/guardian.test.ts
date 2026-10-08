import { describe, expect, it } from "vitest";
import { parseGuardian } from "./guardian";

const base = { id: "g1", name: " 표승현맘 ", relation: "mother", phone1: "01055507001", phone2: "" };

describe("보호자 정보 수정 규칙 (10/9)", () => {
  it("이름 공백 정리, 전화 하이픈, 빈 전화는 null", () => {
    expect(parseGuardian(base)).toEqual({ ok: true, value: { id: "g1", name: "표승현맘", relation: "mother", phone1: "010-5550-7001", phone2: null } });
  });
  it("이름이 비면 안내", () => {
    expect(parseGuardian({ ...base, name: " " })).toEqual({ ok: false, field: "name", error: "보호자 이름을 입력해 주세요" });
  });
  it("전화 모양이 틀리면 그 칸에 안내", () => {
    expect(parseGuardian({ ...base, phone2: "12345" })).toMatchObject({ ok: false, field: "phone2" });
  });
  it("관계는 모·부·기타·없음만", () => {
    expect(parseGuardian({ ...base, relation: null }).ok).toBe(true);
    expect(parseGuardian({ ...base, relation: "uncle" }).ok).toBe(false);
  });
});
