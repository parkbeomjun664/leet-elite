import { describe, expect, it } from "vitest";
import { attendanceSaveMessage } from "./attendance";

// 출결 저장 토스트 문장: 버튼 이름("하원 처리")과 같은 말로
describe("attendanceSaveMessage", () => {
  it("한 명이면 이름", () => {
    expect(attendanceSaveMessage(["김하윤"], "out")).toBe("김하윤 하원 처리했어요");
    expect(attendanceSaveMessage(["김하윤"], "absent")).toBe("김하윤 결석 처리했어요");
  });
  it("여러 명이면 인원수", () => {
    expect(attendanceSaveMessage(["김하윤", "이서준", "박지우"], "in")).toBe("3명 등원 처리했어요");
  });
});
