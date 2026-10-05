import { expect, test } from "@playwright/test";

// 10/5 디자인 시스템 미리보기: 낙관적 업데이트(성공·실패 되돌림), 시트, 움직임 줄이기
test.describe("디자인 시스템 미리보기", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("옛 주소 /design은 /design-system으로", async ({ page }) => {
    await page.goto("/design");
    await expect(page).toHaveURL(/\/design-system$/);
  });

  test("하원: 누르는 즉시 바뀌고, 성공하면 그대로 + 성공 토스트", async ({ page }) => {
    await page.goto("/design-system");
    const row = page.locator("li").filter({ hasText: "김하윤" }).filter({ has: page.getByRole("button", { name: "하원" }) });
    await row.getByRole("button", { name: "하원" }).click();
    // 가짜 저장(0.4초)이 끝나기 전에 이미 하원
    await expect(page.locator("li").filter({ hasText: "김하윤" }).getByText("● 하원")).toBeVisible({ timeout: 200 });
    await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "success");
    await expect(page.getByTestId("toast")).toContainText("김하윤 하원 처리했어요");
    await expect(page.locator("li").filter({ hasText: "김하윤" }).getByText("● 하원")).toBeVisible();
  });

  test("하원: 저장이 실패하면 등원으로 되돌리고 실패 토스트", async ({ page }) => {
    await page.goto("/design-system");
    await page.getByLabel("저장 실패 흉내").check();
    const name = page.getByText("이서준", { exact: true }).locator("xpath=ancestor::li[1]");
    await name.getByRole("button", { name: "하원" }).click();
    await expect(name.getByText("● 하원")).toBeVisible({ timeout: 200 });
    await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "error");
    await expect(page.getByRole("alert").filter({ hasText: "저장하지 못했어요" })).toHaveCount(1);
    await expect(name.getByText("● 등원")).toBeVisible();
    await expect(name.getByRole("button", { name: "하원" })).toBeVisible();
  });

  test("시트: 열면 보이고, Esc로 닫힌다", async ({ page }) => {
    await page.goto("/design-system");
    await page.getByRole("button", { name: "출결 입력 시트 열기" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("움직임 줄이기 설정이면 누름 반응·시트 움직임이 사실상 0", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/design-system");
    const button = page.getByRole("button", { name: "출결 입력 시트 열기" });
    const duration = await button.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(duration).toBeLessThan(0.001);
    await button.click();
    const anim = await page.getByRole("dialog").evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(anim).toBeLessThan(0.001);
  });
});

// 10/6 버튼 5가지 상태, 없는 화면 안내
test.describe("버튼 상태 · 없는 화면", () => {
  for (const width of [375, 768, 1280]) {
    test(`${width}px: 로딩·완료 중에도 버튼 크기가 그대로이고 기본으로 돌아온다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/design-system");
      const btn = page.getByTestId("button-state-demo");
      await btn.scrollIntoViewIfNeeded();
      const before = await btn.boundingBox();
      await btn.click();
      await expect(btn).toHaveAttribute("data-state", "loading");
      expect(await btn.boundingBox()).toEqual(before);
      await expect(btn).toHaveAttribute("data-state", "done");
      expect(await btn.boundingBox()).toEqual(before);
      await expect(btn).toHaveAttribute("data-state", "idle");
      // 가로 스크롤 없음
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test("없는 주소: 안내 문장 + [처음 화면으로]", async ({ page }) => {
    const res = await page.goto("/없는-화면-주소");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "찾는 화면이 없어요" })).toBeVisible();
    await expect(page.getByRole("link", { name: "처음 화면으로" })).toHaveAttribute("href", "/");
  });
});
