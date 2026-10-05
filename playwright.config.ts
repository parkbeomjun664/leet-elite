import { defineConfig } from "@playwright/test";

// 화면 흐름 테스트 (e2e/). 브라우저는 따로 내려받지 않고 설치된 Chrome을 쓴다
// 실행: npm run test:e2e (개발 서버를 자동으로 켠다. 실제 명단 대신 가상 데이터로)
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3200", channel: "chrome" },
  webServer: {
    command: "npx next dev -p 3200",
    url: "http://localhost:3200/login",
    reuseExistingServer: true,
    // 출입 통제(로그인)는 끄고 가상 데이터 화면만 본다. 로그인 흐름은 e2e/auth.spec.ts가 따로 확인
    env: { LEET_REAL_DATA: "0", LEET_E2E_NO_AUTH: "1" },
  },
});
