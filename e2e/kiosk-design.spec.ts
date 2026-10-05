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

test("키패드: 지우기는 흰 칸이라 비활성 확인(회색)과 달라 보인다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kiosk");
  const pad = page.getByRole("region", { name: "숫자 패드" });
  const bg = (name: string) => pad.getByRole("button", { name, exact: true }).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg("한 자리 지우기")).not.toBe(await bg("확인"));
});
