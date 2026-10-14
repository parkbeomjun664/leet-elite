import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 숙제 목록·상세·등록 화면 (HW-01~05, 10/14 범준님 개선 반영). 가상 데이터 시험 모드: 등록은 DB에 넣지 않고 성공만
// 실제 dev DB에 등록하고 역할별로 보이는지는 homework-db.spec.ts. 날짜는 2026-10-05(월)로 고정
test.use({ viewport: { width: 1280, height: 900 } });

test("목록: 회색 바탕 흰 카드, 줄 = [종류] 제목 / 대상 요약 · 마감(색), 제출 n / m명 + 막대", async ({ page }) => {
  await gotoReady(page, "/admin/homework");
  await expect(page.getByRole("heading", { name: "숙제", level: 1 })).toBeVisible();
  await expect(page.getByText(/등록한 숙제/)).toHaveCount(0); // 부제 없앰
  const list = page.getByRole("list", { name: "숙제 목록" });
  await expect(list).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-collapsed]")!).backgroundColor)).toBe("rgb(242, 244, 246)");

  const rows = list.getByRole("listitem");
  expect(await rows.count()).toBeGreaterThan(5);
  const first = rows.first();
  await expect(first.locator("[data-kind]")).toHaveText(/^(일반|매일)$/);
  await expect(first.locator("[data-progress]")).toContainText(/\d+\s*\/ \d+명/);
  // 반 하나 전체에 낸 숙제는 "반이름 · n명"
  await expect(first.locator("[data-meta]")).toContainText(/ · \d+명/);
  // 마감: 지남(빨강 #D91F2F)·오늘(짙은 주황 #9C5F09, #FF9F0A는 글씨로 대비 부족)
  await expect(list.locator('[data-due="past"]').first()).toHaveCSS("color", "rgb(217, 31, 47)");
  await expect(list.locator('[data-due="today"]').first()).toHaveCSS("color", "rgb(156, 95, 9)");
  await expect(list.locator('[data-due="today"]').first()).toContainText("마감 10/5(월)");
  // 매일 태그는 연한 파랑
  await expect(list.locator('[data-kind="daily"]').first()).toHaveCSS("background-color", "rgb(232, 243, 255)");
  // 진행 막대: 다 낸 숙제는 초록, 아니면 파랑
  const bars = await list.locator("[data-bar]").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(new Set(bars)).toEqual(new Set(["rgb(0, 196, 113)", "rgb(49, 130, 246)"]));
  // 이미 끝난 매일 숙제는 "오늘 제출"이 아니라 그날 날짜로
  await expect(list.getByText(/^\d+\/\d+ 제출$/).first()).toBeVisible();

  // 매일만 거르기
  await page.getByRole("group", { name: "종류로 거르기" }).getByRole("button", { name: /^매일/ }).click();
  for (const k of await list.locator("[data-kind]").allTextContents()) expect(k).toBe("매일");
});

test("목록 줄을 누르면 상세: 학생별 제출(안 낸 학생 먼저), [숙제 목록]으로 돌아가기", async ({ page }) => {
  await gotoReady(page, "/admin/homework");
  const row = page.getByRole("list", { name: "숙제 목록" }).getByRole("link").first();
  const title = (await row.locator(".text-strong").first().textContent())!.trim();
  await row.click();
  await expect(page).toHaveURL(/\/admin\/homework\/hw-/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  const students = page.getByRole("list", { name: "학생별 제출" }).getByRole("listitem");
  expect(await students.count()).toBeGreaterThan(0);
  const states = await students.locator("[data-state]").evaluateAll((els) => els.map((e) => e.getAttribute("data-state")));
  // 미제출이 모두 제출보다 앞
  expect(states.join(",")).toMatch(/^(missing,)*(submitted,?)*$/);
  await page.getByRole("link", { name: "숙제 목록" }).click();
  await expect(page).toHaveURL(/\/admin\/homework$/);
});

test("등록: 필수값(제목·대상·마감)이 없으면 버튼이 꺼져 있고, 채우면 'n명에게 숙제 내기'", async ({ page }) => {
  await gotoReady(page, "/admin/homework/new");
  const submit = page.getByRole("button", { name: /숙제 내기$/ });
  await expect(submit).toBeDisabled();
  await expect(page.getByTestId("submit-hint")).toHaveText("제목·대상·마감일을 채우면 낼 수 있어요");
  // 마감일 기본값 = 오늘 + 2일
  await expect(page.getByLabel(/^마감일/)).toHaveValue("2026-10-07");
  await expect(page.getByLabel(/오늘 날짜 사용/)).toHaveCount(0); // 체크박스 없앰

  // 반 칩: "반이름 0/n" → 누르면 "n/n"
  const chip = page.getByRole("group", { name: "반으로 고르기" }).getByRole("button").first();
  const n = Number((await chip.textContent())!.match(/\/(\d+)$/)![1]);
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(chip).toContainText(`${n}/${n}`);
  await expect(submit).toBeDisabled(); // 제목이 아직 없다
  await page.getByRole("textbox", { name: /^제목/ }).fill("3과 단어 외우기");
  await expect(submit).toBeEnabled();
  await expect(submit).toHaveText(`${n}명에게 숙제 내기`);
  await expect(page.getByTestId("submit-hint")).toHaveCount(0);
  // 마감일을 지우면 다시 꺼진다
  await page.getByLabel(/^마감일/).fill("");
  await expect(submit).toBeDisabled();
  await page.getByLabel(/^마감일/).fill("2026-10-09");

  // 제출 방식: 체크만
  await page.getByRole("group", { name: "제출 방식" }).getByRole("button", { name: "체크만" }).click();
  // 내용 칸 140px
  await expect(page.getByLabel("내용")).toHaveCSS("height", "140px");
  await submit.click();
  await expect(page.getByTestId("toast")).toContainText(`"3과 단어 외우기" 숙제를 ${n}명에게 냈어요`);
  await expect(page).toHaveURL(/\/admin\/homework$/);
});

test("[전체]는 맨 뒤, 누르면 'n명 전체 선택할까요?' 확인 뒤에 고른다", async ({ page }) => {
  await gotoReady(page, "/admin/homework/new");
  const chips = page.getByRole("group", { name: "반으로 고르기" }).getByRole("button");
  const all = chips.last();
  await expect(all).toHaveText(/^전체 \d+$/);
  const total = Number((await all.textContent())!.match(/(\d+)$/)![1]);
  await all.click();
  await expect(page.getByRole("group", { name: "전체 선택 확인" })).toContainText(`${total}명 전체 선택할까요?`);
  await expect(page.getByTestId("selected-count")).toHaveText("0"); // 아직 안 골라짐
  await page.getByRole("group", { name: "전체 선택 확인" }).getByRole("button", { name: "취소" }).click();
  await expect(page.getByRole("group", { name: "전체 선택 확인" })).toHaveCount(0);
  await all.click();
  await page.getByRole("group", { name: "전체 선택 확인" }).getByRole("button", { name: "전체 선택" }).click();
  await expect(page.getByTestId("selected-count")).toHaveText(String(total));
  // 다시 누르면 묻지 않고 모두 해제
  await all.click();
  await expect(page.getByTestId("selected-count")).toHaveText("0");
});

test("매일 숙제: 기간 + 요일 칩(기본 월~금), 제목을 비우면 날짜가 제목, 기간 안에 요일이 없으면 안내", async ({ page }) => {
  await gotoReady(page, "/admin/homework/new");
  await page.getByRole("group", { name: "숙제 종류" }).getByRole("button", { name: "매일 숙제" }).click();
  await expect(page.getByLabel(/^시작일/)).toHaveValue("2026-10-05");
  await expect(page.getByLabel(/^종료일/)).toHaveValue("2026-10-11");
  const days = page.getByRole("group", { name: "숙제 내는 요일" }).getByRole("button");
  await expect(days).toHaveText(["월", "화", "수", "목", "금", "토", "일"].map((d) => new RegExp(d)));
  const pressed = await days.evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-pressed")));
  expect(pressed).toEqual(["true", "true", "true", "true", "true", "false", "false"]);
  await expect(page.getByRole("textbox", { name: /^제목/ })).toHaveAttribute("placeholder", "10/5~10/11 숙제");

  await page.getByRole("group", { name: "반으로 고르기" }).getByRole("button").first().click();
  const submit = page.getByRole("button", { name: /숙제 내기$/ });
  await expect(submit).toBeEnabled(); // 매일 숙제는 제목 없이도 낼 수 있다
  // 토·일만 있는 기간에 월~금 → 안내
  await page.getByLabel(/^시작일/).fill("2026-10-10");
  await page.getByLabel(/^종료일/).fill("2026-10-11");
  await submit.click();
  await expect(page.getByText("기간 안에 고른 요일이 없어요")).toBeVisible();
  // 요일을 모두 끄면 버튼이 꺼진다
  for (const d of ["월", "화", "수", "목", "금"]) await days.filter({ hasText: d }).click();
  await expect(submit).toBeDisabled();
  await expect(page.getByTestId("submit-hint")).toHaveText("대상·기간·요일을 채우면 낼 수 있어요");
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

test("넓은 화면은 2단: 왼쪽 종류·제목·내용, 오른쪽 대상 학생", async ({ page }) => {
  await gotoReady(page, "/admin/homework/new");
  const kind = (await page.getByRole("heading", { name: "종류" }).boundingBox())!;
  const targets = (await page.getByRole("heading", { name: "대상 학생" }).boundingBox())!;
  expect(targets.x).toBeGreaterThan(kind.x + 300);
  expect(Math.abs(targets.y - kind.y)).toBeLessThan(4);
});

test("휴대폰 폭: 등록·목록이 가로로 넘치지 않고 [숙제 내기]가 넓다", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await gotoReady(page, "/teacher/homework/new");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const btn = (await page.getByRole("button", { name: /숙제 내기$/ }).boundingBox())!;
  expect(btn.width).toBeGreaterThan(200);
  await gotoReady(page, "/admin/homework");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
