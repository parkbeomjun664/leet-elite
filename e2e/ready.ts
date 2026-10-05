import type { Page } from "@playwright/test";

/**
 * 주소로 열고, 화면이 다 들어오고 준비(하이드레이션)가 끝날 때까지 기다린다.
 * - loading.tsx 스켈레톤(aria-busy)이 먼저 보이고 본문이 뒤따라 들어오므로, 스켈레톤이 사라질 때까지
 * - 주소로 바로 연 창(?mode=attendance, ?edit=)은 서버에서 먼저 그려져서, 준비 전에 누르면 반영되지 않거나 되돌아간다
 */
export async function gotoReady(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
  await page.locator('[aria-busy="true"]').first().waitFor({ state: "detached" });
}
