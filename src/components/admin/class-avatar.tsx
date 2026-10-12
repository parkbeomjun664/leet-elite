import { tagGroup, type MessageTag } from "@/lib/admin/message-tag";

// 원장 홈 목록 줄 앞의 반 아바타와 메시지 용건 태그
// 10/13 범준님 "색이 너무 많다" → 반 색·태그 색을 빼고 회색 하나로. 반 구분은 약칭 글자로

/** 40px 아바타: 회색 원 + 반 약칭 */
export function ClassAvatar({ short }: { sortOrder?: number; short: string }) {
  return (
    <span aria-hidden data-avatar className="grid size-10 shrink-0 place-items-center rounded-full bg-page text-caption font-bold tracking-tight text-base">
      {short}
    </span>
  );
}

/** 용건 태그 (12px, 모서리 6, 회색). data-group으로 오늘 수업 영향(결석·조퇴·지각)인지 표시만 남긴다 */
export function TagChip({ tag }: { tag: MessageTag }) {
  return (
    <span
      data-tag={tag}
      data-group={tagGroup(tag)}
      className="inline-flex h-5 shrink-0 items-center rounded-[var(--radius-tag)] bg-page px-1.5 text-micro font-semibold text-base"
    >
      {tag}
    </span>
  );
}
