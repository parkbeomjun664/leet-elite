import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 10/7 학생관리 다듬기: 아직 안 되는 버튼은 열리는 날짜 안내, 휴대폰 카드는 [여러 명 선택]일 때만 체크
test("아직 준비 중인 버튼: 누르면 열리는 날짜를 안내", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/admin/students");
  await page.getByRole("button", { name: "학생 등록" }).click();
  await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "info");
  await expect(page.getByTestId("toast")).toContainText("학생 등록 기능은 10/12에 열려요");
});

test("휴대폰: 체크박스는 [여러 명 선택]을 눌렀을 때만, 카드를 누르면 선택", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await gotoReady(page, "/admin/students");
  const list = page.getByRole("list", { name: "재원생" });
  await expect(list.locator('input[type="checkbox"]')).toHaveCount(0);
  await page.getByRole("button", { name: "여러 명 선택" }).click();
  const card = list.getByRole("button", { name: "조나윤 선택" });
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("선택한 학생")).toContainText("1");
  // 끝내면 선택도 풀린다
  await page.getByRole("button", { name: "선택 끝내기" }).click();
  await expect(list.getByRole("button", { name: "조나윤 상세 보기" })).toBeVisible();
  await expect(page.getByText("선택한 학생")).toHaveCount(0);
});

test("반으로 거르면 결과 수 표시, 수정 창의 반·프로그램은 눌러서 켜고 끄기", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/admin/students");
  await page.getByRole("group", { name: "반으로 거르기" }).getByRole("button", { name: /^OB-초저/ }).click();
  await expect(page.getByText(/65명 중 \d+명/)).toBeVisible();
  await page.getByRole("row", { name: "조나윤 상세 보기" }).click();
  const dialog = page.getByRole("dialog");
  const chip = dialog.getByRole("button", { name: "클래스5" });
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
});
