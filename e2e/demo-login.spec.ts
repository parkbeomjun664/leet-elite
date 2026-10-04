import { expect, test } from "@playwright/test";

// 시연 로그인: 틀리면 안내 문구, 1234/1234면 화면 고르기로
test("시연 로그인", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("휴대폰 번호 또는 아이디").fill("9999");
  await page.getByPlaceholder("비밀번호").fill("1");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByText("아이디 또는 비밀번호가 올바르지 않습니다.")).toBeVisible();

  await page.getByPlaceholder("휴대폰 번호 또는 아이디").fill("1234");
  await page.getByPlaceholder("비밀번호").fill("1234");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "어떤 화면을 볼까요?" })).toBeVisible();
});
