import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { timeSelectOptions } from "@/lib/date";

// 폭을 뺀 입력칸 모양 (시간 고르기처럼 폭이 정해진 칸용). cn은 클래스 충돌을 정리하지 않아서 w-full을 따로 둔다
// 초점: 테두리 진하게 + 바깥 3px 옅은 링 / 오류(aria-invalid): 빨강 테두리 (docs/design.md 4번)
const controlBase =
  "rounded-[var(--radius-control)] border border-line bg-card px-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-faint focus:border-ink/50 focus:shadow-[0_0_0_3px_var(--color-line-soft)] focus:outline-none aria-invalid:border-brand aria-invalid:focus:shadow-[0_0_0_3px_var(--color-brand-tint)] disabled:bg-line-soft disabled:text-faint";
const control = `w-full ${controlBase}`;

/** 이름표 + 입력 + 도움말/오류를 묶는 틀 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-caption font-semibold text-sub">
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </label>
      {children}
      {error ? <p className="text-caption text-brand">{error}</p> : hint ? <p className="text-caption text-sub">{hint}</p> : null}
    </div>
  );
}

/** inputSize: md 40px(기본) / lg 48px(로그인처럼 휴대폰에서 주로 쓰는 입력) */
export function Input({ className, inputSize = "md", ...rest }: ComponentProps<"input"> & { inputSize?: "md" | "lg" }) {
  return <input className={cn(control, inputSize === "lg" ? "h-12" : "h-10", className)} {...rest} />;
}

export function Textarea({ className, rows = 3, ...rest }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(control, "py-2 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-10 pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

/**
 * 24시간제 시간 고르기: 시 · 분 선택칸 두 개 (값 "HH:MM"). 휴대폰 설정과 상관없이 항상 "14:30"으로 보인다 (10/5)
 * id는 시 칸에 붙어서 Field의 이름표와 연결된다
 */
export function TimeSelect({
  id,
  value,
  onChange,
  label,
  minuteStep = 1,
  size = "md",
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** 화면 읽기용 이름 (예: "등원 시각"). 시·분 칸에 "… 시", "… 분"으로 붙는다 */
  label: string;
  minuteStep?: number;
  size?: "md" | "lg";
  className?: string;
}) {
  const { hours, minutes } = timeSelectOptions(value, minuteStep);
  const [h = "00", m = "00"] = value.split(":");
  const sizing = size === "lg" ? "h-12" : "h-10";
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <select id={id} aria-label={`${label} 시`} value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)} className={cn(controlBase, "w-[84px] shrink-0 tabular", sizing)}>
        {hours.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className="text-sub" aria-hidden>
        :
      </span>
      <select aria-label={`${label} 분`} value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)} className={cn(controlBase, "w-[84px] shrink-0 tabular", sizing)}>
        {minutes.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Checkbox({ label, className, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-body", className)}>
      <input type="checkbox" className="size-4 accent-[var(--color-ink)]" {...rest} />
      {label}
    </label>
  );
}

export function Radio({ label, className, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-body", className)}>
      <input type="radio" className="size-4 accent-[var(--color-ink)]" {...rest} />
      {label}
    </label>
  );
}
