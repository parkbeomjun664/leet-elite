import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 로딩 중 자리 표시 블록 하나. 실제 글씨·카드와 같은 자리, 같은 크기로 둔다 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={cn("block animate-skeleton rounded-[var(--radius-badge)] bg-line-soft", className)} style={style} />;
}

/**
 * 스켈레톤 묶음. 0.2초 안에 끝나는 로딩에는 보이지 않게 0.2초 뒤에 나타난다(깜빡임 방지)
 * 화면 읽기 프로그램에는 "불러오는 중"으로 알린다
 */
export function SkeletonGroup({ label = "불러오는 중", className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={cn("[animation:fade-in_var(--duration-base)_var(--ease-out)_200ms_both]", className)}>
      {children}
    </div>
  );
}

/** 목록 줄 스켈레톤: 이름 + 보조 한 줄 + 오른쪽 배지 */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonGroup className="divide-y divide-line-soft">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4" style={{ width: `${40 + ((i * 17) % 30)}%` }} />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-[22px] w-12" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** 카드 격자 스켈레톤 (선생님 홈 학생 칸 모양) */
export function SkeletonCards({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <SkeletonGroup className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-[var(--radius-card)] bg-bg px-4 py-3.5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </SkeletonGroup>
  );
}
