"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

// TODO(2단계): Supabase 인증 연결. 지금은 화면 확인용
// 로그인 화면만의 입력칸: 흰 바탕 + 연한 테두리
// - 커서가 들어가면: 진한 회색 테두리 (버건디는 에러에만 써서 헷갈리지 않게)
// - 에러(aria-invalid)면: 버건디 테두리 + 옅은 버건디 빛
const field =
  "h-[52px] w-full rounded-[var(--radius-card)] border border-line bg-card px-4 text-base text-ink placeholder:text-sub/70 transition-[border-color,box-shadow] focus:border-ink/50 focus:shadow-[0_0_0_3px_var(--color-line-soft)] focus:outline-none aria-invalid:border-brand aria-invalid:focus:border-brand aria-invalid:focus:shadow-[0_0_0_3px_var(--color-brand-tint)]";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

// 로그인 실패는 이유와 상관없이 이 문장 하나만 보여 준다 (아이디가 있는지 없는지 드러나지 않게, AUTH-09)
export const LOGIN_ERROR = "아이디 또는 비밀번호가 올바르지 않습니다.";

type FieldName = "id" | "password";
const EMPTY_MESSAGE: Record<FieldName, string> = {
  id: "아이디를 입력해 주세요.",
  password: "비밀번호를 입력해 주세요.",
};

/** 입력칸 바로 아래 붙는 에러 문장. 에러가 없으면 아무것도 그리지 않는다 */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 px-1 text-sm text-brand">
      {message}
    </p>
  );
}

export function LoginForm() {
  const [message, setMessage] = useState("");
  // 칸마다 따로 에러를 둔다. 입력하는 동안은 띄우지 않고, 칸을 벗어날 때(blur)나 [로그인]을 누를 때만 확인
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  // 눈 아이콘을 누르고 있는 동안만 비밀번호를 보여 준다 (떼면 다시 가림)
  const [peek, setPeek] = useState(false);
  const show = () => setPeek(true);
  const hide = () => setPeek(false);

  const check = (name: FieldName, value: string) => (name === "id" ? !value.trim() : !value) ? EMPTY_MESSAGE[name] : undefined;
  const setError = (name: FieldName, msg: string | undefined) => setErrors((prev) => ({ ...prev, [name]: msg }));
  // 다시 입력을 시작하면 그 칸의 에러만 바로 지운다
  const clearError = (name: FieldName) => errors[name] && setError(name, undefined);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const idInput = form.elements.namedItem("loginId") as HTMLInputElement;
        const pwInput = form.elements.namedItem("password") as HTMLInputElement;
        const next = { id: check("id", idInput.value), password: check("password", pwInput.value) };
        setErrors(next);
        if (next.id || next.password) {
          setMessage("");
          // 비어 있는 첫 칸으로 커서를 옮긴다
          (next.id ? idInput : pwInput).focus();
          return;
        }
        // TODO(2단계): 서버에서 로그인 확인. 실패하면 setMessage(LOGIN_ERROR), 너무 많이 틀리면 잠시 막음 (AUTH-10)
        setMessage("로그인 기능은 곧 연결됩니다.");
      }}
    >
      <div>
        <label className="block">
          <span className="sr-only">아이디</span>
          <input
            name="loginId"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="휴대폰 번호 또는 아이디"
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
              aria-describedby={errors.password ? "login-password-error" : undefined}
              onInput={() => clearError("password")}
              onBlur={(e) => setError("password", check("password", e.currentTarget.value))}
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
              "absolute inset-y-0 right-1.5 my-auto grid size-10 touch-none place-items-center rounded-[var(--radius-control)] select-none",
              peek ? "text-ink" : "text-sub hover:text-ink",
            )}
          >
            <EyeIcon open={peek} />
          </button>
        </div>
        <FieldError id="login-password-error" message={errors.password} />
      </div>

      {/* 로그인 상태 유지 (AUTH-06). 기본은 꺼짐: 공용 PC·태블릿에서 다음 사람이 그대로 로그인되지 않게
          TODO(2단계): 체크하면 세션을 오래 유지, 해제하면 브라우저를 닫을 때 로그아웃 */}
      <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-[15px] text-ink/80">
        <input type="checkbox" name="keepSignedIn" className="size-[18px] accent-[var(--color-brand)]" />
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
