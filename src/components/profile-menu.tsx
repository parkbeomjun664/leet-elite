"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/cn";

// 사이드바 맨 아래 프로필 (10/12, 원장님·선생님 공통): 흰 카드 + 이니셜 아바타 + 이름·역할 + ⋯
// 카드(또는 접힌 사이드바의 아바타)를 누르면 위로 작은 메뉴: 내 정보 · 로그아웃(한 번 더 묻고 실행)
// 키보드: Enter·Space로 열고, ↑↓로 고르고, Esc로 닫으면 프로필 버튼으로 돌아온다

type Role = "원장" | "선생님";

/** 이름이 없으면 역할 이름으로 ("원장님"·"선생님") */
export function profileName(name: string | null, role: Role) {
  return name ?? (role === "원장" ? "원장님" : "선생님");
}

function Avatar({ name, size = 40 }: { name: string; size?: 32 | 40 }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand",
        size === 40 ? "size-10 text-body" : "size-8 text-caption",
      )}
    >
      {name.trim().charAt(0)}
    </span>
  );
}

export function ProfileMenu({
  name: rawName,
  role,
  homeHref,
  variant = "card",
}: {
  name: string | null;
  role: Role;
  homeHref: string;
  /** card = 사이드바 아래 카드 / avatar = 접힌 사이드바(아바타만, 메뉴는 위로) / header = 휴대폰 머리줄(아바타만, 메뉴는 아래로) */
  variant?: "card" | "avatar" | "header";
}) {
  const name = profileName(rawName, role);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false); // "로그아웃할까요?" 단계
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = (focusTrigger = true) => {
    setOpen(false);
    setConfirming(false);
    if (focusTrigger) trigger.current?.focus();
  };

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // 열리면(또는 확인 단계로 바뀌면) 첫 항목에 초점
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>("[data-menu] [role=menuitem]")?.focus();
  }, [open, confirming]);

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(root.current?.querySelectorAll<HTMLElement>("[data-menu] [role=menuitem]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  const label = `내 계정 메뉴: ${name} ${role}`;
  const up = variant !== "header";

  return (
    <div ref={root} className={cn("relative", variant === "card" && "w-full")}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        title={variant === "card" ? undefined : label}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "press flex items-center rounded-[var(--radius-pcard)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          variant === "card" ? "w-full gap-3 bg-page p-3 hover:bg-hairline" : "rounded-full", // 흰 사이드바 위 연회색 카드 (10/14)
        )}
      >
        <Avatar name={name} size={variant === "header" ? 32 : 40} />
        {variant === "card" && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-body font-semibold text-strong">{name}</span>
              <span className="mt-0.5 block text-caption text-muted">{role}</span>
            </span>
            {/* ⋯: 카드 전체가 버튼이라 모양만 (32px) */}
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-button-sm)] text-muted-soft">
              <Ellipsis className="size-5" />
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          id={menuId}
          data-menu
          role="menu"
          aria-label={confirming ? "로그아웃 확인" : "내 계정"}
          onKeyDown={onMenuKey}
          className={cn(
            "absolute z-50 w-52 rounded-[var(--radius-pcard)] bg-card p-1.5 shadow-float animate-fade-in",
            up ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2",
          )}
        >
          {confirming ? (
            <div className="p-2">
              <p className="px-1 pb-2 text-body font-semibold text-strong">로그아웃할까요?</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setConfirming(false)}
                  className="press h-9 flex-1 rounded-[var(--radius-button-sm)] bg-page text-caption font-semibold text-strong focus-visible:outline-2 focus-visible:outline-ink"
                >
                  취소
                </button>
                <form action={logout} className="flex-1">
                  <button
                    type="submit"
                    role="menuitem"
                    className="press h-9 w-full rounded-[var(--radius-button-sm)] bg-danger-text text-caption font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    로그아웃
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <Link
                href={`${homeHref}/me`}
                role="menuitem"
                onClick={() => close(false)}
                className="flex h-10 items-center rounded-[var(--radius-button-sm)] px-3 text-body text-strong outline-none hover:bg-page focus-visible:bg-page"
              >
                내 정보
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirming(true)}
                className="flex h-10 w-full items-center rounded-[var(--radius-button-sm)] px-3 text-left text-body text-danger-text outline-none hover:bg-page focus-visible:bg-page"
              >
                로그아웃
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
