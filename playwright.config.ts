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
    env: { LEET_REAL_DATA: "0" },
  },
});
