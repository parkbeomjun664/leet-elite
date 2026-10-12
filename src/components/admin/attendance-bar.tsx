import { cn } from "@/lib/cn";

// 출결 진행 막대 (10/12 원장님 홈): 한 가지 초록 대신 상태별로 나눠 색칠 → 한눈에 "누가 왔고, 안 왔고, 결석인지"
// 색은 상태 토큰만: 등원 초록(ok) · 미등원 주황(warn) · 결석 분홍(결석에만, 막대에서 보이게 버건디를 조금 섞음) · 수업 전 회색(line)

export type AttendanceCounts = { arrived: number; notArrived: number; absent: number; total: number };

const PARTS = [
  { key: "arrived", label: "등원", dot: "bg-ok" },
  { key: "notArrived", label: "미등원", dot: "bg-warn" },
  { key: "absent", label: "결석", dot: "bg-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-brand-tint))]" },
  { key: "upcoming", label: "수업 전", dot: "bg-line" },
] as const;

function parts(c: AttendanceCounts) {
  const upcoming = Math.max(0, c.total - c.arrived - c.notArrived - c.absent);
  const n = { arrived: c.arrived, notArrived: c.notArrived, absent: c.absent, upcoming };
  return PARTS.map((p) => ({ ...p, n: n[p.key] }));
}

/** 상태별로 나눠 색칠한 막대. 칸 사이 1px 틈 */
export function AttendanceBar({ counts, className }: { counts: AttendanceCounts; className?: string }) {
  const ps = parts(counts).filter((p) => p.n > 0);
  const label = parts(counts)
    .map((p) => `${p.label} ${p.n}`)
    .join(", ");
  return (
    <span role="img" aria-label={`${label} (전체 ${counts.total}명)`} className={cn("flex h-2 gap-px overflow-hidden rounded-full bg-line-soft", className)}>
      {counts.total > 0 &&
        ps.map((p) => (
          <span
            key={p.key}
            className={cn("h-full transition-[flex-grow] duration-[var(--duration-base)] ease-[var(--ease-out)]", p.dot)}
            style={{ flexGrow: p.n, flexBasis: 0 }}
          />
        ))}
    </span>
  );
}

/** 막대 범례: ● 등원 12 ● 미등원 1 … (0인 것도 보여 준다, 숫자는 굵게) */
export function AttendanceLegend({ counts, className }: { counts: AttendanceCounts; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-sub", className)}>
      {parts(counts).map((p) => (
        <li key={p.key} className="flex items-center gap-1.5 tabular">
          <span aria-hidden className={cn("size-2 rounded-full", p.dot)} />
          {p.label} <b className={cn("font-semibold", p.n > 0 ? "text-ink" : "text-sub")}>{p.n}</b>
        </li>
      ))}
    </ul>
  );
}
