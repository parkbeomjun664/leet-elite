import type { Metadata, Viewport } from "next";
import "./globals.css";
import { usingRealData } from "@/lib/mock/data";

export const metadata: Metadata = {
  title: {
    default: "리트 엘리트",
    template: "%s · 리트 엘리트",
  },
  description: "LEET영어학원 학원 관리 앱",
  applicationName: "LEET Elite",
};

export const viewport: Viewport = {
  themeColor: "#B3262E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        {children}
        {/* 실제 명단으로 보는 중이면 화면 아래에 항상 표시 (캡처해서 밖으로 보내는 실수 방지) */}
        {usingRealData && (
          <p className="pointer-events-none fixed top-[68px] right-3 z-50 rounded-[var(--radius-control)] bg-ink/85 px-2.5 py-1 text-xs font-semibold text-white">
            실제 명단 사용 중 · 이 컴퓨터에서만 · 캡처 공유 금지
          </p>
        )}
      </body>
    </html>
  );
}
