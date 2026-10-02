import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { title: "시연" };

// 시연용 화면 고르기 (10/2, 원장님 시연). 로그인 연결 전까지 1234/1234로 들어오면 여기로 온다.
// 모든 화면은 가상(시험용) 데이터이고, 입력한 내용은 저장되지 않는다
const ROLES = [
  { href: "/admin", label: "원장님 화면", desc: "학원 현황, 학생·반·선생님 관리" },
  { href: "/teacher", label: "선생님 화면", desc: "오늘 출결, 학생 상세, 숙제 등록" },
  { href: "/student", label: "학생 화면 (휴대폰)", desc: "오늘 할 숙제, 제출, 메시지" },
  { href: "/parent", label: "학부모 화면 (휴대폰)", desc: "등원·하원, 숙제, 결석 신청" },
  { href: "/kiosk", label: "출결 키패드 (학원 입구)", desc: "번호를 누르면 등원·하원. 예: 1004" },
];

export default function DemoPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-card px-6 py-12">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center justify-center gap-2.5">
          <Image src="/brand/leet-mark.png" alt="" width={407} height={512} priority className="h-10 w-auto" />
          <span className="text-2xl font-extrabold tracking-tight text-brand">LEET</span>
          <span className="text-2xl font-bold tracking-tight text-ink">영어학원</span>
        </div>
        <h1 className="mt-8 text-xl font-bold">어떤 화면을 볼까요?</h1>
        <p className="mt-1 text-sm text-sub">시연용입니다. 학생 이름·번호는 모두 가짜이고, 입력한 내용은 저장되지 않습니다.</p>
        <ul className="mt-6 space-y-2">
          {ROLES.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="flex min-h-16 items-center justify-between gap-3 rounded-[var(--radius-card)] bg-bg px-4 py-3 transition-colors hover:bg-line-soft">
                <span>
                  <span className="block text-[15px] font-semibold">{r.label}</span>
                  <span className="mt-0.5 block text-[13px] text-sub">{r.desc}</span>
                </span>
                <span className="text-sub" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-[13px] text-sub">
          다른 화면을 보려면 브라우저의 뒤로 가기로 이 화면에 돌아오세요.
        </p>
      </div>
    </main>
  );
}
