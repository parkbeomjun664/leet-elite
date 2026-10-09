"use client";

import { useActionState, useState } from "react";
import { CapsLockNote } from "@/components/caps-lock-note";
import { useCapsLock } from "@/lib/use-caps-lock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { login } from "./actions";
import type { LoginState } from "./messages";

// 로그인 확인은 서버 함수(actions.ts)가 한다. 이 화면은 빈 칸 확인과 결과 표시만
// 로그인 화면만의 입력칸: 흰 바탕 + 연한 테두리
// - 커서가 들어가면: 진한 회색 테두리 (버건디는 에러에만 써서 헷갈리지 않게)
// - 에러(aria-invalid)면: 버건디 테두리 + 옅은 버건디 빛
const field =
  "h-12 w-full rounded-[var(--radius-control)] border border-line bg-card px-4 text-body text-ink placeholder:text-faint transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus:border-ink/50 focus:shadow-[0_0_0_3px_var(--color-line-soft)] focus:outline-none aria-invalid:border-brand aria-invalid:focus:border-brand aria-invalid:focus:shadow-[0_0_0_3px_var(--color-brand-tint)]";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

type FieldName = "id" | "password";
const EMPTY_MESSAGE: Record<FieldName, string> = {
  id: "아이디를 입력해 주세요.",
  password: "비밀번호를 입력해 주세요.",
};

/** 입력칸 바로 아래 붙는 에러 문장. 에러가 없으면 아무것도 그리지 않는다 */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 px-1 text-caption text-brand">
      {message}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  // 빈 칸으로 [로그인]을 누르면 서버 결과 문구는 숨긴다 (새로 보낼 때 다시 보임)
  const [hideResult, setHideResult] = useState(false);
  // 칸마다 따로 에러를 둔다. 입력하는 동안은 띄우지 않고, 칸을 벗어날 때(blur)나 [로그인]을 누를 때만 확인
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  // 눈 아이콘을 누르고 있는 동안만 비밀번호를 보여 준다 (떼면 다시 가림)
  const [peek, setPeek] = useState(false);
  // Caps Lock이 켜져 있으면 비밀번호 칸 아래에 알려 준다 (대문자로 들어가 틀리는 일 방지)
  const { capsLock, capsLockHandlers } = useCapsLock();
  const show = () => setPeek(true);
  const hide = () => setPeek(false);

  const check = (name: FieldName, value: string) => (name === "id" ? !value.trim() : !value) ? EMPTY_MESSAGE[name] : undefined;
  const setError = (name: FieldName, msg: string | undefined) => setErrors((prev) => ({ ...prev, [name]: msg }));
  // 다시 입력을 시작하면 그 칸의 에러만 바로 지운다
  const clearError = (name: FieldName) => errors[name] && setError(name, undefined);

  return (
    <form
      noValidate
      action={action}
      onSubmit={(e) => {
        const form = e.currentTarget;
        const idInput = form.elements.namedItem("loginId") as HTMLInputElement;
        const pwInput = form.elements.namedItem("password") as HTMLInputElement;
        const empty = { id: check("id", idInput.value), password: check("password", pwInput.value) };
        setErrors(empty);
        if (empty.id || empty.password) {
          e.preventDefault();
          setHideResult(true);
          // 비어 있는 첫 칸으로 커서를 옮긴다
          (empty.id ? idInput : pwInput).focus();
          return;
        }
        setHideResult(false);
      }}
    >
      {/* 로그인 뒤 돌아갈 주소 (로그인 전에 열려던 화면) */}
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="block">
          <span className="sr-only">아이디</span>
          <input
            name="loginId"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="휴대폰 번호 또는 아이디"
            defaultValue={state.loginId}
            key={`id-${state.loginId ?? ""}`}
            required
            aria-invalid={errors.id ? true : undefined}
            aria-describedby={errors.id ? "login-id-error" : undefined}
            onInput={() => clearError("id")}
            onBlur={(e) => setError("id", check("id", e.currentTarget.value))}
            className={field}
          />
        </label>
        <FieldError id="login-id-error" message={errors.id} />
      </div>

      <div className="mt-2.5">
        <div className="relative">
          <label className="block">
            <span className="sr-only">비밀번호</span>
            <input
              name="password"
              type={peek ? "text" : "password"}
              autoComplete="current-password"
              placeholder="비밀번호"
              required
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={[errors.password && "login-password-error", capsLock && "login-caps-lock"].filter(Boolean).join(" ") || undefined}
              onInput={() => clearError("password")}
              onKeyDown={capsLockHandlers.onKeyDown}
              onKeyUp={capsLockHandlers.onKeyUp}
              onBlur={(e) => {
                capsLockHandlers.onBlur();
                setError("password", check("password", e.currentTarget.value));
              }}
              className={cn(field, "pr-14")}
            />
          </label>
          <button
            type="button"
            aria-label="누르고 있는 동안 비밀번호 보기"
            onPointerDown={(e) => {
              // 입력칸의 커서가 빠지지 않게 (빠지면 비밀번호 칸 에러가 뜬다)
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
              "press absolute inset-y-0 right-1.5 my-auto grid size-10 touch-none place-items-center rounded-[var(--radius-control)] select-none",
              peek ? "text-ink" : "text-sub hover:text-ink",
            )}
          >
            <EyeIcon open={peek} />
          </button>
        </div>
        <FieldError id="login-password-error" message={errors.password} />
        <CapsLockNote id="login-caps-lock" on={capsLock} />
      </div>

      {/* 로그인 상태 유지 (AUTH-06). 기본은 꺼짐: 공용 PC·태블릿에서 다음 사람이 그대로 로그인되지 않게
          체크하면 30일, 안 하면 브라우저를 닫을 때 로그아웃 (src/lib/supabase/cookies.ts) */}
      <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-body text-ink">
        <input type="checkbox" name="keepSignedIn" defaultChecked={state.keep} key={`keep-${state.keep ?? ""}`} className="size-[18px] accent-[var(--color-ink)]" />
        로그인 상태 유지
      </label>

      <Button type="submit" variant="primary" size="lg" state={pending ? "loading" : "idle"} className="mt-2 w-full">
        로그인
      </Button>
      <p role="status" aria-live="polite" className="mt-3 text-center text-caption text-brand empty:hidden">
        {!pending && !hideResult && state.error}
        {!pending && !hideResult && state.hint && <span className="block text-sub">{state.hint}</span>}
      </p>
    </form>
  );
}
