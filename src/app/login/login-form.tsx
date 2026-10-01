"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

// TODO(2단계): Supabase 인증 연결. 지금은 화면 확인용
// 로그인 화면만의 입력칸: 흰 바탕 + 연한 테두리, 누르면 버건디 테두리와 옅은 버건디 테두리 빛
const field =
  "h-[52px] w-full rounded-[var(--radius-card)] border border-line bg-card px-4 text-base text-ink placeholder:text-sub/70 transition-[border-color,box-shadow] focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-tint)] focus:outline-none";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

export function LoginForm() {
  const [message, setMessage] = useState("");
  // 눈 아이콘을 누르고 있는 동안만 비밀번호를 보여 준다 (떼면 다시 가림)
  const [peek, setPeek] = useState(false);
  const show = () => setPeek(true);
  const hide = () => setPeek(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMessage("로그인 기능은 곧 연결됩니다.");
      }}
    >
      <div className="space-y-2.5">
        <label className="block">
          <span className="sr-only">아이디</span>
          <input
            name="loginId"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="휴대폰 번호 또는 아이디"
            required
            className={field}
          />
        </label>
        <div className="relative">
          <label className="block">
            <span className="sr-only">비밀번호</span>
            <input
              name="password"
              type={peek ? "text" : "password"}
              autoComplete="current-password"
              placeholder="비밀번호"
              required
              className={cn(field, "pr-14")}
            />
          </label>
          <button
            type="button"
            aria-label="누르고 있는 동안 비밀번호 보기"
            onPointerDown={(e) => {
              // 입력칸의 커서가 빠지지 않게
              e.preventDefault();
              show();
            }}
            onPointerUp={hide}
            onPointerLeave={hide}
            onPointerCancel={hide}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                show();
              }
            }}
            onKeyUp={hide}
            onBlur={hide}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "absolute inset-y-0 right-1.5 my-auto grid size-10 touch-none place-items-center rounded-[var(--radius-control)] select-none",
              peek ? "text-brand" : "text-sub hover:text-ink",
            )}
          >
            <EyeIcon open={peek} />
          </button>
        </div>
      </div>

      {/* 로그인 상태 유지 (AUTH-06). TODO(2단계): 체크하면 세션을 오래 유지, 해제하면 브라우저를 닫을 때 로그아웃 */}
      <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[15px] text-ink/80">
        <input type="checkbox" name="keepSignedIn" defaultChecked className="size-[18px] accent-[var(--color-brand)]" />
        로그인 상태 유지
      </label>

      <button
        type="submit"
        className="mt-2 h-[52px] w-full rounded-[var(--radius-card)] bg-brand text-base font-bold text-white transition-colors hover:bg-brand-dark active:bg-brand-dark"
      >
        로그인
      </button>
      <p role="status" aria-live="polite" className="mt-3 text-center text-sm text-brand empty:hidden">
        {message}
      </p>
    </form>
  );
}
