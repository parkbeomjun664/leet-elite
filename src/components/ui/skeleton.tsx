import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 로딩 중 자리 표시 블록 하나. 실제 글씨·카드와 같은 자리, 같은 크기로 둔다 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden className={cn("block animate-skeleton rounded-[var(--radius-badge)] bg-line-soft", className)} style={style} />;
}

/**
 * 스켈레톤 묶음. 화면 읽기 프로그램에는 "불러오는 중"으로 알린다
 * - 기본: 0.2초 안에 끝나는 로딩에는 보이지 않게 0.2초 뒤에 나타난다(깜빡임 방지). 화면 안 작은 목록용
 * - immediate: 바로 보인다. 메뉴 이동(loading.tsx)용 — 기다리는 동안 본문이 비어 보이지 않게 (10/8)
 */
export function SkeletonGroup({
  label = "불러오는 중",
  immediate = false,
  className,
  children,
}: {
  label?: string;
  immediate?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn(!immediate && "[animation:fade-in_var(--duration-base)_var(--ease-out)_200ms_both]", className)}
    >
      {children}
    </div>
  );
}

/** 목록 줄 스켈레톤: 이름 + 보조 한 줄 + 오른쪽 배지 */
export function SkeletonRows({ rows = 4, immediate }: { rows?: number; immediate?: boolean }) {
  return (
    <SkeletonGroup immediate={immediate} className="divide-y divide-line-soft">
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

/** 카드 격자 스켈레톤 (선생님 홈 학생 칸 모양). cardClassName으로 실제 칸 높이에 맞춘다 */
export function SkeletonCards({
  count = 6,
  immediate,
  className,
  cardClassName,
}: {
  count?: number;
  immediate?: boolean;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <SkeletonGroup immediate={immediate} className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("space-y-3 rounded-[var(--radius-card)] bg-bg px-4 py-3.5", cardClassName)}>
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** 선생님 홈 모양: 날짜 · 숫자 줄(6칸) · 반 알약 · 학생 칸 격자 + 오른쪽 상세 칸 (PC). 높이는 실제 화면에 맞춤 (10/8) */
export function SkeletonBoard({ immediate }: { immediate?: boolean }) {
  return (
    <SkeletonGroup immediate={immediate} label="오늘 출결 불러오는 중" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_500px]">
      <div className="space-y-5">
        <Skeleton className="h-7 w-56" />
        <div className="grid h-[80px] grid-cols-6 border-y border-line-soft">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-2">
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
        <Skeleton className="h-11 w-72 max-w-full md:h-9" />
        <SkeletonCards count={6} cardClassName="min-h-[96px] lg:min-h-[107px]" />
      </div>
      <div className="hidden space-y-4 border-l border-line-soft p-5 lg:block">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-6 h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </SkeletonGroup>
  );
}

/** 관리 화면 기본 모양: 제목 · 두 묶음 목록 */
export function SkeletonPage({ immediate }: { immediate?: boolean }) {
  return (
    <SkeletonGroup immediate={immediate} className="space-y-8">
      <div className="space-y-2 border-b border-line-soft pb-4">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <SkeletonRows rows={4} immediate={immediate} />
        <SkeletonRows rows={4} immediate={immediate} />
      </div>
    </SkeletonGroup>
  );
}

/** 원장님 홈 모양 (src/app/admin/page.tsx와 같은 순서·높이): 날짜 줄 · 오늘 숫자 줄 · 확인할 일 · 바로가기 · 보강/메시지 2단 (10/9) */
export function SkeletonAdminHome() {
  return (
    <SkeletonGroup immediate label="홈 불러오는 중" className="space-y-12">
      <div className="space-y-8">
        <div className="flex h-[25px] items-center justify-between gap-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div>
          <Skeleton className="my-[3px] h-3.5 w-16" />
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-5 sm:gap-x-10">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex h-[84px] flex-col justify-center gap-2 py-1.5">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="my-[3px] h-3.5 w-24" />
          <div className="mt-2 divide-y divide-line-soft border-y border-line-soft">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex h-[59px] items-center gap-4">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 flex-1" style={{ maxWidth: `${30 + i * 10}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-hidden">
          <Skeleton className="mr-1 h-3.5 w-12 shrink-0" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-[72px] shrink-0 rounded-full md:h-9" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-10">
        <SkeletonRows rows={3} immediate />
        <SkeletonRows rows={3} immediate />
      </div>
    </SkeletonGroup>
  );
}

/** 준비 중 화면 모양 (src/components/coming-soon.tsx와 같은 자리: 본문 위에서 30%, 아이콘 40 · 제목 · 안내 · [홈으로]) */
export function SkeletonComingSoon() {
  return (
    <SkeletonGroup
      immediate
      className="flex flex-col items-center px-4 pt-[max(1rem,calc((100dvh-113px)*0.3-24px))] lg:pt-[max(1rem,calc((100dvh-65px)*0.3-24px))]"
    >
      <Skeleton className="mb-3 size-10 rounded-full" />
      <Skeleton className="h-[30px] w-32" />
      <Skeleton className="mt-1.5 h-4 w-48" />
      <Skeleton className="mt-5 h-10 w-20 rounded-[var(--radius-control)]" />
    </SkeletonGroup>
  );
}

/** 휴대폰 화면 모양: 맨 위 강조 카드 + 흰 카드 목록 */
export function SkeletonMobile() {
  return (
    <SkeletonGroup className="space-y-7">
      <div className="space-y-3 rounded-[var(--radius-mcard)] bg-card p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-12 w-full rounded-[var(--radius-control)]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="rounded-[var(--radius-mcard)] bg-card px-5">
          <SkeletonRows rows={3} />
        </div>
      </div>
    </SkeletonGroup>
  );
}
