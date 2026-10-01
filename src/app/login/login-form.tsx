"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

// TODO(2단계): Supabase 인증 연결. 지금은 화면 확인용
// 로그인 화면만의 입력칸: 테두리 없이 연한 바탕을 채우고, 누르면 흰 바탕 + 버건디 테두리 (토스·당근식)
const field =
  "h-[52px] w-full rounded-[var(--radius-card)] border border-transparent bg-bg px-4 text-base text-ink placeholder:text-sub/80 transition-colors focus:border-brand focus:bg-card focus:outline-none";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
            inputMode="text"
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
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="비밀번호"
              required
              className={cn(field, "pr-16")}
            />
          </label>
          {/* 휴대폰에서 비밀번호를 잘못 누르기 쉬워서 보기 버튼을 둔다 */}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-2 my-auto h-9 rounded-[var(--radius-control)] px-2.5 text-sm font-semibold text-sub hover:text-ink"
          >
            {showPassword ? "숨기기" : "보기"}
          </button>
        </div>
      </div>

      {/* 로그인 상태 유지 (AUTH-06). TODO(2단계): 체크하면 세션을 오래 유지, 해제하면 브라우저를 닫을 때 로그아웃 */}
      <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[15px] text-ink/80">
        <input type="checkbox" name="keepSignedIn" defaultChecked className="size-[18px] accent-[var(--color-brand)]" />
        로그인 상태 유지
      </label>

      <button
        type="submit"
        className="mt-3 h-[52px] w-full rounded-[var(--radius-card)] bg-brand text-base font-bold text-white transition-colors hover:bg-brand-dark active:bg-brand-dark"
      >
        로그인
      </button>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-brand empty:hidden">
        {message}
      </p>
    </form>
  );
}
