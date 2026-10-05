import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

// 주(빨강)는 화면마다 하나. 비활성은 회색이라 분홍처럼 보이지 않는다 (docs/design.md 4번)
const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark disabled:bg-line-soft disabled:text-faint",
  secondary: "border border-line bg-card text-ink hover:bg-bg active:bg-line-soft disabled:text-faint",
  ghost: "text-ink hover:bg-line-soft active:bg-line-soft disabled:text-faint",
  // 삭제·퇴원처럼 되돌리기 어려운 행동: 보조 모양 + 빨강 글씨
  danger: "border border-line bg-card text-brand hover:bg-brand-tint active:bg-brand-tint disabled:text-faint",
};

// 높이: sm 32(카드 안) / md 40(기본) / lg 48(휴대폰 주 버튼·로그인·시트 아래)
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-caption",
  md: "h-10 px-4 text-body",
  lg: "h-12 px-5 text-body",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return cn(
    "press inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] font-semibold whitespace-nowrap select-none disabled:cursor-not-allowed",
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
