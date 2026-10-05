import { defineConfig } from "@playwright/test";

// 화면 흐름 테스트 (e2e/). 브라우저는 따로 내려받지 않고 설치된 Chrome을 쓴다
// 실행: npm run test:e2e (개발 서버를 자동으로 켠다. 실제 명단 대신 가상 데이터로)
// 로그인 흐름 테스트(e2e/auth.spec.ts)의 시험 계정 비밀번호는 .env.local의 E2E_PASSWORD (없으면 그 테스트만 건너뜀)
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없으면 로그인 흐름 테스트만 건너뛴다
}

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3200",
    channel: "chrome",
    // 가상 데이터 화면 테스트는 출입 통제를 건너뛴다 (src/proxy.ts). auth.spec.ts는 이 머리글을 지운다
    extraHTTPHeaders: { "x-leet-e2e-no-auth": "1" },
  },
  webServer: {
    command: "npx next dev -p 3200",
    url: "http://localhost:3200/login",
    reuseExistingServer: true,
    env: { LEET_REAL_DATA: "0", LEET_E2E: "1" },
  },
});
