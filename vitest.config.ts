import { defineConfig } from "vitest/config";

// 단위 테스트: src 안의 *.test.ts(x). 화면 흐름 테스트(e2e/, Playwright)는 따로 npm run test:e2e
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
