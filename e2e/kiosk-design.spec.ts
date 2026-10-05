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

  test("1234를 누르면 바로 등원 처리 + 완료 표시, 1분 안에 다시 누르면 기록하지 않음", async ({ page }) => {
    await page.goto("/kiosk");
    await press(page, "1234");
    const status = page.getByRole("status").filter({ hasText: "학생" });
    await expect(status).toContainText("조나윤 학생");
    await expect(status).toContainText("등원했습니다");
    await expect(page.locator('[data-result="in"]')).toBeVisible();

    await press(page, "1234");
    await expect(page.locator('[data-result="recent"]')).toBeVisible();
    await expect(page.getByText("방금 처리되었습니다")).toBeVisible();
  });

  test("없는 번호(9999)는 4자리가 차면 바로 실패 안내", async ({ page }) => {
    await page.goto("/kiosk");
    await press(page, "999");
    // 3자리까지는 기다린다
    await expect(page.getByLabel("입력한 번호 3자리")).toBeVisible();
    await press(page, "9");
    await expect(page.locator('[data-result="unknown"]')).toBeVisible();
    await expect(page.getByText("등록되지 않은 번호입니다.")).toBeVisible();
  });

  test("지우기: 누른 숫자를 한 자리씩 지운다", async ({ page }) => {
    await page.goto("/kiosk");
    await press(page, "12");
    await page.getByRole("button", { name: "한 자리 지우기" }).click();
    await expect(page.getByLabel("입력한 번호 1자리")).toBeVisible();
  });
});
