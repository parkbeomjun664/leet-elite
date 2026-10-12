import { classTone } from "@/lib/admin/class-color";
import { tagGroup, type MessageTag } from "@/lib/admin/message-tag";
import { cn } from "@/lib/cn";

// 원장 홈 목록 줄 앞의 반 색 아바타와 메시지 용건 태그 (10/12 v4 → v5에서도 그대로)

/** 40px 아바타: 반 색 연한 톤 + 반 약칭 (같은 반 = 같은 색) */
export function ClassAvatar({ sortOrder, short }: { sortOrder?: number; short: string }) {
  const tone = classTone(sortOrder);
  return (
    <span aria-hidden data-avatar className={cn("grid size-10 shrink-0 place-items-center rounded-full text-caption font-bold tracking-tight", tone.bg, tone.text)}>
      {short}
    </span>
  );
}

/** 용건 태그 색: 결석·조퇴·지각 = 빨강 계열 / 일정 = 파랑 계열 / 문의 = 회색 */
export const TAG_CLASS: Record<ReturnType<typeof tagGroup>, string> = {
  today: "bg-class-5-bg text-class-5-text",
  schedule: "bg-class-1-bg text-class-1-text",
  ask: "bg-page text-base",
};

/** 용건 태그 (12px, 모서리 6) */
export function TagChip({ tag }: { tag: MessageTag }) {
  return (
    <span data-tag={tag} className={cn("inline-flex h-5 shrink-0 items-center rounded-[var(--radius-tag)] px-1.5 text-micro font-semibold", TAG_CLASS[tagGroup(tag)])}>
      {tag}
    </span>
  );
}
