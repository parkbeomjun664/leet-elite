import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 화면 테스트 모드(LEET_E2E=1)에서는 개발 서버의 Next 표시(N 동그라미)를 끈다. 늦게 나타나서 스크린샷 비교가 흔들린다
  ...(process.env.LEET_E2E === "1" ? { devIndicators: false as const } : {}),
  // 10/9 비교용 새 홈 주소는 10/12에 원장님 홈으로 합쳤다 → 예전 주소로 들어오면 넘긴다
  async redirects() {
    return [
      { source: "/admin/home-v2", destination: "/admin", permanent: false },
      { source: "/admin/home-v2/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
