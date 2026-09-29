import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-brand/40",
  secondary: "border border-line bg-card text-ink hover:border-ink/30 disabled:text-sub",
  ghost: "text-ink/80 hover:bg-line-soft disabled:text-sub",
  danger: "border border-brand/40 bg-card text-brand hover:bg-brand-tint",
};

// 높이: sm 32 / md 40 / lg 48 (휴대폰에서 누르는 버튼은 md 이상)
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[15px]",
  lg: "h-12 px-5 text-base",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
