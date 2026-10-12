import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 원장님 홈 (10/9 v2 → 10/12 정식 홈): 사이드바 · 오늘 시간표 타임라인 · 처리할 일
// 시험 날짜는 2026-10-05(월) 고정, 시각은 ?at=16:00
test.describe("원장님 홈 PC", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("사이드바·한 문장 요약·출결 색 막대·시간순 블록·지금 가로선", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const side = page.getByRole("navigation", { name: "주 메뉴" });
    await expect(side.getByRole("link")).toHaveCount(7);
    await expect(side.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("p[aria-live]").filter({ visible: true })).toHaveText(/^(지금 \d+개 반 수업 중|지금 수업 중인 반은 없어요) · 등원 \d+\/\d+ · 결석 \d+$/);

    const timeline = page.getByRole("list", { name: "오늘 시간표" });
    const starts = await timeline.locator("li a > span:first-child > span:first-child").allInnerTexts();
    expect(starts.length).toBeGreaterThan(0);
    expect(starts).toEqual([...starts].sort()); // 시간순
    await expect(timeline.getByRole("listitem", { name: "지금 16:00" })).toBeVisible();

    // 오늘 전체 출결: 상태별로 나눈 막대 + 범례 (등원·미등원·결석·수업 전)
    await expect(page.getByRole("img", { name: /^등원 \d+, 미등원 \d+, 결석 \d+, 수업 전 \d+ \(전체 \d+명\)$/ }).first()).toBeVisible();
  });

  test("다른 원장님 화면도 같은 사이드바, 접으면 아이콘만 + 하위 메뉴 줄, 다시 열어도 기억", async ({ page }) => {
    await gotoReady(page, "/admin/students");
    const side = page.getByRole("navigation", { name: "주 메뉴" });
    await expect(side.getByRole("link", { name: "재원생" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("navigation", { name: "학생관리 하위 메뉴" })).toBeHidden();

    await page.getByRole("button", { name: "메뉴 접기" }).click();
    const aside = page.getByRole("complementary", { name: "원장님 메뉴" });
    await expect.poll(async () => (await aside.boundingBox())!.width).toBe(64);
    await expect(side.getByRole("link", { name: "학생관리" })).toBeVisible(); // 아이콘만, 이름은 aria-label
    await expect(page.getByRole("navigation", { name: "학생관리 하위 메뉴" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "메뉴 펼치기" })).toBeVisible();
    await page.getByRole("button", { name: "메뉴 펼치기" }).click();
    await expect.poll(async () => (await aside.boundingBox())!.width).toBe(220);
  });

  test("예전 주소 /admin/home-v2 는 홈으로", async ({ page }) => {
    await page.goto("/admin/home-v2?at=16:00");
    await expect(page).toHaveURL(/\/admin\?at=16/);
  });

  test("반 블록을 누르면 그 반을 골라 둔 출결 화면", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const block = page.getByRole("list", { name: "오늘 시간표" }).locator('a[href^="/teacher?class="]').first();
    const href = (await block.getAttribute("href"))!;
    await block.click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === href);
    await expect(page.getByRole("group", { name: "반으로 거르기" }).getByRole("button", { pressed: true })).not.toHaveText(/전체 반/);
  });

  test("처리할 일: 누르면 바로 사라지고, 저장이 실패하면 다시 나타난다", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
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

test.describe("원장님 홈 휴대폰 375", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("요약 → 처리할 일 한 줄 → 지금 수업 중(미등원 이름) → 다음 수업, 아래 탭 5개", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    await expect(page.getByRole("heading", { name: /^지금 수업 중/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "다음 수업" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "아래 메뉴" }).getByRole("link");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.first()).toHaveAttribute("aria-current", "page");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // 처리할 일 한 줄 → 목록 화면
    await page.getByRole("link", { name: /^처리할 일/ }).click();
    await expect(page).toHaveURL(/\/admin\/todo/);
    await expect(page.getByRole("heading", { level: 1, name: "처리할 일" })).toBeVisible();
    // 더보기
    await tabs.last().click();
    await expect(page).toHaveURL(/\/admin\/more/);
    await expect(page.getByRole("link", { name: "기존 홈 보기 (비교용)" })).toHaveCount(0);
  });
});
