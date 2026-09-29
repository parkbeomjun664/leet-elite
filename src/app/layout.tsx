import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "리트 엘리트",
    template: "%s · 리트 엘리트",
  },
  description: "LEET영어학원 학원 관리 앱",
  applicationName: "LEET Elite",
};

export const viewport: Viewport = {
  themeColor: "#B72F34",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
