import { defineConfig } from "vitest/config";

// 단위 테스트: src 안의 *.test.ts(x). 화면 흐름 테스트(e2e/, Playwright)는 따로 npm run test:e2e
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // 단위 테스트는 항상 가상 데이터로 (실제 명단 파일이 있어도)
    env: { LEET_REAL_DATA: "0" },
  },
});
