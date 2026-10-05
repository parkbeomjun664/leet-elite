import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_zayZX/chat";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  // 위쪽에 아주 옅은 버건디 빛이 도는 흰 화면. 로고 → 입력칸 → 문의 안내를 가운데 한 줄로
  // 세로는 가운데보다 조금 위 (아래 여백 10vh). 휴대폰 키보드가 올라와도 입력칸이 화면 위쪽이라 가려지지 않는다
  return (
    <main className="flex min-h-dvh flex-col items-center bg-card justify-center px-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(10vh+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-[400px]">
        {/* 학원 로고 (가운데) */}
        <h1 className="flex items-center justify-center gap-2.5">
          <Image src="/brand/leet-mark.png" alt="" width={407} height={512} priority className="h-12 w-auto" />
          <span className="text-[28px] font-extrabold tracking-tight text-brand">LEET</span>
          <span className="text-[28px] font-bold tracking-tight text-ink">영어학원</span>
        </h1>

        <div className="mt-10">
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>

        {/* 문의 안내: 줄로 나누고 가운데에 짧게 */}
        <div className="mt-8 border-t border-line-soft pt-6 text-center">
          <p className="text-caption text-sub">아이디나 비밀번호를 잊으셨나요?</p>
          <a
            href={KAKAO_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center gap-1 px-2 text-body font-semibold text-ink hover:underline"
          >
            카카오톡으로 학원에 문의하기
            <span aria-hidden className="text-sub">›</span>
          </a>
        </div>
      </div>
    </main>
  );
}
