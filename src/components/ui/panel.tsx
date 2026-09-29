import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 흰 바탕 묶음 상자. 제목 줄(선택)과 본문 */
export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-[var(--radius-card)] border border-line bg-card", className)}>
      {(title || actions) && (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line-soft px-4 py-2">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** 화면 맨 위 제목 줄 */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <h1 className="text-[22px] leading-tight font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-sub">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** 구역 제목 + 개수 */
export function SectionTitle({ children, count, actions }: { children: ReactNode; count?: number; actions?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className="flex items-baseline gap-2 text-base font-bold">
        {children}
        {count !== undefined && <span className="text-[15px] font-semibold text-sub tabular">{count}</span>}
      </h2>
      {actions}
    </div>
  );
}

/** 목록이 비었을 때 한 줄 안내 */
export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="border-y border-line-soft py-3.5 text-[15px] text-sub">{children}</p>;
}

/** 숫자 요약 (등원 2, 미등원 1 …) */
export function Stat({ label, value, tone = "text-ink" }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[15px] text-sub">{label}</dt>
      <dd className={cn("text-xl font-bold tabular", tone)}>{value}</dd>
    </div>
  );
}

/** 이름표: 값 목록 (학생 정보 등) */
export function InfoList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-[15px]">
      {items.map((it) => (
        <div key={it.label} className="contents">
          <dt className="text-sub">{it.label}</dt>
          <dd className="min-w-0 break-words">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
