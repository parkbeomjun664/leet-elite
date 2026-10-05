import { expect, test, type Page } from "@playwright/test";

// 10/5 디자인 시스템: 선생님 화면 출결·메시지는 누르는 즉시 반영, 저장 실패면 되돌리고 알린다
// 가짜 저장(0.4초) 실패 흉내: window.__leetFailSave = true
test.use({ viewport: { width: 1440, height: 900 } });

const failSaves = (page: Page) => page.addInitScript(() => (window.__leetFailSave = true));
const tile = (page: Page, name: string) => page.locator("main li").filter({ has: page.getByText(name, { exact: true }) });

test("하원: 누르는 즉시 하원, 저장되면 성공 토스트", async ({ page }) => {
  await page.goto("/teacher?at=16:00");
  const t = tile(page, "표승현");
  await t.getByRole("button", { name: "하원" }).click();
  // 저장(0.4초)이 끝나기 전에 이미 바뀐다
  await expect(t).toContainText("하원 16:00", { timeout: 200 });
  await expect(t.getByRole("button", { name: "출결" })).toBeVisible();
  await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "success");
  await expect(page.getByTestId("toast")).toContainText("표승현 하원 처리했어요");
  await expect(t).toContainText("하원 16:00");
});

test("하원: 저장이 실패하면 등원으로 되돌리고 실패 토스트", async ({ page }) => {
  await failSaves(page);
  await page.goto("/teacher?at=16:00");
  const t = tile(page, "표승현");
  await t.getByRole("button", { name: "하원" }).click();
  await expect(t).toContainText("하원 16:00", { timeout: 200 });
  await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "error");
  await expect(page.getByTestId("toast")).toContainText("표승현 하원 처리하지 못했어요");
  await expect(t).not.toContainText("하원 16:00");
  await expect(t.getByRole("button", { name: "하원" })).toBeVisible();
});

test("출결 입력 창: 결석 처리하면 창이 닫히고 학생 칸이 바로 결석", async ({ page }) => {
  await page.goto("/teacher?at=16:00&student=s010&mode=attendance");
  const dialog = page.getByRole("dialog");
  const name = (await dialog.getByRole("heading").innerText()).replace(" 출결 입력", "");
  await dialog.getByRole("radio", { name: /결석/ }).click();
  await dialog.getByRole("button", { name: "결석 처리" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(tile(page, name)).toContainText("결석", { timeout: 300 });
  await expect(page.getByTestId("toast")).toContainText(`${name} 결석 처리했어요`);
});

test("메시지: 보내기 실패면 목록에서 빠지고 쓴 글은 입력칸에 돌아온다", async ({ page }) => {
  await failSaves(page);
  await page.goto("/teacher?at=16:00");
  const panel = page.locator("aside");
  const box = panel.getByLabel("메시지 내용");
  await box.fill("내일 단어 시험 있어요");
  await panel.getByRole("button", { name: "보내기" }).click();
  await expect(panel.getByText("보내는 중")).toBeVisible({ timeout: 200 });
  await expect(page.getByTestId("toast")).toContainText("메시지를 보내지 못했어요");
  await expect(panel.getByText("내일 단어 시험 있어요")).toHaveCount(0);
  await expect(box).toHaveValue("내일 단어 시험 있어요");
});

test("상단 숫자: 하원하면 등원 숫자가 줄고 하원 숫자가 는다", async ({ page }) => {
  await page.goto("/teacher?at=16:00");
  const group = page.getByRole("group", { name: "상태로 보기" });
  // "미등원"과 헷갈리지 않게 이름표가 정확히 같은 칸
  const num = (label: string) => group.getByRole("button").filter({ has: page.getByText(label, { exact: true }) }).locator("span").first();
  const before = Number(await num("등원").innerText());
  await tile(page, "표승현").getByRole("button", { name: "하원" }).click();
  await expect(num("등원")).toHaveText(String(before - 1));
  await expect(num("하원")).toHaveText("1");
});
