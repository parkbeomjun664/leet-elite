import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./ready";

// 10/6 반응형: 휴대폰 375 · 태블릿 768 · PC 1280 세 폭에서 핵심 행동이 되는지 (docs/design.md 8번)
const WIDTHS = [
  { name: "휴대폰", width: 375, height: 812 },
  { name: "태블릿", width: 768, height: 1024 },
  { name: "PC", width: 1280, height: 860 },
];

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

for (const vp of WIDTHS) {
  test.describe(`${vp.name} ${vp.width}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("출결 입력: 결석 처리하면 창이 닫히고 학생 칸이 바로 결석", async ({ page }) => {
      await gotoReady(page, "/teacher?at=16:00&student=s010&mode=attendance");
      expect(await noHorizontalScroll(page)).toBe(true);
      const dialog = page.getByRole("dialog");
      const name = (await dialog.getByRole("heading").innerText()).replace(" 출결 입력", "");
      // 휴대폰은 아래에서 올라오는 시트, 768 이상은 오른쪽 패널
      const box = (await dialog.boundingBox())!;
      if (vp.width < 768) expect(box.y + box.height).toBeGreaterThan(vp.height - 2);
      else expect(box.x + box.width).toBeGreaterThan(vp.width - 2);
      await dialog.getByRole("radio", { name: /결석/ }).click();
      await dialog.getByRole("button", { name: "결석 처리" }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator("main li").filter({ has: page.getByText(name, { exact: true }) }).first()).toContainText("결석");
    });

    test("숙제 제출: [제출하기]가 아래 탭 바로 위, 화면 안에 보인다", async ({ page }) => {
      await gotoReady(page, "/student?at=08:00");
      expect(await noHorizontalScroll(page)).toBe(true);
      const submit = page.getByRole("button", { name: "제출하기" });
      await expect(submit).toBeVisible();
      const b = (await submit.boundingBox())!;
      const tab = (await page.getByRole("navigation", { name: "주 메뉴" }).boundingBox())!;
      // 스크롤하지 않아도 보이고, 아래 탭과 겹치지 않는다
      expect(b.y + b.height).toBeLessThanOrEqual(tab.y);
      expect(b.height).toBeGreaterThanOrEqual(44);
      await page.mouse.wheel(0, 2000);
      await expect(submit).toBeInViewport();
    });

    test("원장님 홈·재원생: 가로 스크롤 없음", async ({ page }) => {
      await gotoReady(page, "/admin");
      expect(await noHorizontalScroll(page)).toBe(true);
      await gotoReady(page, "/admin/students");
      expect(await noHorizontalScroll(page)).toBe(true);
      // 1280 미만은 카드, 이상은 표 (10/8 UI 4)
      if (vp.width < 1280) await expect(page.getByRole("list", { name: "재원생" })).toBeVisible();
      else await expect(page.getByRole("table")).toBeVisible();
    });
  });
}

test.describe("휴대폰 하단 시트", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("손잡이를 아래로 끌면 닫힌다", async ({ page }) => {
    await gotoReady(page, "/teacher?at=16:00&student=s010");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // 올라오는 움직임(0.25초)이 끝난 뒤 손잡이 위치를 잰다
    await page.waitForTimeout(400);
    const handle = dialog.locator("> div").first();
    const h = (await handle.boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + 4);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(h.x + h.width / 2, h.y + 4 + i * 20);
    await page.mouse.up();
    await expect(dialog).toHaveCount(0);
  });

  test("조금만 끌면 제자리로 돌아온다", async ({ page }) => {
    await gotoReady(page, "/teacher?at=16:00&student=s010");
    const dialog = page.getByRole("dialog");
    // 올라오는 움직임(0.25초)이 끝난 뒤 손잡이 위치를 잰다
    await page.waitForTimeout(400);
    const handle = dialog.locator("> div").first();
    const h = (await handle.boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + 4);
    await page.mouse.down();
    await page.mouse.move(h.x + h.width / 2, h.y + 30, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(dialog).toBeVisible();
  });
});

// 10/8 UI 5: 원장님 홈 휴대폰(375) — 숫자 2칸씩·마지막 칸 꽉, 메뉴 스크롤바 숨김·끝 페이드, 지금 메뉴가 화면 안에
test.describe("원장님 홈 375", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("숫자 줄은 2칸씩, 마지막 칸은 가로로 꽉", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const cells = page.locator("div").filter({ has: page.getByRole("heading", { name: "오늘 학원" }) }).last().getByRole("listitem");
    await expect(cells).toHaveCount(5);
    const w = await cells.evaluateAll((lis) => lis.map((li) => Math.round(li.getBoundingClientRect().width)));
    expect(w[0]).toBe(w[1]); // 두 칸이 같은 폭
    expect(w[4]).toBeGreaterThan(w[0] * 1.9); // 마지막 칸은 두 칸 폭
  });

  test("메뉴: 스크롤바 숨김, 오른쪽에 더 있으면 페이드, 지금 메뉴는 화면 안", async ({ page }) => {
    await gotoReady(page, "/admin/messages");
    const menu = page.getByRole("navigation", { name: "주 메뉴" }).filter({ visible: true });
    const scroller = menu.locator("div.overflow-x-auto");
    await expect(scroller).toHaveCSS("scrollbar-width", "none");
    // 맨 오른쪽 메뉴(메시지)가 지금 메뉴 → 화면 안으로 밀려 와 있다
    const current = menu.locator('[aria-current="page"]');
    await expect(current).toHaveText("메시지");
    await expect.poll(async () => (await current.boundingBox())!.x + (await current.boundingBox())!.width).toBeLessThanOrEqual(375);
    // 홈으로 가면 처음으로, 오른쪽에 더 있으니 페이드가 보인다
    await menu.getByRole("link", { name: "홈" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(menu.locator("span[aria-hidden].bg-gradient-to-l")).toHaveCSS("opacity", "1");
  });
});
