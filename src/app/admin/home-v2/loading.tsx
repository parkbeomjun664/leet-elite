import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";

// 원장님 새 홈을 불러오는 동안 (10/9 v2): 날짜·요약 → (PC) 시간표 줄 + 오른쪽 처리할 일 / (휴대폰) 처리할 일 한 줄 + 수업 중 반 두 개
export default function Loading() {
  return (
    <SkeletonGroup immediate label="홈 불러오는 중" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="space-y-6 lg:hidden">
        <Skeleton className="h-14 w-full rounded-[var(--radius-mcard)]" />
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-[124px] w-full rounded-[var(--radius-mcard)]" />
        <Skeleton className="h-[124px] w-full rounded-[var(--radius-mcard)]" />
      </div>
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        <div className="space-y-5 pt-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex h-12 items-start gap-4">
              <Skeleton className="h-4 w-12" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4" style={{ width: `${30 + ((i * 11) % 25)}%` }} />
                <Skeleton className="h-1.5 w-28 rounded-full" />
              </div>
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3.5 w-20" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <Skeleton className="h-8 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}
