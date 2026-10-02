// 학생·학부모 휴대폰 화면의 상태 → 색 연결 (10/2 색 체계 정리). 색 값은 globals.css 토큰에 있다
// 규칙: 초록 = 등원·하원·제출함 / 주황 = 미제출·미등원 / 분홍(alert) = 결석일 때만 / 나머지 = 흰색·회색
import type { DayStatus } from "./attendance";

export type MobileStatus = DayStatus | "submitted" | "missing";
export type StatusColor = "ok" | "warn" | "alert" | "neutral";

export function statusColor(status: MobileStatus): StatusColor {
  switch (status) {
    case "checked_in":
    case "checked_out":
    case "submitted":
      return "ok";
    case "missing":
    case "not_arrived":
      return "warn";
    case "absent":
      return "alert";
    default:
      return "neutral"; // 수업 전, 수업 없음
  }
}

/** 배지 색 (바탕 + 글씨) */
export const STATUS_BADGE_CLASS: Record<StatusColor, string> = {
  ok: "bg-status-ok-bg text-status-ok-fg",
  warn: "bg-status-warn-bg text-status-warn-fg",
  alert: "bg-status-alert-bg text-status-alert-fg",
  neutral: "bg-border text-ink/60",
};

/** 학부모 화면 맨 위 "오늘 등원" 카드 바탕: 등원 → 초록, 결석 → 분홍, 그 밖에는 흰 카드 */
export const STATUS_CARD_CLASS: Record<StatusColor, string> = {
  ok: "bg-status-ok-bg",
  warn: "bg-surface border border-border",
  alert: "bg-status-alert-bg",
  neutral: "bg-surface border border-border",
};
