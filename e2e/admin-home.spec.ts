import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 원장님 홈 (10/9 v2 → 10/12 정식 홈): 사이드바 · 오늘 시간표 타임라인 · 처리할 일
// 시험 날짜는 2026-10-05(월) 고정, 시각은 ?at=16:00
test.describe("원장님 홈 PC", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("사이드바·한 문장 요약·등원 막대와 범례·시간순 블록·지금 가로선", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const side = page.getByRole("navigation", { name: "주 메뉴" });
    await expect(side.getByRole("link")).toHaveCount(7);
    await expect(side.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("p[aria-live]").filter({ visible: true })).toHaveText(/^(지금 \d+개 반 수업 중|지금 수업 중인 반은 없어요) · 등원 \d+\/\d+ · 결석 \d+$/);

    const timeline = page.getByRole("list", { name: "오늘 시간표" });
    const starts = await timeline.locator("li a [data-start]").allInnerTexts();
    expect(starts.length).toBeGreaterThan(0);
    expect(starts).toEqual([...starts].sort()); // 시간순
    await expect(timeline.getByRole("listitem", { name: "지금 16:00" })).toBeVisible();

    // 오늘 전체 출결: 등원만 채운 6px 막대 (등원 → 미등원 → 결석 → 수업 전 순서로 읽힌다)
    const bar = page.getByRole("img", { name: /^등원 \d+, 미등원 \d+, 결석 \d+, 수업 전 \d+ \(전체 \d+명\)$/ }).first();
    await expect(bar).toBeVisible();
    // 막대는 등원만 채운다 (결석·미등원은 숫자로만, 10/12)
    await expect(bar.locator("span")).toHaveCount(1);
    await expect(bar.locator("span")).toHaveClass(/bg-arrive/);
    await expect(bar).toHaveCSS("height", "6px");
    // v3 위계(10/12): 히어로 "등원 x/y" 32px 700 진한 검정, 나머지 숫자는 15px 보조 회색, 순서 미등원 → 결석 → 수업 전
    const hero = page.locator("[data-hero]").filter({ visible: true });
    await expect(hero).toHaveText(/^등원 \d+\/\d+$/);
    await expect(hero).toHaveCSS("font-size", "32px");
    await expect(hero).toHaveCSS("font-weight", "700");
    await expect(hero).toHaveCSS("color", "rgb(25, 31, 40)");
    const rest = page.locator("[data-summary-rest]").filter({ visible: true });
    // 화면 읽기 프로그램은 위 한 문장을 읽고 이 칸은 숨긴다(aria-hidden) → li로 찾는다
    expect((await rest.locator("li").allInnerTexts()).map((t) => t.replace(/\s*\d+$/, "").trim())).toEqual(["미등원", "결석", "수업 전"]);
    await expect(rest).toHaveCSS("font-size", "15px");
    // 토스 스타일: 회색 바탕 #F2F4F6 + 흰 카드(모서리 20, 안 여백 24, 그림자 없음)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-collapsed]")!).backgroundColor)).toBe("rgb(242, 244, 246)");
    const card = page.locator("section", { has: page.getByRole("heading", { name: "오늘 시간표" }) });
    await expect(card).toHaveCSS("border-radius", "20px");
    await expect(card).toHaveCSS("box-shadow", "none");
    await expect(card).toHaveCSS("padding-top", "24px");
    // 진행 중인 반만 왼쪽 파랑 4px 막대
    await expect(timeline.locator('a[data-state="수업 중"] [data-live-bar]').first()).toHaveCSS("width", "4px");
    await expect(timeline.locator('a[data-state="예정"] [data-live-bar]')).toHaveCount(0);
  });

  test("다른 원장님 화면도 같은 사이드바, 접으면 아이콘만 + 하위 메뉴 줄, 다시 열어도 기억", async ({ page }) => {
    await gotoReady(page, "/admin/students");
    const side = page.getByRole("navigation", { name: "주 메뉴" });
    await expect(side.getByRole("link", { name: "재원생" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("navigation", { name: "학생관리 하위 메뉴" })).toBeHidden();

    await page.getByRole("button", { name: "메뉴 접기" }).click();
    const aside = page.getByRole("complementary", { name: "원장님 메뉴" });
    await expect.poll(async () => (await aside.boundingBox())!.width).toBe(64);
    await expect(side.getByRole("link", { name: "학생관리" })).toBeVisible(); // 아이콘만, 이름은 aria-label
    await expect(page.getByRole("navigation", { name: "학생관리 하위 메뉴" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "메뉴 펼치기" })).toBeVisible();
    await page.getByRole("button", { name: "메뉴 펼치기" }).click();
    await expect.poll(async () => (await aside.boundingBox())!.width).toBe(220);
  });

  test("사이드바 프로필: 이름·역할, 누르면 내 정보·로그아웃(빨강), 로그아웃은 한 번 더 묻는다, 키보드로도", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const aside = page.getByRole("complementary", { name: "원장님 메뉴" });
    // 가상 데이터에는 계정 이름이 없어 "원장님" (내부 이름 "총괄관리자"는 보이지 않는다)
    const trigger = aside.getByRole("button", { name: "내 계정 메뉴: 원장님 원장" });
    await expect(trigger).toBeVisible();
    await expect(aside).not.toContainText("총괄관리자");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // 키보드: Enter로 열면 첫 항목에 초점, ↓로 로그아웃, Esc로 닫으면 프로필 버튼으로
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu", { name: "내 계정" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "내 정보" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    const logout = menu.getByRole("menuitem", { name: "로그아웃" });
    await expect(logout).toBeFocused();
    await expect(logout).toHaveCSS("color", "rgb(217, 31, 47)");
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();

    // 로그아웃 → 확인 → 취소하면 그대로 이 화면
    await trigger.click();
    await page.getByRole("menuitem", { name: "로그아웃" }).click();
    const confirm = page.getByRole("menu", { name: "로그아웃 확인" });
    await expect(confirm).toContainText("로그아웃할까요?");
    await confirm.getByRole("menuitem", { name: "취소" }).click();
    await expect(page).toHaveURL(/\/admin\?at=16/);

    // 바깥을 누르면 닫힌다
    await page.getByRole("heading", { name: "오늘 시간표" }).click();
    await expect(page.getByRole("menu")).toHaveCount(0);

    // 접으면 아바타만, 눌러도 같은 메뉴
    await page.getByRole("button", { name: "메뉴 접기" }).click();
    await expect(aside.getByText("원장", { exact: true })).toHaveCount(0);
    await aside.getByRole("button", { name: /^내 계정 메뉴/ }).click();
    await expect(page.getByRole("menuitem", { name: "내 정보" })).toBeVisible();
    await page.getByRole("menuitem", { name: "내 정보" }).click();
    await expect(page).toHaveURL(/\/admin\/me$/);
    await page.getByRole("button", { name: "메뉴 펼치기" }).click();
  });

  test("예전 주소 /admin/home-v2 는 홈으로", async ({ page }) => {
    await page.goto("/admin/home-v2?at=16:00");
    await expect(page).toHaveURL(/\/admin\?at=16/);
  });

  test("반 블록을 누르면 그 반을 골라 둔 출결 화면", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const block = page.getByRole("list", { name: "오늘 시간표" }).locator('a[href^="/teacher?class="]').first();
    const href = (await block.getAttribute("href"))!;
    await block.click();
    await expect(page).toHaveURL((u) => u.pathname + u.search === href);
    await expect(page.getByRole("group", { name: "반으로 거르기" }).getByRole("button", { pressed: true })).not.toHaveText(/전체 반/);
  });

  test("알림: 받는 사람 수를 보여 주는 확인 창 → 취소하면 그대로, [N명에게 보내기]를 눌러야 사라진다", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: /^처리할 일/ }) });
    const row = panel.locator("ul > li").filter({ has: page.getByRole("button", { name: "알림" }) }).first();
    const title = (await row.locator("[data-todo-title]").innerText()).trim();
    // 알림(테두리)과 답장(회색 면)은 모양이 다르다
    await expect(row.getByRole("button", { name: "알림" })).toHaveCSS("border-top-width", "1px");
    await expect(panel.getByRole("button", { name: "답장" }).first()).toHaveCSS("border-top-width", "0px");

    await row.getByRole("button", { name: "알림" }).click();
    const dialog = page.getByRole("dialog", { name: "알림 보내기" });
    await expect(dialog).toContainText(/\d+명에게 앱 알림을 보냅니다/);
    await dialog.getByRole("button", { name: "취소" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(panel.getByText(title, { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "알림" }).click();
    await page.getByRole("dialog", { name: "알림 보내기" }).getByRole("button", { name: /^\d+명에게 보내기$/ }).click();
    await expect(panel.getByText(title, { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("toast")).toContainText("알림을 보냈어요");
  });

  test("숙제 미제출은 그 반 수업 시작 시각이 지나야 나오고, 처리할 일 개수도 같이 바뀐다", async ({ page }) => {
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: /^처리할 일/ }) });
    const hw = panel.getByText(/숙제 미제출$/);
    const countOf = async () => Number((await panel.getByRole("heading").innerText()).match(/\d+/)![0]);
    // 14:00: 오늘 가장 이른 반(14:30 시작)도 아직 → 숙제 줄 없음
    await gotoReady(page, "/admin?at=14:00");
    await expect(hw).toHaveCount(0);
    const before = await countOf();
    // 16:00: 14:30·15:30 시작 반은 지났고, 17:00 이후 반은 아직
    await gotoReady(page, "/admin?at=16:00");
    const titles = await hw.allInnerTexts();
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles) expect(t).toMatch(/^OB-/);
    expect(await countOf()).toBeGreaterThanOrEqual(before + titles.length);
  });

  test("처리할 일: 누르면 바로 사라지고, 저장이 실패하면 다시 나타난다", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: /^처리할 일/ }) });
    // 확인 창이 없는 답장 줄로 본다
    const first = panel.locator("ul > li").filter({ has: page.getByRole("button", { name: "답장" }) }).first();
    const title = (await first.locator("[data-todo-title]").innerText()).trim();
    const before = await panel.getByRole("heading").innerText();
    await first.getByRole("button").click();
    await expect(panel.getByText(title, { exact: true })).toHaveCount(0);
    await expect(panel.getByRole("heading")).not.toHaveText(before);
    await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "success");

    // 실패 흉내: 다시 나타나고 실패 안내
    await page.evaluate(() => (window.__leetFailSave = true));
    const next = panel.locator("ul > li").filter({ has: page.getByRole("button", { name: "답장" }) }).first();
    const title2 = (await next.locator("[data-todo-title]").innerText()).trim();
    await next.getByRole("button").click();
    await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "error");
    await expect(panel.getByText(title2, { exact: true })).toBeVisible();
  });
});

test.describe("원장님 홈 휴대폰 375", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("요약 → 처리할 일 한 줄 → 지금 수업 중(미등원 이름) → 다음 수업, 아래 탭 5개", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    await expect(page.getByRole("heading", { name: /^지금 수업 중/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "다음 수업" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "아래 메뉴" }).getByRole("link");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.first()).toHaveAttribute("aria-current", "page");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // 흰 카드가 한 줄로 쌓인다: 요약·처리할 일·다음 수업 카드의 왼쪽 끝과 폭이 같고, 위에서 아래로
    const boxes = await Promise.all(
      [page.locator("header").filter({ has: page.locator("[data-hero]") }), page.getByRole("link", { name: /^처리할 일/ }), page.locator("section", { has: page.getByRole("heading", { name: "다음 수업" }) })].map(
        async (l) => (await l.filter({ visible: true }).boundingBox())!,
      ),
    );
    for (const b of boxes) {
      expect(Math.round(b.x)).toBe(16);
      expect(Math.round(b.width)).toBe(375 - 32);
    }
    expect(boxes[0].y).toBeLessThan(boxes[1].y);
    expect(boxes[1].y).toBeLessThan(boxes[2].y);
    // 휴대폰 머리줄 오른쪽 아바타 → 같은 메뉴
    await page.getByRole("banner").getByRole("button", { name: /^내 계정 메뉴/ }).click();
    await expect(page.getByRole("menuitem", { name: "로그아웃" })).toBeVisible();
    await page.keyboard.press("Escape");
    // 처리할 일 한 줄 → 목록 화면
    await page.getByRole("link", { name: /^처리할 일/ }).click();
    await expect(page).toHaveURL(/\/admin\/todo/);
    await expect(page.getByRole("heading", { level: 1, name: "처리할 일" })).toBeVisible();
    // 더보기
    await tabs.last().click();
    await expect(page).toHaveURL(/\/admin\/more/);
    await expect(page.getByRole("link", { name: "기존 홈 보기 (비교용)" })).toHaveCount(0);
  });
});

// 10/12: 선생님 화면도 같은 사이드바 + 같은 프로필 부품 (역할만 "선생님")
test.describe("선생님 화면 사이드바", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("메뉴 아이콘·접기, 프로필은 이름 + 선생님", async ({ page }) => {
    await gotoReady(page, "/teacher?at=16:00");
    const aside = page.getByRole("complementary", { name: "선생님 메뉴" });
    await expect(aside.getByRole("navigation", { name: "주 메뉴" }).getByRole("link")).toHaveCount(6);
    await expect(aside.getByRole("link", { name: "홈", exact: true })).toHaveAttribute("aria-current", "page");
    const trigger = aside.getByRole("button", { name: /^내 계정 메뉴: .+ 선생님$/ });
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole("menuitem", { name: "로그아웃" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "메뉴 접기" }).click();
    await expect.poll(async () => (await aside.boundingBox())!.width).toBe(64);
    await page.getByRole("button", { name: "메뉴 펼치기" }).click();
  });
});
