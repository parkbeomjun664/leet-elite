import type { Metadata } from "next";

export const metadata: Metadata = { title: "출결 키패드" };

// 학원 입구 태블릿 전용 화면. 상단 메뉴 없이 키패드만 보여 준다 (KIOSK-01)
// TODO(3단계): 키패드 전용 계정(역할 kiosk)으로 로그인한 경우에만 열리게 서버에서 확인 (KIOSK-06)
export default function KioskLayout({ children }: LayoutProps<"/kiosk">) {
  return <div className="min-h-dvh bg-bg">{children}</div>;
}
