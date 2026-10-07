import { expect, test, type Page } from "@playwright/test";

// 재원생 목록을 실제 dev DB에서 (10/7, STU-06). 원장님 계정으로 로그인해서 본다
// 준비: scripts/seed-dev.mts로 가상 명단을 넣어 둔다 (재원 64 + 첫 로그인 시험 학생 1 = 65, 예정 1)
// 비밀번호는 .env.local의 E2E_PASSWORD. 없으면 건너뛴다
test.use({ extraHTTPHeaders: {}, viewport: { width: 1280, height: 900 } });
test.skip(!process.env.E2E_PASSWORD, ".env.local에 E2E_PASSWORD가 없어서 건너뜀");

async function loginAs(page: Page, id: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByPlaceholder("휴대폰 번호 또는 아이디").fill(id);
  await page.getByPlaceholder("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => u.pathname === next);
}

test("원장님: 재원생 목록이 DB의 가상 명단으로 나온다", async ({ page }) => {
  await loginAs(page, "admin", "/admin/students");
  await expect(page.getByText("재원 65명 · 입학 예정 1명")).toBeVisible();
  // PC는 표: 조나윤(출결 1234, 수·금 14:30) 줄
  const row = page.getByRole("row", { name: "조나윤 상세 보기" });
  await expect(row).toContainText("1234");
  await expect(row).toContainText("수·금 14:30");
  // 보호자는 DB의 연결을 따라온다 (표승현·표준현 형제의 보호자)
  await expect(page.getByRole("row", { name: "표승현 상세 보기" })).toContainText("표승현맘");
});

test("원장님: 학생을 누르면 DB에서 읽은 정보로 수정 창이 열린다", async ({ page }) => {
  await loginAs(page, "admin", "/admin/students");
  await page.getByRole("row", { name: "표승현 상세 보기" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // 형제 연결: 보호자 아래 자녀 두 명
  await expect(dialog).toContainText("표준현");
});

test("휴대폰 폭: 카드 목록", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginAs(page, "admin", "/admin/students");
  await expect(page.getByRole("list", { name: "재원생" }).getByRole("button", { name: "조나윤 상세 보기" })).toBeVisible();
});

test("선생님 계정은 재원생 화면에 못 들어간다 (자기 첫 화면으로)", async ({ page }) => {
  await loginAs(page, "teacher", "/teacher");
  await page.goto("/admin/students");
  await expect(page).toHaveURL(/\/teacher$/);
});

// 10/8 학생 기본 정보 저장 (STU-01~03): 고치면 DB에 남고, 새로고침해도 그대로. 끝나면 원래대로 되돌린다
test("원장님: 메모·사용 프로그램을 고쳐 저장하면 새로고침해도 남는다", async ({ page }) => {
  await loginAs(page, "admin", "/admin/students");
  const marker = `시험 메모 ${Date.now()}`;
  const open = async () => {
    await page.getByRole("row", { name: "조나윤 상세 보기" }).click();
    const d = page.getByRole("dialog");
    await expect(d).toBeVisible();
    return d;
  };

  let dialog = await open();
  const memo = dialog.getByLabel("메모");
  const before = await memo.inputValue();
  const chip = dialog.getByRole("button", { name: "클래스5" });
  const chipBefore = await chip.getAttribute("aria-pressed");
  await memo.fill(marker);
  await chip.click();
  await dialog.getByRole("button", { name: "저장" }).click();
  await expect(page.getByTestId("toast")).toContainText("조나윤 정보를 저장했어요");
  await expect(dialog).toHaveCount(0);

  // 새로고침해도 DB에서 그대로 읽힌다
  await page.reload();
  dialog = await open();
  await expect(dialog.getByLabel("메모")).toHaveValue(marker);
  await expect(dialog.getByRole("button", { name: "클래스5" })).toHaveAttribute("aria-pressed", chipBefore === "true" ? "false" : "true");

  // 원래대로 되돌리기
  await dialog.getByLabel("메모").fill(before);
  await dialog.getByRole("button", { name: "클래스5" }).click();
  await dialog.getByRole("button", { name: "저장" }).click();
  await expect(page.getByTestId("toast")).toContainText("저장했어요");
});

test("원장님: 다른 재원생이 쓰는 출결 번호로는 저장되지 않는다", async ({ page }) => {
  await loginAs(page, "admin", "/admin/students");
  await page.getByRole("row", { name: "조나윤 상세 보기" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/출결 코드/).fill("1001");
  await dialog.getByRole("button", { name: "저장" }).click();
  await expect(dialog.getByText("1001번은 조민재 학생이 쓰고 있어요")).toBeVisible();
  await expect(dialog).toBeVisible(); // 창은 열린 채로 고치게
  await dialog.getByRole("button", { name: "취소" }).click();
  // 저장되지 않았다
  await page.reload();
  await expect(page.getByRole("row", { name: "조나윤 상세 보기" })).toContainText("1234");
});

test("오늘 저장하지 않는 칸은 잠겨 있고 열리는 날짜를 안내", async ({ page }) => {
  await loginAs(page, "admin", "/admin/students");
  await page.getByRole("row", { name: "조나윤 상세 보기" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("반과 수업 시간 저장은 10/9에 열려요")).toBeVisible();
  await expect(dialog.getByLabel("상태")).toBeDisabled();
  await expect(dialog.getByRole("button", { name: /^OB-초저/ })).toBeDisabled();
});
