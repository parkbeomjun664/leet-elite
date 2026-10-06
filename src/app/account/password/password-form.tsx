"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN } from "@/lib/auth/password-rule";
import { changePassword, type PasswordState } from "./actions";

// 로그인 화면과 같은 큰 입력칸 (48px)
const field =
  "h-12 w-full rounded-[var(--radius-control)] border border-line bg-card px-4 text-body text-ink placeholder:text-faint focus:border-ink/50 focus:shadow-[0_0_0_3px_var(--color-line-soft)] focus:outline-none aria-invalid:border-brand";

export function PasswordForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  const bad = (f: PasswordState["field"]) => (!pending && state.field === f ? true : undefined);
  return (
    // 브라우저 기본 검사(영어·기기마다 다른 말풍선) 대신 서버의 한국어 안내를 보여 준다
    <form action={action} noValidate className="space-y-2.5">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block">
        <span className="mb-1 block px-1 text-caption text-sub">새 비밀번호 ({PASSWORD_MIN}자 이상)</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} aria-invalid={bad("password")} className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block px-1 text-caption text-sub">한 번 더</span>
        <input name="confirm" type="password" autoComplete="new-password" required aria-invalid={bad("confirm")} className={field} />
      </label>
      <p role="alert" className="px-1 text-caption text-brand empty:hidden">
        {!pending && state.error}
      </p>
      <Button type="submit" variant="primary" size="lg" state={pending ? "loading" : "idle"} className="mt-2 w-full">
        비밀번호 바꾸기
      </Button>
    </form>
  );
}
