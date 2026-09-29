import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인" };

const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_zayZX/chat";

// 로고는 흰 배경 PNG라 흰 네모 위에 곱하기 합성으로 올린다
function LogoMark({ className }: { className: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius-card)] bg-card ${className}`}>
      <Image src="/brand/leet-logo.png" alt="" width={1414} height={2000} priority className="h-[88%] w-auto mix-blend-multiply" />
    </span>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-card md:grid md:grid-cols-[minmax(360px,5fr)_7fr]">
      {/* 휴대폰: 위쪽 버건디 줄 */}
      <header className="bg-brand-dark pt-[env(safe-area-inset-top,0px)] text-white md:hidden">
        <div className="flex h-16 items-center gap-3 px-5">
          <LogoMark className="size-10" />
          <div className="leading-tight">
            <p className="text-base font-bold">LEET영어학원</p>
            <p className="text-[13px] text-white/80">리트 엘리트</p>
          </div>
        </div>
      </header>

      {/* PC: 왼쪽 버건디 패널 */}
      <aside className="hidden flex-col justify-between bg-brand-dark px-12 py-12 text-white md:flex lg:px-16">
        <div className="flex items-center gap-4">
          <LogoMark className="size-16" />
          <div className="leading-tight">
            <p className="text-2xl font-bold tracking-tight">LEET영어학원</p>
            <p className="mt-1 text-base text-white/80">리트 엘리트</p>
          </div>
        </div>

        <div className="max-w-[360px]">
          <p className="text-[22px] leading-snug font-bold">출결·숙제·알림을 한곳에서</p>
          <ul className="mt-5 space-y-3 border-l-2 border-white/30 pl-4 text-[15px] text-white/85">
            <li>학원 입구에서 찍은 등원·하원을 바로 확인합니다.</li>
            <li>숙제를 내고, 제출과 피드백을 한 화면에서 봅니다.</li>
            <li>학부모님께 보내는 메시지와 알림도 여기서 보냅니다.</li>
          </ul>
        </div>

        <p className="text-[13px] text-white/70">LEET영어학원 학생·학부모·선생님 전용</p>
      </aside>

      {/* 로그인 폼 */}
      <section className="flex flex-1 flex-col px-5 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] md:justify-center md:px-12 md:py-12">
        <div className="mx-auto w-full max-w-[480px] md:max-w-[400px]">
          <h1 className="text-[22px] font-bold tracking-tight md:text-2xl">로그인</h1>
          <p className="mt-1 text-[15px] text-sub">학원에서 받은 아이디와 비밀번호를 입력해 주세요.</p>

          <div className="mt-6 border-t border-line pt-6">
            <LoginForm />
          </div>

          <div className="mt-8 space-y-1.5 border-t border-line-soft pt-5 text-sm text-sub">
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
      </section>
    </main>
  );
}
