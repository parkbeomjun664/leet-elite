import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_zayZX/chat";

export default function LoginPage() {
  // 흰 화면에 안내 문장과 입력칸만 둔다. PC에서는 가운데, 휴대폰에서는 위에서부터
  return (
    <main className="flex min-h-dvh flex-col bg-card px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:items-center md:justify-center md:py-12">
      <div className="w-full md:max-w-[400px]">
        {/* 앱 상단 메뉴와 같은 로고 */}
        <div className="flex items-center gap-2">
          <Image src="/brand/leet-mark.png" alt="" width={407} height={512} priority className="h-8 w-auto" />
          <span className="text-lg font-extrabold tracking-tight text-brand">LEET</span>
          <span className="text-lg font-bold tracking-tight text-ink">영어학원</span>
        </div>

        <h1 className="mt-12 text-[26px] leading-[1.35] font-bold tracking-tight md:mt-10">
          학원에서 받은 계정으로
          <br />
          로그인해 주세요
        </h1>

        <div className="mt-8">
          <LoginForm />
        </div>

        <p className="mt-8 text-[15px] leading-relaxed text-sub">
          아이디나 비밀번호가 기억나지 않으면
          <br />
          <a
            href={KAKAO_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
          >
            카카오톡으로 학원에 문의
          </a>
          해 주세요.
        </p>
      </div>
    </main>
  );
}
