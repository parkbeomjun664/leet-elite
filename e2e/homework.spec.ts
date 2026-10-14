import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 숙제 등록·목록 화면 (HW-01~04, 10/14). 가상 데이터 시험 모드: 등록은 DB에 넣지 않고 성공만 돌려준다
// 실제 dev DB에 등록하고 역할별로 보이는지는 homework-db.spec.ts
test.use({ viewport: { width: 1280, height: 900 } });

test("원장님 숙제 목록: 종류 표시·제출 현황, 종류로 거르기, [숙제 등록]", async ({ page }) => {
  await gotoReady(page, "/admin/homework");
  await expect(page.getByRole("heading", { name: "숙제", level: 1 })).toBeVisible();
  const list = page.getByRole("list", { name: "숙제 목록" });
  const rows = list.getByRole("listitem");
  expect(await rows.count()).toBeGreaterThan(5);
  // 줄마다 종류(일반·매일)와 "제출 n / m명"
  await expect(rows.first().locator("[data-kind]")).toHaveText(/^(일반|매일)$/);
  await expect(rows.first().locator("[data-progress]")).toContainText(/\d+\s*\/ \d+명/);
  // 이미 끝난 매일 숙제는 "오늘 제출"이 아니라 그날 날짜로 (예: "9/29 제출")
  await expect(list.getByText(/^\d+\/\d+ 제출$/).first()).toBeVisible();
  // 매일만 거르기
  await page.getByRole("group", { name: "종류로 거르기" }).getByRole("button", { name: /^매일/ }).click();
  for (const k of await list.locator("[data-kind]").allTextContents()) expect(k).toBe("매일");
  await page.getByRole("link", { name: "숙제 등록" }).first().click();
  await expect(page).toHaveURL(/\/admin\/homework\/new$/);
});

test("숙제 등록: 빈 칸 안내 → 반으로 고르기·오늘 날짜 제목 → 등록하면 목록으로", async ({ page }) => {
  await gotoReady(page, "/admin/homework/new");
  await page.getByRole("button", { name: "숙제 내기" }).click();
  // 대상이 먼저 검사된다 (제목보다 위가 아니라 규칙 순서: 제목 → 대상)
  await expect(page.getByText(/제목을 입력하거나/)).toBeVisible();

  // 오늘 날짜 사용: 제목 칸 안내가 "10/5 (월) 숙제"로
  await page.getByLabel(/오늘 날짜 사용/).check();
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveAttribute("placeholder", "10/5 (월) 숙제");
  await page.getByRole("button", { name: "숙제 내기" }).click();
  await expect(page.getByText("숙제를 받을 학생을 골라 주세요")).toBeVisible();

  // 반 알약 하나 → 그 반 학생 수만큼 선택, 다시 누르면 해제
  const classChip = page.getByRole("group", { name: "반으로 고르기" }).getByRole("button").nth(1);
  const n = Number((await classChip.textContent())!.match(/(\d+)$/)![1]);
  await classChip.click();
  await expect(classChip).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("selected-count")).toHaveText(String(n));
  // 학생 하나를 빼면 반 알약이 꺼진다
  const firstChecked = page.getByRole("list", { name: "학생" }).getByRole("checkbox", { checked: true }).first();
  await firstChecked.uncheck();
  await expect(classChip).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("selected-count")).toHaveText(String(n - 1));

  await page.getByLabel("내용").fill("3과 단어 20개 외우기");
  await page.getByRole("button", { name: "숙제 내기" }).click();
  await expect(page.getByTestId("toast")).toContainText(`"10/5 (월) 숙제" 숙제를 ${n - 1}명에게 냈어요`);
  await expect(page).toHaveURL(/\/admin\/homework$/);
});

test("매일 숙제: 기간을 끄면 오늘 하루, 켜면 시작·종료일(종료가 앞서면 안내)", async ({ page }) => {
  await gotoReady(page, "/admin/homework/new");
  await page.getByRole("group", { name: "숙제 종류" }).getByRole("button", { name: "매일 숙제" }).click();
  await expect(page.getByText("기간을 정하지 않으면 오늘(10/5 (월)) 하루 숙제예요.")).toBeVisible();
  await page.getByLabel(/기간 설정/).check();
  await expect(page.getByLabel("시작일")).toHaveValue("2026-10-05");
  await expect(page.getByLabel("종료일")).toHaveValue("2026-10-11");
  await page.getByLabel("종료일").fill("2026-10-04");
  await page.getByRole("textbox", { name: /^제목/ }).fill("매일 듣기");
  await page.getByRole("group", { name: "반으로 고르기" }).getByRole("button", { name: /^전체/ }).click();
  await page.getByRole("button", { name: "숙제 내기" }).click();
  await expect(page.getByText("종료일이 시작일보다 앞서요")).toBeVisible();
});

test("학생 검색: 이름으로 좁히고, 없으면 안내", async ({ page }) => {
  await gotoReady(page, "/admin/homework/new");
  const search = page.getByLabel("학생 이름 검색");
  await search.fill("조나윤");
  await expect(page.getByRole("list", { name: "학생" }).getByRole("checkbox")).toHaveCount(1);
  await search.fill("없는이름");
  await expect(page.getByText('"없는이름"에 맞는 학생이 없어요')).toBeVisible();
});

test("선생님: 자기 반만 대상, 자기 숙제만 목록", async ({ page }) => {
  await gotoReady(page, "/teacher/homework/new");
  const chips = page.getByRole("group", { name: "반으로 고르기" }).getByRole("button");
  const adminPage = await page.context().newPage();
  await gotoReady(adminPage, "/admin/homework/new");
  const adminChips = adminPage.getByRole("group", { name: "반으로 고르기" }).getByRole("button");
  expect(await chips.count()).toBeLessThan(await adminChips.count());
  await adminPage.close();
  await gotoReady(page, "/teacher/homework");
  await expect(page.getByRole("list", { name: "숙제 목록" }).getByRole("listitem").first()).toBeVisible();
});

test("휴대폰 폭: 등록 화면이 가로로 넘치지 않고 [숙제 내기]가 넓다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await gotoReady(page, "/teacher/homework/new");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const btn = (await page.getByRole("button", { name: "숙제 내기" }).boundingBox())!;
  expect(btn.width).toBeGreaterThan(200);
});

test("넓은 화면은 2단: 왼쪽 종류·제목·내용, 오른쪽 대상 학생 (10/14 오른쪽 여백)", async ({ page }) => {
  await gotoReady(page, "/admin/homework/new");
  const kind = (await page.getByRole("heading", { name: "종류" }).boundingBox())!;
  const targets = (await page.getByRole("heading", { name: "대상 학생" }).boundingBox())!;
  const title = (await page.getByRole("textbox", { name: /^제목/ }).boundingBox())!;
  expect(targets.x).toBeGreaterThan(kind.x + 300); // 오른쪽 칸
  expect(Math.abs(targets.y - kind.y)).toBeLessThan(4); // 같은 높이에서 시작
  expect(title.y - (kind.y + kind.height)).toBeLessThan(160); // 종류 바로 아래 제목 (빈 틈 없이)
});
