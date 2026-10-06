import { Skeleton, SkeletonCards, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

// 재원생 목록을 DB에서 불러오는 동안: 제목 · 거르기 칸 · (휴대폰·태블릿) 카드 / (PC) 표 줄 모양 (docs/design.md 4번 스켈레톤)
export default function Loading() {
  return (
    <div className="space-y-5">
      <SkeletonGroup label="재원생 불러오는 중" className="space-y-3 pb-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </SkeletonGroup>
      <Skeleton className="h-[104px] rounded-[var(--radius-card)]" />
      <SkeletonCards count={8} className="md:grid-cols-2 lg:hidden xl:grid-cols-2" />
      <div className="hidden lg:block">
        <SkeletonRows rows={10} />
      </div>
    </div>
  );
}
