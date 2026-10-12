import { describe, expect, it } from "vitest";
import { mockStudentIdOf } from "./seed-ids";

describe("시드 학생 id → 가상 데이터 id", () => {
  it("시드 규칙의 id는 sNNN으로", () => {
    expect(mockStudentIdOf("30000000-0000-4000-8000-000000000001")).toBe("s001");
    expect(mockStudentIdOf("30000000-0000-4000-8000-000000000042")).toBe("s042");
  });
  it("그 밖의 id(실제 등록 학생, 첫 로그인 시험 학생)는 null", () => {
    expect(mockStudentIdOf("50000000-0000-4000-8000-000000000001")).toBeNull();
    expect(mockStudentIdOf("8a1f0b4e-1234-4abc-9def-0123456789ab")).toBeNull();
  });
});
