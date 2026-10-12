import { cn } from "@/lib/cn";

// 출결 막대 (10/12 원장 홈): 막대는 등원만 초록으로 채우고, 미등원·결석·수업 전은 숫자로만 (범준님 10/12 수정)
// v3(토스 스타일): 두께 6px, 끝 둥글게, 등원 #00C471(arrive) · 빈 칸 page 회색
// 숫자 순서는 어디서나 등원 → 미등원 → 결석 → 수업 전

export type AttendanceCounts = { arrived: number; notArrived: number; absent: number; total: number };

/** 수업 전 = 전체 - 등원 - 미등원 - 결석 */
export function upcomingOf(c: AttendanceCounts) {
  return Math.max(0, c.total - c.arrived - c.notArrived - c.absent);
}

/** 등원만 채우는 막대 (화면 읽기 프로그램에는 네 숫자를 순서대로) */
export function AttendanceBar({ counts, className }: { counts: AttendanceCounts; className?: string }) {
  const label = `등원 ${counts.arrived}, 미등원 ${counts.notArrived}, 결석 ${counts.absent}, 수업 전 ${upcomingOf(counts)} (전체 ${counts.total}명)`;
  const pct = counts.total ? (counts.arrived / counts.total) * 100 : 0;
  return (
    <span role="img" aria-label={label} className={cn("block h-1.5 overflow-hidden rounded-full bg-page", className)}>
      <span
        className="block h-full rounded-full bg-arrive transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-out)]"
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}
