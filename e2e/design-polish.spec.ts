import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 10/5 디자인 다듬기: 24시간제 시간 고르기, 선생님 숫자 0은 회색, 키패드 휴대폰 세로
test("출결 입력: 시간은 24시간제 시·분 선택칸", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoReady(page, "/teacher?at=16:00&student=s010&mode=attendance");
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
  await gotoReady(page, "/teacher?at=16:00");
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

test("키패드 휴대폰 세로: 제목이 잘리지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kiosk");
  const title = page.locator("header p").first();
  expect(await title.innerText()).toBe("출결"); // 학원 이름은 좁은 화면에서 숨김
  const box = await title.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(box.scroll).toBeLessThanOrEqual(box.client);
});

// 10/8 UI 2: 누름 반응 (버튼 0.97 + 어둡게, 카드·줄 0.99 + 옅은 회색), 움직임 줄이기면 크기 변화 없음
test.describe("누름 반응", () => {
  const pressed = async (page: import("@playwright/test").Page, selector: string) => {
    const el = page.locator(selector).first();
    const box = (await el.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250); // 150ms 전환이 끝난 뒤
    const style = await el.evaluate((e) => {
      const s = getComputedStyle(e);
      return { transform: s.transform, filter: s.filter, bg: s.backgroundColor };
    });
    await page.mouse.up({ button: "left" }).catch(() => {});
    return style;
  };

  test("버튼은 0.97로 작아지고 살짝 어두워진다, 표 줄은 0.99 + 옅은 회색", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoReady(page, "/admin/students");
    const btn = await pressed(page, 'main button:has-text("학생 등록")');
    expect(btn.transform).toBe("matrix(0.97, 0, 0, 0.97, 0, 0)");
    expect(btn.filter).toBe("brightness(0.95)");
    await page.keyboard.press("Escape");
    // 표 줄: 체크박스 칸이 아닌 이름 칸을 누른다
    const row = page.getByRole("row", { name: "조나윤 상세 보기" });
    await row.scrollIntoViewIfNeeded();
    const box = (await row.getByRole("cell").nth(1).boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const r = await row.evaluate((e) => ({ t: getComputedStyle(e).transform, bg: getComputedStyle(e).backgroundColor }));
    await page.mouse.up();
    expect(r.t).toBe("matrix(0.99, 0, 0, 0.99, 0, 0)");
    expect(r.bg).toBe("rgba(0, 0, 0, 0.04)");
  });

  test("움직임 줄이기 설정이면 크기는 그대로", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoReady(page, "/admin/students");
    const btn = await pressed(page, 'main button:has-text("학생 등록")');
    expect(btn.transform).toBe("none");
  });
});
