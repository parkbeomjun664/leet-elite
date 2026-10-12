import { cn } from "@/lib/cn";

// 출결 막대 (10/12 원장님 홈): 막대는 등원만 초록으로 채우고, 미등원·결석·수업 전은 숫자로만 (범준님 10/12 수정)
// 범례·숫자 순서는 어디서나 등원 → 미등원 → 결석 → 수업 전

export type AttendanceCounts = { arrived: number; notArrived: number; absent: number; total: number };

/** 범례 순서 (등원 → 미등원 → 결석 → 수업 전). 숫자 색: 미등원만 주황, 나머지 ink (결석 글씨에 버건디를 쓰지 않음, 10/9) */
export function attendanceParts(c: AttendanceCounts) {
  const upcoming = Math.max(0, c.total - c.arrived - c.notArrived - c.absent);
  return [
    { key: "arrived", label: "등원", n: c.arrived, num: "text-ink" },
    { key: "notArrived", label: "미등원", n: c.notArrived, num: "text-warn" },
    { key: "absent", label: "결석", n: c.absent, num: "text-ink" },
    { key: "upcoming", label: "수업 전", n: upcoming, num: "text-ink" },
  ] as const;
}

/** 등원만 채우는 막대 */
export function AttendanceBar({ counts, className }: { counts: AttendanceCounts; className?: string }) {
  const label = attendanceParts(counts)
    .map((p) => `${p.label} ${p.n}`)
    .join(", ");
  const pct = counts.total ? (counts.arrived / counts.total) * 100 : 0;
  return (
    <span role="img" aria-label={`${label} (전체 ${counts.total}명)`} className={cn("block h-2 overflow-hidden rounded-full bg-line-soft", className)}>
      <span
        className="block h-full rounded-full bg-ok transition-[width] duration-[var(--duration-base)] ease-[var(--ease-out)]"
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

/** 막대 범례: ● 등원 11 · 미등원 1 · 결석 2 · 수업 전 16 (점은 막대에 있는 등원만, 0인 숫자는 회색) */
export function AttendanceLegend({ counts, className }: { counts: AttendanceCounts; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-sub", className)}>
      {attendanceParts(counts).map((p) => (
        <li key={p.key} className="flex items-center gap-1.5 tabular">
          {p.key === "arrived" && <span aria-hidden className="size-2 rounded-full bg-ok" />}
          {p.label} <b className={cn("font-semibold", p.n > 0 ? p.num : "text-sub")}>{p.n}</b>
        </li>
      ))}
    </ul>
  );
}
