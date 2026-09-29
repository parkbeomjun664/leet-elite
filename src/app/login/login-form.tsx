"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

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
      <Button type="submit" variant="primary" size="lg" className="w-full">
        로그인
      </Button>
      <p role="status" aria-live="polite" className="text-sm text-brand empty:hidden">
        {message}
      </p>
    </form>
  );
}
