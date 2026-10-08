import { Skeleton, SkeletonCards, SkeletonGroup, SkeletonRows } from "@/components/ui/skeleton";

// 재원생 목록을 DB에서 불러오는 동안: 제목·버튼 · 거르기 줄 · (휴대폰·태블릿) 카드 / (PC) 표 줄 모양
// 메뉴 이동 중 빈 화면이 없게 바로 보여 준다 (10/8). 높이는 실제 화면(src/app/admin/students/page.tsx)에 맞춤
export default function Loading() {
  return (
    <SkeletonGroup immediate label="재원생 불러오는 중" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div className="space-y-2.5">
          <Skeleton className="h-[30px] w-24" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-[var(--radius-control)]" />
          <Skeleton className="h-10 w-24 rounded-[var(--radius-control)]" />
        </div>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <Skeleton className="h-11 flex-1 rounded-[var(--radius-control)] md:h-9" />
        <Skeleton className="h-10 rounded-[var(--radius-control)] md:w-64" />
      </div>
      <SkeletonCards immediate count={8} className="md:grid-cols-2 lg:hidden xl:grid-cols-2" cardClassName="min-h-[67px]" />
      <div className="hidden lg:block">
        <SkeletonRows immediate rows={10} />
      </div>
    </SkeletonGroup>
  );
}
