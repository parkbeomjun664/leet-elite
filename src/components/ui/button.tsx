import { Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
/** 버튼 5가지 상태 중 코드로 정하는 것: 기본(idle) · 로딩(loading) · 완료(done). 누름은 CSS, 비활성은 disabled */
export type ButtonState = "idle" | "loading" | "done";

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
    "press relative inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] font-semibold whitespace-nowrap select-none disabled:cursor-not-allowed",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  /** 로딩·완료 중에는 글자를 투명하게 남겨 버튼 크기를 그대로 두고, 그 위에 빙글 표시·체크를 겹친다 */
  state?: ButtonState;
};

const STATE_LABEL: Record<Exclude<ButtonState, "idle">, string> = { loading: "처리 중", done: "완료" };

export function Button({ variant, size, className, type = "button", state = "idle", children, onClick, ...rest }: ButtonProps) {
  const busy = state !== "idle";
  return (
    <button
      // 로딩·완료 중에는 다시 눌리지 않게 막는다. disabled를 쓰면 회색이 되어 버려서,
      // 누름 함수를 떼고 제출 버튼도 잠시 일반 버튼으로 바꾼다 (이 부품은 서버 화면에서도 쓰여서 감싸는 함수를 만들지 않는다)
      type={busy ? "button" : type}
      onClick={busy ? undefined : onClick}
      className={buttonClass(variant, size, cn(busy && "cursor-default", className))}
      aria-disabled={busy || undefined}
      aria-busy={state === "loading" || undefined}
      data-state={state}
      {...rest}
    >
      <span className={cn("inline-flex items-center gap-1.5", busy && "invisible")}>{children}</span>
      {busy && (
        <span className="absolute inset-0 grid place-items-center">
          {state === "loading" ? (
            <LoaderCircle aria-hidden className="size-[1.15em] animate-spin" strokeWidth={2.25} />
          ) : (
            <Check aria-hidden className="size-[1.2em] animate-pop-in" strokeWidth={2.75} />
          )}
          <span className="sr-only">{STATE_LABEL[state]}</span>
        </span>
      )}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
