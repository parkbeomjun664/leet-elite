import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 원장님 홈 (10/9 v2 → 10/12 정식 홈): 사이드바 · 오늘 시간표 타임라인 · 처리할 일
// 시험 날짜는 2026-10-05(월) 고정, 시각은 ?at=16:00
test.describe("원장님 홈 PC", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("사이드바·한 문장 요약·등원 막대와 범례·시간순 블록·지금 가로선", async ({ page }) => {
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
    const bar = page.getByRole("img", { name: /^등원 \d+, 미등원 \d+, 결석 \d+, 수업 전 \d+ \(전체 \d+명\)$/ }).first();
    await expect(bar).toBeVisible();
    // 막대는 등원만 채운다 (결석·미등원은 숫자로만, 10/12)
    await expect(bar.locator("span")).toHaveCount(1);
    await expect(bar.locator("span")).toHaveClass(/bg-ok/);
    // 범례 순서: 등원 → 미등원 → 결석 → 수업 전
    const legend = await page.locator("header ul").filter({ visible: true }).first().getByRole("listitem").allInnerTexts();
    expect(legend.map((t) => t.replace(/\s*\d+$/, "").trim())).toEqual(["등원", "미등원", "결석", "수업 전"]);
    // 날짜는 크게 (title 토큰 22px 이상)
    expect(parseFloat(await page.getByRole("heading", { level: 1 }).filter({ visible: true }).evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(22);
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

  test("알림: 받는 사람 수를 보여 주는 확인 창 → 취소하면 그대로, [N명에게 보내기]를 눌러야 사라진다", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: /^처리할 일/ }) });
    const row = panel.locator("ul > li").filter({ has: page.getByRole("button", { name: "알림" }) }).first();
    const title = (await row.locator("span.font-bold").first().innerText()).trim();
    // 알림(테두리)과 답장(회색 면)은 모양이 다르다
    await expect(row.getByRole("button", { name: "알림" })).toHaveCSS("border-top-width", "1px");
    await expect(panel.getByRole("button", { name: "답장" }).first()).toHaveCSS("border-top-width", "0px");

    await row.getByRole("button", { name: "알림" }).click();
    const dialog = page.getByRole("dialog", { name: "알림 보내기" });
    await expect(dialog).toContainText(/\d+명에게 앱 알림을 보냅니다/);
    await dialog.getByRole("button", { name: "취소" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(panel.getByText(title, { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "알림" }).click();
    await page.getByRole("dialog", { name: "알림 보내기" }).getByRole("button", { name: /^\d+명에게 보내기$/ }).click();
    await expect(panel.getByText(title, { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("toast")).toContainText("알림을 보냈어요");
  });

  test("숙제 미제출은 그 반 수업 시작 시각이 지나야 나오고, 처리할 일 개수도 같이 바뀐다", async ({ page }) => {
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: /^처리할 일/ }) });
    const hw = panel.getByText(/숙제 미제출$/);
    const countOf = async () => Number((await panel.getByRole("heading").innerText()).match(/\d+/)![0]);
    // 14:00: 오늘 가장 이른 반(14:30 시작)도 아직 → 숙제 줄 없음
    await gotoReady(page, "/admin?at=14:00");
    await expect(hw).toHaveCount(0);
    const before = await countOf();
    // 16:00: 14:30·15:30 시작 반은 지났고, 17:00 이후 반은 아직
    await gotoReady(page, "/admin?at=16:00");
    const titles = await hw.allInnerTexts();
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles) expect(t).toMatch(/^OB-/);
    expect(await countOf()).toBeGreaterThanOrEqual(before + titles.length);
  });

  test("처리할 일: 누르면 바로 사라지고, 저장이 실패하면 다시 나타난다", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: /^처리할 일/ }) });
    // 확인 창이 없는 답장 줄로 본다
    const first = panel.locator("ul > li").filter({ has: page.getByRole("button", { name: "답장" }) }).first();
    const title = (await first.locator("span.font-bold").first().innerText()).trim();
    const before = await panel.getByRole("heading").innerText();
    await first.getByRole("button").click();
    await expect(panel.getByText(title, { exact: true })).toHaveCount(0);
    await expect(panel.getByRole("heading")).not.toHaveText(before);
    await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "success");

    // 실패 흉내: 다시 나타나고 실패 안내
    await page.evaluate(() => (window.__leetFailSave = true));
    const next = panel.locator("ul > li").filter({ has: page.getByRole("button", { name: "답장" }) }).first();
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
