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
