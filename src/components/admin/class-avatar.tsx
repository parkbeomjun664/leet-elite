import { classTone } from "@/lib/admin/class-color";
import type { MessageTag } from "@/lib/admin/message-tag";
import { cn } from "@/lib/cn";

// 원장 홈 목록 줄 앞의 반 아바타와 메시지 용건 태그
// 10/14 범준님: 아바타는 반별 연한 색 바탕 + 진한 글자, 태그는 결석 빨강 · 지각·조퇴 주황 · 일정 파랑 · 문의 회색
// 태그 글자는 12px라 원색 대신 같은 계열의 짙은 색 (#F04452 → danger-text #D91F2F, #FF9F0A → class-3-text #9A5B00, #3182F6 → class-1-text #1B64DA)

/** 40px 아바타: 반 연한 색 원 + 반 약칭(진한 글자) */
export function ClassAvatar({ sortOrder, short }: { sortOrder?: number; short: string }) {
  const tone = classTone(sortOrder);
  return (
    <span aria-hidden data-avatar className={cn("grid size-10 shrink-0 place-items-center rounded-full text-caption font-bold tracking-tight", tone.bg, tone.text)}>
      {short}
    </span>
  );
}

/** 용건 태그 색 */
export const TAG_CLASS: Record<MessageTag, string> = {
  결석: "bg-class-5-bg text-danger-text",
  지각: "bg-class-3-bg text-class-3-text",
  조퇴: "bg-class-3-bg text-class-3-text",
  일정: "bg-class-1-bg text-class-1-text",
  문의: "bg-page text-base",
};

/** 용건 태그 (12px, 모서리 6) */
export function TagChip({ tag }: { tag: MessageTag }) {
  return (
    <span data-tag={tag} className={cn("inline-flex h-5 shrink-0 items-center rounded-[var(--radius-tag)] px-1.5 text-micro font-semibold", TAG_CLASS[tag])}>
      {tag}
    </span>
  );
}
