import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 스크린샷 비교 (10/6): 주요 화면이 기준 사진과 달라지면 실패한다. 디자인이 의도치 않게 바뀌는 것을 잡는다
// - 서버의 "오늘"은 2026-10-05(월)로 고정(playwright.config.ts LEET_TODAY), 시각은 ?at=, 브라우저 시계도 같은 순간으로
// - 일부러 디자인을 바꾼 날에만 기준 사진을 새로 찍는다: npx playwright test e2e/visual.spec.ts --update-snapshots
//   바뀐 사진(e2e/visual.spec.ts-snapshots/)은 커밋 전에 눈으로 확인한다
// - 기준 사진은 이 컴퓨터(윈도우·설치된 Chrome) 기준. 다른 컴퓨터에서는 글자 그리기가 달라 실패할 수 있다
const NOW = new Date("2026-10-05T16:00:00+09:00");

const SCREENS = [
  ["teacher", "/teacher?at=16:00"],
  ["student", "/student?at=16:00"],
  ["parent", "/parent?at=16:00"],
  ["kiosk", "/kiosk"],
  ["admin", "/admin?at=16:00"],
  ["admin-students", "/admin/students"],
  ["login", "/login"],
] as const;

for (const width of [375, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const [name, path] of SCREENS) {
      test(name, async ({ page }) => {
        await page.clock.setFixedTime(NOW);
        // 글꼴은 font-display: optional이라 첫 방문에는 늦으면 안 쓰인다 → 한 번 열어 받아 둔 뒤 다시 연다
        await gotoReady(page, path);
        await page.evaluate(() => document.fonts.ready);
        await gotoReady(page, path);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`${name}-${width}.png`, {
          fullPage: true,
          // 커서 숨기기(기본값)는 입력칸에 style을 붙여, 아직 하이드레이션 중인 칸과 어긋나 개발 서버 "1 Issue" 표시가 찍힌다 (10/6)
          caret: "initial",
          // 여러 번 돌려도 화소 차이 0이었다(10/6). 작은 색 변화(로고 글자·버튼)도 잡도록 엄격하게
          maxDiffPixels: 50,
        });
      });
    }
  });
}
