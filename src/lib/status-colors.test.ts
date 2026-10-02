// 상태 → 색 연결 테스트. 실행: npm test
import { describe, expect, it } from "vitest";
import { STATUS_CARD_CLASS, statusColor } from "./status-colors";

describe("휴대폰 화면 상태 색", () => {
  it("등원·하원·제출함은 초록", () => {
    expect(statusColor("checked_in")).toBe("ok");
    expect(statusColor("checked_out")).toBe("ok");
    expect(statusColor("submitted")).toBe("ok");
  });
  it("결석은 분홍(alert), 분홍은 결석에만", () => {
    expect(statusColor("absent")).toBe("alert");
    const alerts = (["checked_in", "checked_out", "absent", "not_arrived", "upcoming", "no_class", "submitted", "missing"] as const).filter(
      (s) => statusColor(s) === "alert",
    );
    expect(alerts).toEqual(["absent"]);
  });
  it("미제출은 주황", () => {
    expect(statusColor("missing")).toBe("warn");
  });
  it("수업 전·수업 없음은 중립", () => {
    expect(statusColor("upcoming")).toBe("neutral");
    expect(statusColor("no_class")).toBe("neutral");
  });
  it("학부모 등원 카드: 수업 전은 흰 카드, 등원은 초록, 결석은 분홍 바탕", () => {
    expect(STATUS_CARD_CLASS[statusColor("upcoming")]).toContain("bg-surface");
    expect(STATUS_CARD_CLASS[statusColor("checked_in")]).toBe("bg-status-ok-bg");
    expect(STATUS_CARD_CLASS[statusColor("absent")]).toBe("bg-status-alert-bg");
  });
});
