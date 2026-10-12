import { Skeleton, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

// 선생님 목록을 불러오는 동안: 제목·버튼 + 줄 모양 (src/app/admin/teachers/page.tsx)
export default function Loading() {
  return (
    <SkeletonGroup immediate label="선생님 불러오는 중" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div className="space-y-2.5">
          <Skeleton className="h-[30px] w-24" />
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 rounded-[var(--radius-control)]" />
      </div>
      <SkeletonRows rows={4} immediate />
    </SkeletonGroup>
  );
}
