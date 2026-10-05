import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 10/5 디자인 시스템: 학생 정보 수정 창은 저장하면 토스트로 알리고, 닫힘 움직임을 거쳐 닫힌다
test("학생 정보 수정: 저장하면 토스트 + 창 닫힘, 취소도 닫힘", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoReady(page, "/admin/students?edit=s010");
  const dialog = page.getByRole("dialog");
  const name = (await dialog.getByRole("heading").first().innerText()).replace(" 정보 수정", "");
  await dialog.getByRole("button", { name: "저장" }).click();
  await expect(page.getByTestId("toast")).toContainText(`${name} 정보를 저장했어요`);
  await expect(dialog).toHaveCount(0);

  await page.getByRole("row", { name: `${name} 상세 보기` }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(dialog).toHaveCount(0);
});
