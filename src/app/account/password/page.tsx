import type { Metadata } from "next";
import { LogoutButton } from "@/components/logout-button";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "비밀번호 바꾸기" };

// 첫 로그인이거나 원장님이 비밀번호를 새로 발급한 뒤 (AUTH-03·04). 바꾸기 전에는 다른 화면에 못 간다 (proxy)
export default async function PasswordPage({ searchParams }: PageProps<"/account/password">) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-card px-6 pt-[env(safe-area-inset-top,0px)] pb-[calc(10vh+env(safe-area-inset-bottom,0px))]">
      <div className="w-full max-w-[400px]">
        <h1 className="text-title font-bold tracking-tight">비밀번호를 바꿔 주세요</h1>
        <p className="mt-1.5 mb-8 text-body text-sub">학원에서 받은 비밀번호 대신, 앞으로 쓸 비밀번호를 정해 주세요.</p>
        <PasswordForm next={typeof next === "string" ? next : undefined} />
        <div className="mt-6 flex justify-center">
          <LogoutButton className="text-caption" />
        </div>
      </div>
    </main>
  );
}
