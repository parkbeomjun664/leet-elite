import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_zayZX/chat";

// 로고는 흰 배경 PNG라 흰 네모 위에 곱하기 합성으로 올린다
function LogoMark({ className }: { className: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius-card)] bg-card ${className}`}>
      <Image src="/brand/leet-mark.png" alt="" width={407} height={512} priority className="h-[70%] w-auto" />
    </span>
  );
}

export default function LoginPage() {
  // 로고와 로그인 창을 화면 가운데에 둔다 (휴대폰·PC 같은 구조)
  return (
    <main className="flex min-h-dvh flex-col items-center bg-bg px-5 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] md:justify-center md:py-12">
      <div className="w-full max-w-[420px]">
        {/* 로고 · 학원 이름 */}
        <div className="flex flex-col items-center text-center">
          <LogoMark className="size-16 border border-line" />
          <p className="mt-3 text-xl font-bold tracking-tight">LEET영어학원</p>
          <p className="mt-0.5 text-[15px] text-sub">리트 엘리트</p>
        </div>

        {/* 로그인 창 */}
        <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-card px-6 py-7 md:px-8">
          <h1 className="text-[22px] font-bold tracking-tight">로그인</h1>
          <p className="mt-1 text-[15px] text-sub">학원에서 받은 아이디와 비밀번호를 입력해 주세요.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </section>

        {/* 도움말 */}
        <div className="mt-5 space-y-1.5 text-center text-sm text-sub">
          <p>계정은 학원에서 발급해 드립니다.</p>
          <p>
            아이디나 비밀번호를 잊으셨나요?{" "}
            <a
              href={KAKAO_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand underline underline-offset-2 hover:text-brand-dark"
            >
              카카오톡으로 문의하기
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
