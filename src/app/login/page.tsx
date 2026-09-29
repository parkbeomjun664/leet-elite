import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_zayZX/chat";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/brand/leet-logo.png"
            alt="LEET영어학원"
            width={1414}
            height={2000}
            priority
            // 원본 PNG가 흰 배경이라 베이지 바탕 위에서 흰 네모가 보이지 않도록 곱하기 합성
            className="h-24 w-auto object-contain mix-blend-multiply"
          />
          <p className="mt-3 text-[13px] font-bold tracking-[0.14em] text-brand">LEET ELITE</p>
          <h1 className="mt-1 text-2xl font-bold">리트 엘리트</h1>
          <p className="mt-1 text-sm text-sub">LEET영어학원</p>
        </div>

        <section className="rounded-[var(--radius-card)] border border-line bg-card p-6 shadow-[0_1px_2px_rgba(60,30,30,0.05)]">
          <LoginForm />
        </section>

        <div className="mt-6 space-y-2 text-center text-[13px] text-sub">
          <p>계정은 학원에서 발급해 드립니다.</p>
          <p>
            아이디나 비밀번호를 잊으셨나요?{" "}
            <a
              href={KAKAO_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand underline-offset-2 hover:underline"
            >
              카카오톡으로 문의하기
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
