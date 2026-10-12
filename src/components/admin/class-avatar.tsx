import { tagGroup, type MessageTag } from "@/lib/admin/message-tag";

// 원장 홈 목록 줄 앞의 반 아바타와 메시지 용건 태그
// 10/13 범준님 "색 종류가 많아 눈에 안 들어온다" → 반마다 다른 색 대신 회색, 태그는 오늘 수업에 영향(결석·조퇴·지각)만 빨강

/** 40px 아바타: 회색 원 + 반 약칭 (반 구분은 글자로) */
export function ClassAvatar({ short }: { sortOrder?: number; short: string }) {
  return (
    <span aria-hidden data-avatar className="grid size-10 shrink-0 place-items-center rounded-full bg-page text-caption font-bold tracking-tight text-base">
      {short}
    </span>
  );
}

/** 용건 태그 색: 결석·조퇴·지각 = 빨강 계열 / 일정·문의 = 회색 */
export const TAG_CLASS: Record<ReturnType<typeof tagGroup>, string> = {
  today: "bg-class-5-bg text-class-5-text",
  schedule: "bg-page text-base",
  ask: "bg-page text-base",
};

/** 용건 태그 (12px, 모서리 6) */
export function TagChip({ tag }: { tag: MessageTag }) {
  const group = tagGroup(tag);
  return (
    <span
      data-tag={tag}
      data-group={group}
      className={`inline-flex h-5 shrink-0 items-center rounded-[var(--radius-tag)] px-1.5 text-micro font-semibold ${TAG_CLASS[group]}`}
    >
      {tag}
    </span>
  );
}
