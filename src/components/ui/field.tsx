import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[var(--radius-control)] border border-line bg-card px-3 text-[15px] text-ink placeholder:text-sub/70 focus:border-brand focus:outline-none disabled:bg-line-soft disabled:text-sub";

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
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </label>
      {children}
      {error ? <p className="text-sm text-brand">{error}</p> : hint ? <p className="text-sm text-sub">{hint}</p> : null}
    </div>
  );
}

/** inputSize: md 40px(기본) / lg 48px(로그인처럼 휴대폰에서 주로 쓰는 입력) */
export function Input({ className, inputSize = "md", ...rest }: ComponentProps<"input"> & { inputSize?: "md" | "lg" }) {
  return <input className={cn(control, inputSize === "lg" ? "h-12 text-base" : "h-10", className)} {...rest} />;
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

export function Checkbox({ label, className, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-[15px]", className)}>
      <input type="checkbox" className="size-4 accent-[var(--color-brand)]" {...rest} />
      {label}
    </label>
  );
}

export function Radio({ label, className, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-[15px]", className)}>
      <input type="radio" className="size-4 accent-[var(--color-brand)]" {...rest} />
      {label}
    </label>
  );
}
