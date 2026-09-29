"use client";

import { useState } from "react";

// TODO(2단계): Supabase 인증 연결. 지금은 화면 확인용
export function LoginForm() {
  const [message, setMessage] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage("로그인 기능은 곧 연결됩니다.");
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="login-id" className="block text-sm font-semibold">
          아이디
        </label>
        <input
          id="login-id"
          name="loginId"
          inputMode="tel"
          autoComplete="username"
          placeholder="휴대폰 번호 (- 없이)"
          required
          className="h-12 w-full rounded-[var(--radius-control)] border border-line bg-card px-3.5 text-base placeholder:text-sub/70 focus:border-brand focus:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-semibold">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-[var(--radius-control)] border border-line bg-card px-3.5 text-base focus:border-brand focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="h-12 w-full rounded-[var(--radius-control)] bg-brand text-base font-bold text-white transition-colors hover:bg-brand-dark active:bg-brand-dark"
      >
        로그인
      </button>
      <p role="status" aria-live="polite" className="text-center text-sm text-brand empty:hidden">
        {message}
      </p>
    </form>
  );
}
