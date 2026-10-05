import type { Page } from "@playwright/test";

/**
 * 주소로 열고 화면 준비(하이드레이션)가 끝날 때까지 기다린다.
 * 주소로 바로 연 창(?mode=attendance, ?edit=)은 서버에서 먼저 그려져서, 준비 전에 누르면 반영되지 않거나 되돌아간다
 */
export async function gotoReady(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}
