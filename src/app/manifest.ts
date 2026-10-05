import type { MetadataRoute } from "next";

// 앱 설치 정보 (PWA, NOTI-01). 휴대폰 홈 화면·PC 바탕화면에 설치했을 때의 이름·아이콘·색
// Next.js가 /manifest.webmanifest 주소로 자동 제공한다
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "리트 엘리트 · LEET영어학원",
    short_name: "LEET",
    description: "LEET영어학원 출결·숙제·알림",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone", // 주소창 없이 앱처럼
    orientation: "any",
    background_color: "#F6F4F3",
    theme_color: "#B3262E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
