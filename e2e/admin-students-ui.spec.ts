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

// 10/8 여유 작업 A1·A2: 검색 넓히기(초성·전화·출결 번호·메모·보호자), 정렬 (STU-06)
test("검색: 초성·휴대폰 뒷자리·출결 번호·메모로 찾고, 찾은 글자를 표시", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/admin/students");
  const search = page.getByRole("searchbox", { name: /학생 검색/ });

  await search.fill("ㅈㄴㅇ");
  await expect(page.getByRole("row", { name: "조나윤 상세 보기" })).toBeVisible();
  await expect(page.getByRole("row", { name: "조나윤 상세 보기" }).locator("mark").first()).toHaveText("조나윤"); // 보호자 "조나윤맘"도 같이 표시

  await search.fill("5550-1001"); // 하이픈 섞인 휴대폰
  await expect(page.getByRole("row", { name: "조민재 상세 보기" })).toBeVisible();
  await expect(page.getByText(/65명 중 1명/)).toBeVisible();

  await search.fill("1234"); // 출결 번호
  await expect(page.getByRole("row", { name: "조나윤 상세 보기" })).toBeVisible();

  await search.fill("보호자 번호로"); // 메모
  await expect(page.getByRole("row", { name: "조나윤 상세 보기" }).locator("mark")).toHaveText("보호자 번호로");

  await search.fill("표승현맘"); // 보호자 이름 → 형제 둘 다
  await expect(page.getByRole("row", { name: /상세 보기/ })).toHaveCount(2);
});

test("휴대폰: 카드에 안 보이는 칸(메모)에서 찾으면 어디서 찾았는지 한 줄", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await gotoReady(page, "/admin/students");
  await page.getByRole("searchbox", { name: /학생 검색/ }).fill("보호자 번호로");
  const card = page.getByRole("list", { name: "재원생" }).getByRole("button", { name: "조나윤 상세 보기" });
  await expect(card).toContainText("메모");
  await expect(card.locator("mark")).toHaveText("보호자 번호로");
});

test("정렬: PC는 머리글을 눌러, 휴대폰은 선택칸으로", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/admin/students");
  const codes = () => page.locator("tbody tr td:nth-child(7)").allInnerTexts();

  const header = page.getByRole("columnheader", { name: /출결 코드/ });
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  const asc = await codes();
  expect(asc).toEqual([...asc].sort());
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  const desc = await codes();
  expect(desc).toEqual([...desc].sort().reverse());

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("combobox", { name: "정렬" }).selectOption({ label: "출결 번호순" });
  const cardCodes = await page.getByRole("list", { name: "재원생" }).locator("li").evaluateAll((lis) =>
    lis.map((li) => li.querySelector(".tabular.font-semibold")?.textContent ?? ""),
  );
  expect(cardCodes).toEqual([...cardCodes].sort());
});
