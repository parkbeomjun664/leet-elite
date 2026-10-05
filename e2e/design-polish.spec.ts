import { expect, test } from "@playwright/test";

// 10/5 디자인 다듬기: 24시간제 시간 고르기, 선생님 숫자 0은 회색, 키패드 휴대폰 세로
test("출결 입력: 시간은 24시간제 시·분 선택칸", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/teacher?at=16:00&student=s010&mode=attendance");
  const hour = page.getByRole("combobox", { name: "등원 시각 시" });
  await expect(hour).toBeVisible();
  await expect(hour.locator("option")).toHaveCount(24);
  await expect(hour).toHaveValue(/^\d{2}$/);
  await expect(page.getByRole("combobox", { name: "등원 시각 분" }).locator("option")).toHaveCount(60);

  // 시를 바꾸면 분은 그대로
  const minuteBefore = await page.getByRole("combobox", { name: "등원 시각 분" }).inputValue();
  await hour.selectOption("15");
  await expect(hour).toHaveValue("15");
  await expect(page.getByRole("combobox", { name: "등원 시각 분" })).toHaveValue(minuteBefore);
});

test("선생님 홈: 0인 숫자는 회색, 1 이상만 상태색", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/teacher?at=16:00");
  const numbers = page.getByRole("group", { name: "상태로 보기" }).locator("button > span:first-child");
  const cells = await numbers.evaluateAll((els) => els.map((el) => ({ n: el.textContent, color: getComputedStyle(el).color })));
  const zeros = cells.filter((c) => c.n === "0");
  const nonZeros = cells.filter((c) => c.n !== "0");
  expect(zeros.length).toBeGreaterThan(0); // 16:00 가상 데이터에는 0인 칸이 있다
  // 0인 칸은 모두 같은 회색(ink 50%, 브라우저는 oklab(... / 0.5)로 돌려준다), 1 이상인 칸은 그 회색이 아니다
  const gray = zeros[0].color;
  expect(gray).toMatch(/[/,] 0\.5\)$/);
  for (const z of zeros) expect(z.color).toBe(gray);
  for (const c of nonZeros) expect(c.color).not.toBe(gray);
});

test("키패드 휴대폰 세로: 제목이 잘리지 않고 비활성 확인 버튼은 분홍이 아니다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kiosk");
  const title = page.locator("header p").first();
  expect(await title.innerText()).toBe("출결"); // 학원 이름은 좁은 화면에서 숨김
  const box = await title.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(box.scroll).toBeLessThanOrEqual(box.client);

  const confirm = page.getByRole("button", { name: "확인" });
  await expect(confirm).toBeDisabled();
  await expect(confirm).toHaveCSS("background-color", "rgb(238, 238, 238)"); // line-soft
});
