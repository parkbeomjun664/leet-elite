import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 10/7 학생관리 다듬기: 아직 안 되는 버튼은 열리는 날짜 안내, 휴대폰 카드는 [여러 명 선택]일 때만 체크
test("아직 준비 중인 버튼: 누르면 열리는 날짜를 안내", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/admin/students");
  await page.getByRole("button", { name: "엑셀로 내보내기" }).click();
  await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "info");
  await expect(page.getByTestId("toast")).toContainText("엑셀 내보내기 기능은 10/22에 열려요");
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
  // 1440 미만은 메모 열을 숨기고 이름 아래에 "메모 …" 한 줄로 보여 준다
  await expect(page.getByRole("row", { name: "조나윤 상세 보기" }).locator("mark:visible")).toHaveText("보호자 번호로");

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

// 10/8 UI 4: 1280 이상 표가 컨테이너 안에, 휴대폰·입학일·메모는 표 폭 1380 이상에서만(10/12), 1024~1279는 카드
test.describe("재원생 표 폭", () => {
  test("1280: 표가 컨테이너 안에 들어오고(가로 스크롤 없음) 7개 열만", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoReady(page, "/admin/students");
    const table = page.getByRole("table");
    const fit = await table.evaluate((t) => ({ table: t.scrollWidth, box: t.parentElement!.clientWidth }));
    expect(fit.table).toBeLessThanOrEqual(fit.box);
    const headers = await page.getByRole("columnheader").evaluateAll((ths) => ths.filter((th) => (th as HTMLElement).offsetParent !== null).map((th) => th.textContent?.replace(/[▲▼]/g, "").trim()));
    expect(headers).toEqual(["보이는 학생 전체 선택", "이름", "학교·학년", "반", "수업 요일·시간", "출결 코드", "보호자"]);
    // 이름 칸은 왼쪽에 고정
    await expect(page.getByRole("columnheader", { name: /이름/ })).toHaveCSS("position", "sticky");
  });

  // 10/12: 화면 폭이 아니라 표가 받은 폭(1380 이상)으로 정한다. 사이드바(220)를 펼친 1440은 표 폭이 모자라 숨김
  test("표 폭이 넉넉하면(1920) 학생 휴대폰·입학일·메모 열도, 1440(사이드바 펼침)은 숨김", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await gotoReady(page, "/admin/students");
    for (const name of ["학생 휴대폰", "입학일", "메모"]) await expect(page.getByRole("columnheader", { name: new RegExp(name) })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const name of ["학생 휴대폰", "입학일", "메모"]) await expect(page.getByRole("columnheader", { name: new RegExp(name) })).toBeHidden();
  });

  test("1024: 표 대신 카드", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await gotoReady(page, "/admin/students");
    await expect(page.getByRole("list", { name: "재원생" })).toBeVisible();
    await expect(page.getByRole("table")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

// 10/12 새 학생 등록 (STU-01): 수정 창과 같은 창·검사 규칙, 출결 번호는 휴대폰 뒷 4자리 → 겹치면 빈 번호
test.describe("새 학생 등록", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("이름이 없으면 등록되지 않고, 휴대폰을 넣으면 출결 번호가 따라 채워진다", async ({ page }) => {
    await gotoReady(page, "/admin/students");
    await page.getByRole("button", { name: "학생 등록" }).click();
    const dialog = page.getByRole("dialog", { name: /새 학생 등록/ });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/new=1/);
    // 상태는 재원·(입학) 예정만
    await expect(dialog.getByLabel("상태").locator("option")).toHaveText(["재원", "예정"]);
    // 로그인 계정 구역은 등록 뒤에
    await expect(dialog.getByRole("heading", { name: "로그인 계정" })).toHaveCount(0);

    await dialog.getByLabel("학생 휴대폰").fill("010-5550-1987");
    await expect(dialog.getByLabel(/출결 코드/)).toHaveValue("1987");
    // 이미 쓰는 번호(조민재 1001)를 넣으면 안내, [빈 번호]로 다른 번호
    await dialog.getByLabel(/출결 코드/).fill("1001");
    await expect(dialog.getByText("1001번은 조민재 학생이 쓰고 있어요")).toBeVisible();
    await dialog.getByRole("button", { name: "빈 번호" }).click();
    await expect(dialog.getByLabel(/출결 코드/)).toHaveValue("1987");

    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(dialog.getByText("이름을 입력해 주세요")).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test("등록하면 창이 닫히고 목록에 새 학생 줄이 생긴다", async ({ page }) => {
    await gotoReady(page, "/admin/students");
    await page.getByRole("button", { name: "학생 등록" }).click();
    const dialog = page.getByRole("dialog", { name: /새 학생 등록/ });
    await dialog.getByLabel("이름").fill("가나다");
    await dialog.getByLabel("학교").fill("시험초");
    await dialog.getByRole("button", { name: /^OB-초저/ }).click();
    await dialog.getByRole("button", { name: "+ 요일 추가" }).click();
    await dialog.getByRole("button", { name: "등록" }).click();
    await expect(page.getByTestId("toast")).toContainText("가나다 학생을 등록했어요");
    await expect(dialog).toHaveCount(0);
    await expect(page).not.toHaveURL(/new=1/);
    const row = page.getByRole("row", { name: "가나다 상세 보기" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("OB-초저");
    await expect(page.getByText(/재원 66명/)).toHaveCount(0); // 목록 숫자는 새로고침 때 (서버 값)
  });
});

// 10/12 범준님: 표 머리글이 너무 작고(13px) 정렬 버튼 칸이 아래 칸보다 오른쪽으로 밀려 있었다
// 머리글 14px, 머리글 글자 시작 = 아래 칸 글자 시작. 사이드바를 펼친 1440에서도 표가 가로로 넘치지 않는다
for (const width of [1440, 1920]) {
  test(`재원생 표 ${width}: 머리글 14px, 글자 시작이 아래 칸과 같고, 가로로 넘치지 않는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await gotoReady(page, "/admin/students");
    const table = page.getByRole("table");
    await expect(table.locator("thead th").nth(1)).toHaveCSS("font-size", "14px");
    const offsets = await table.evaluate((t) => {
      // 칸 안 첫 글자의 x
      const textX = (el: Element) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent!.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
        const node = walker.nextNode();
        if (!node) return null;
        const r = document.createRange();
        r.selectNodeContents(node);
        return r.getBoundingClientRect().x;
      };
      const ths = [...t.querySelectorAll("thead th")].filter((th) => (th as HTMLElement).offsetParent);
      const tds = [...t.querySelector("tbody tr")!.children].filter((td) => (td as HTMLElement).offsetParent);
      return ths.slice(1).map((th, i) => {
        const a = textX(th);
        const b = textX(tds[i + 1]);
        return a === null || b === null ? 0 : Math.abs(a - b);
      });
    });
    for (const d of offsets) expect(d).toBeLessThan(2);
    expect(await table.evaluate((t) => t.parentElement!.scrollWidth <= t.parentElement!.clientWidth)).toBe(true);
  });
}
