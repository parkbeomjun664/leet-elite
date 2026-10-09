import { expect, test } from "@playwright/test";

// 10/5 디자인 시스템: 출결 키패드는 숫자 48px 이상, 버튼 72px 이상 (태블릿은 56px·88px)
for (const [label, vp, font, height] of [
  ["휴대폰 세로", { width: 390, height: 844 }, 48, 72],
  ["태블릿 가로", { width: 1180, height: 820 }, 56, 88],
] as const) {
  test(`키패드 크기: ${label}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto("/kiosk");
    const pad = page.getByRole("region", { name: "숫자 패드" });
    for (const key of ["1", "5", "0"]) {
      const button = pad.getByRole("button", { name: key, exact: true });
      const size = await button.evaluate((el) => ({ font: parseFloat(getComputedStyle(el).fontSize), h: el.getBoundingClientRect().height }));
      expect(size.font).toBeGreaterThanOrEqual(font);
      expect(size.h).toBeGreaterThanOrEqual(height);
    }
    const erase = await pad.getByRole("button", { name: "한 자리 지우기" }).boundingBox();
    expect(erase!.height).toBeGreaterThanOrEqual(height);
  });
}

// 10/5 범준님: 4칸 고정, [확인] 없이 4자리가 차면 바로 처리. 예시 번호 1234 (가상 학생 조나윤)
test.describe("키패드 4자리 바로 처리", () => {
  test.use({ viewport: { width: 1180, height: 820 } });

  const press = async (page: import("@playwright/test").Page, code: string) => {
    const pad = page.getByRole("region", { name: "숫자 패드" });
    for (const k of code) await pad.getByRole("button", { name: k, exact: true }).click();
  };

  test("칸은 4개, [확인] 버튼은 없다", async ({ page }) => {
    await page.goto("/kiosk");
    await expect(page.getByLabel("입력한 번호 0자리").locator("> span")).toHaveCount(4);
    await expect(page.getByRole("button", { name: "확인" })).toHaveCount(0);
    // 맨 아래 줄은 0(두 칸 너비)과 지우기
    const pad = page.getByRole("region", { name: "숫자 패드" });
    const zero = await pad.getByRole("button", { name: "0", exact: true }).boundingBox();
    const one = await pad.getByRole("button", { name: "1", exact: true }).boundingBox();
    expect(zero!.width).toBeGreaterThan(one!.width * 1.8);
  });

  test("1234: 등원 전체 화면 → 2초 뒤 키패드로, 1분 안에 다시 누르면 기록하지 않음", async ({ page }) => {
    await page.goto("/kiosk");
    await press(page, "1234");
    const done = page.locator('[data-result="in"]');
    await expect(done).toBeVisible();
    await expect(done).toContainText("조나윤 학생");
    await expect(done).toContainText("등원했어요");
    // 숫자 패드까지 덮는 전체 화면
    const box = await done.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(1180 - 1);
    // 2초 뒤 저절로 닫힌다 (10/9)
    await expect(done).toHaveCount(0, { timeout: 3000 });

    await press(page, "1234");
    await expect(page.locator('[data-result="recent"]')).toBeVisible();
    await expect(page.getByText("조나윤 학생, 방금 등원했어요")).toBeVisible();
  });

  test("완료 화면은 누르면 바로 닫힌다", async ({ page }) => {
    await page.goto("/kiosk");
    await press(page, "1234");
    const done = page.locator('[data-result="in"]');
    await expect(done).toBeVisible();
    await done.click();
    await expect(done).toHaveCount(0, { timeout: 1000 });
  });

  test("1분 뒤 다시 누르면 하원 전체 화면 (파랑, 인사말)", async ({ page }) => {
    await page.clock.install();
    await page.goto("/kiosk");
    await press(page, "1234");
    await expect(page.locator('[data-result="in"]')).toBeVisible();
    await page.clock.fastForward("01:05");
    await expect(page.locator('[data-result="in"]')).toHaveCount(0);
    await press(page, "1234");
    const out = page.locator('[data-result="out"]');
    await expect(out).toBeVisible();
    await expect(out).toContainText("하원했어요");
    await expect(out).toContainText("오늘도 수고했어요, 조심히 가요");
  });

  test("없는 번호(9999)는 4자리가 차면 그 자리에서 흔들리며 안내", async ({ page }) => {
    await page.goto("/kiosk");
    await press(page, "999");
    // 3자리까지는 기다린다
    await expect(page.getByLabel("입력한 번호 3자리")).toBeVisible();
    await press(page, "9");
    await expect(page.locator('[data-result="unknown"]')).toBeVisible();
    await expect(page.getByText("번호를 다시 확인해 주세요")).toBeVisible();
    // 전체 화면 결과는 뜨지 않는다
    await expect(page.locator('[data-result="in"], [data-result="out"]')).toHaveCount(0);
  });

  test("지우기: 누른 숫자를 한 자리씩 지운다", async ({ page }) => {
    await page.goto("/kiosk");
    await press(page, "12");
    await page.getByRole("button", { name: "한 자리 지우기" }).click();
    await expect(page.getByLabel("입력한 번호 1자리")).toBeVisible();
  });
});
