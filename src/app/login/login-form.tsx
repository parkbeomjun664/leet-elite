"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";

// TODO(2단계): Supabase 인증 연결. 지금은 화면 확인용
// 입력칸은 로그인 버튼(lg, 48px)과 높이를 맞춘다. Input에 크기 옵션이 없어 여기서만 높이를 지정
export function LoginForm() {
  const [message, setMessage] = useState("");

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage("로그인 기능은 곧 연결됩니다.");
      }}
    >
      <Field label="아이디" htmlFor="login-id" hint="휴대폰 번호(- 없이) 또는 학원이 정해 준 아이디">
        <Input
          id="login-id"
          name="loginId"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="휴대폰 번호 또는 아이디"
          required
          inputSize="lg"
        />
      </Field>
      <Field label="비밀번호" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required inputSize="lg" />
      </Field>
      {/* 자동 로그인 (AUTH-06). TODO(2단계): 체크하면 세션을 오래 유지, 해제하면 브라우저를 닫을 때 로그아웃 */}
      <div className="flex flex-wrap items-center gap-x-3">
        <Checkbox name="keepSignedIn" defaultChecked label="자동 로그인" className="min-h-11 font-semibold text-ink" />
        <p className="text-sm text-sub">공용 PC에서는 체크를 해제하세요</p>
      </div>
      <Button type="submit" variant="primary" size="lg" className="w-full">
        로그인
      </Button>
      <p role="status" aria-live="polite" className="text-sm text-brand empty:hidden">
        {message}
      </p>
    </form>
  );
}
