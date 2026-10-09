import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 10/9 원장님 새 홈 (/admin/home-v2, 비교용): 사이드바 · 오늘 시간표 타임라인 · 처리할 일
// 시험 날짜는 2026-10-05(월) 고정, 시각은 ?at=16:00
test.describe("원장님 새 홈 PC", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("사이드바·한 문장 요약·시간순 블록·지금 가로선, 기존 홈은 상단 메뉴 그대로", async ({ page }) => {
    await gotoReady(page, "/admin/home-v2?at=16:00");
    const side = page.getByRole("navigation", { name: "주 메뉴" });
    await expect(side.getByRole("link")).toHaveCount(7);
    await expect(side.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(/지금 .*수업 중|지금 수업 중인 반은 없어요/)).toBeVisible();

    const timeline = page.getByRole("list", { name: "오늘 시간표" });
    const starts = await timeline.locator("li a > span:first-child > span:first-child").allInnerTexts();
    expect(starts.length).toBeGreaterThan(0);
    expect(starts).toEqual([...starts].sort()); // 시간순
    await expect(timeline.getByRole("listitem", { name: "지금 16:00" })).toBeVisible();

    // 기존 홈은 그대로 (상단 메뉴, 사이드바 없음)
    await gotoReady(page, "/admin");
    await expect(page.locator("header.sticky").getByRole("link", { name: "학생관리" })).toBeVisible();
    await expect(page.locator("aside nav")).toHaveCount(0);
  });

  test("반 블록을 누르면 그 반을 골라 둔 출결 화면", async ({ page }) => {
    await gotoReady(page, "/admin/home-v2?at=16:00");
    const block = page.getByRole("list", { name: "오늘 시간표" }).locator('a[href^="/teacher?class="]').first();
    const href = (await block.getAttribute("href"))!;
    await block.click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === href);
    await expect(page.getByRole("group", { name: "반으로 거르기" }).getByRole("button", { pressed: true })).not.toHaveText(/전체 반/);
  });

  test("처리할 일: 누르면 바로 사라지고, 저장이 실패하면 다시 나타난다", async ({ page }) => {
    await gotoReady(page, "/admin/home-v2?at=16:00");
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: /^처리할 일/ }) });
    const first = panel.locator("ul > li").first();
    const title = (await first.locator("span.font-bold").first().innerText()).trim();
    const before = await panel.getByRole("heading").innerText();
    await first.getByRole("button").click();
    await expect(panel.getByText(title, { exact: true })).toHaveCount(0);
    await expect(panel.getByRole("heading")).not.toHaveText(before);
    await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "success");

    // 실패 흉내: 다시 나타나고 실패 안내
    await page.evaluate(() => (window.__leetFailSave = true));
    const next = panel.locator("ul > li").first();
    const title2 = (await next.locator("span.font-bold").first().innerText()).trim();
    await next.getByRole("button").click();
    await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "error");
    await expect(panel.getByText(title2, { exact: true })).toBeVisible();
  });
});
