import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 원장님 홈 (10/12 v5: 예전 구성 + 토스 스타일): 사이드바 · 오늘 학원 숫자 · 확인할 일 · 보강 · 학부모 메시지
// 시험 날짜는 2026-10-05(월) 고정, 시각은 ?at=16:00
test.describe("원장님 홈 PC", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("예전 구성(숫자 5칸 → 확인할 일 → 보강·메시지)을 토스 스타일 카드로", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    // 회색 바탕 #F2F4F6 + 흰 카드(모서리 20, 안 여백 24, 그림자 없음)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-collapsed]")!).backgroundColor)).toBe("rgb(242, 244, 246)");
    const summary = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
    const checks = page.locator("section", { has: page.getByRole("heading", { name: /^확인할 일/ }) });
    const makeupCard = page.locator("section", { has: page.getByRole("heading", { name: /^오늘 보강/ }) });
    const msgCard = page.locator("section", { has: page.getByRole("heading", { name: /^읽지 않은 학부모 메시지/ }) });
    for (const c of [summary, checks, makeupCard, msgCard]) {
      await expect(c).toHaveCSS("border-radius", "20px");
      await expect(c).toHaveCSS("box-shadow", "none");
      await expect(c).toHaveCSS("padding-top", "24px");
    }
    // 순서: 날짜·숫자 → 확인할 일 → 보강·메시지
    const y = async (l: import("@playwright/test").Locator) => (await l.boundingBox())!.y;
    expect(await y(summary)).toBeLessThan(await y(checks));
    expect(await y(checks)).toBeLessThan(await y(makeupCard));
    expect(Math.round(await y(makeupCard))).toBe(Math.round(await y(msgCard))); // PC 2단
    // 두 카드 높이도 같다 (10/12 안정감)
    expect(Math.round((await makeupCard.boundingBox())!.height)).toBe(Math.round((await msgCard.boundingBox())!.height));
    // 카드 사이 16px
    const sb = (await summary.boundingBox())!;
    expect(Math.round((await y(checks)) - (sb.y + sb.height))).toBe(16);

    // 오늘 학원 숫자 5칸: 숫자 32px 700, 결석(0보다 크면) 빨강 글씨, 0은 회색
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("color", "rgb(78, 89, 104)");
    await expect(summary.locator("[data-asof]")).toHaveText("16:00 기준");
    const stats = summary.locator("li[data-stat]");
    await expect(stats).toHaveCount(5);
    expect(await stats.evaluateAll((ls) => ls.map((l) => l.getAttribute("data-stat")))).toEqual(["homework", "attendance", "absent", "makeup", "teachers"]); // 숙제 첫 칸 (10/13)
    const att = summary.locator('[data-stat="attendance"] [data-value]');
    await expect(att).toHaveCSS("font-size", "32px");
    await expect(att).toHaveCSS("font-weight", "700");
    await expect(att).toHaveCSS("color", "rgb(25, 31, 40)");
    await expect(summary.locator('[data-stat="attendance"]')).toContainText(/\d+\s*\/ \d+/);
    await expect(summary.locator('[data-stat="absent"] [data-value]')).toHaveCSS("color", "rgb(217, 31, 47)");
    // 10/13 명세: 칸 박스 없이 세로선 1px, 라벨 앞 상태색 점 6px (등원 초록·결석 빨강·숙제 파랑·보강 보라·선생님 회색)
    const statLinks = stats.locator("a");
    for (const bg of await statLinks.evaluateAll((as) => as.map((a) => getComputedStyle(a).backgroundColor))) expect(bg).toBe("rgba(0, 0, 0, 0)");
    await expect(stats.nth(1)).toHaveCSS("border-left-width", "1px");
    await expect(stats.nth(1)).toHaveCSS("border-left-color", "rgb(242, 244, 246)");
    await expect(stats.first()).toHaveCSS("border-left-width", "0px");
    const dots = await stats.locator("[data-dot]").evaluateAll((ds) => ds.map((d) => [getComputedStyle(d).width, getComputedStyle(d).backgroundColor]));
    expect(dots).toEqual([
      ["6px", "rgb(49, 130, 246)"],
      ["6px", "rgb(0, 196, 113)"],
      ["6px", "rgb(240, 68, 82)"],
      ["6px", "rgb(123, 92, 250)"],
      ["6px", "rgb(139, 149, 161)"],
    ]);

    // 확인할 일: 제목의 개수 = 줄 수, 줄마다 "보기"
    const rows = checks.locator("li[data-check]");
    // 숙제 줄(미제출·피드백)이 맨 위 (10/13 범준님)
    expect((await rows.evaluateAll((ls) => ls.map((l) => l.getAttribute("data-check")))).slice(0, 2)).toEqual(["homework", "feedback"]);
    const n = await rows.count();
    expect(n).toBeGreaterThan(0);
    // 제목에는 숫자를 붙이지 않는다 (종류 수가 건수와 헷갈려서, 10/12)
    await expect(checks.getByRole("heading", { name: "확인할 일", exact: true })).toBeVisible();
    await expect(rows.first().getByRole("link")).toContainText("보기");
    // 줄은 박스 없이 구분선만 (10/13 명세), 숫자는 학원 색 버건디
    const bgs = await rows.locator("a").evaluateAll((as) => as.map((a) => getComputedStyle(a).backgroundColor));
    for (const bg of bgs) expect(bg).toBe("rgba(0, 0, 0, 0)");
    if (n > 1) await expect(rows.first()).toHaveCSS("border-bottom-width", "1px"); // 줄 사이 구분선 (Tailwind v4 divide-y = 마지막 줄 빼고 아래쪽 선)
    await expect(rows.first().locator(".text-figure-md")).toHaveCSS("color", "rgb(179, 38, 46)");
    // 카드 제목은 20px 굵게: 내용(15px)과 확실히 나뉘게 (10/13)
    const title = checks.getByRole("heading", { name: "확인할 일", exact: true });
    await expect(title).toHaveCSS("font-size", "20px");
    await expect(title).toHaveCSS("font-weight", "700");
    // 아바타는 회색, 태그는 결석·조퇴·지각 빨강 계열 · 일정 연한 파랑 (10/13 명세)
    const unread = page.locator("[data-message]");
    const avatarBgs = await unread.locator("[data-avatar]").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
    expect(new Set(avatarBgs)).toEqual(new Set(["rgb(242, 244, 246)"]));
    await expect(unread.locator('[data-group="today"]').first()).toHaveCSS("background-color", "rgb(255, 239, 241)");
    await expect(unread.locator('[data-group="schedule"]').first()).toHaveCSS("background-color", "rgb(232, 243, 255)");
    // 바로가기는 없앴다 (10/13 범준님, 메뉴는 사이드바)
    await expect(page.getByRole("navigation", { name: "바로가기" })).toHaveCount(0);
    // 시간표 중심 구성은 없앴다 (원장님: "시간표는 루틴이라 중요하지 않다")
    await expect(page.getByRole("list", { name: "오늘 시간표" })).toHaveCount(0);
  });

  test("숙제 미제출은 그 반 수업 시작 뒤에만 확인할 일에 (14:00 없음 → 16:00 있음)", async ({ page }) => {
    const hw = page.locator('li[data-check="homework"]');
    await gotoReady(page, "/admin?at=14:00");
    await expect(hw).toHaveCount(0);
    await gotoReady(page, "/admin?at=16:00");
    await expect(hw).toBeVisible();
    await expect(hw).toContainText(/\d+\s*\/ \d+\s*명/);
  });

  test("아침(수업 전)에도 확인할 일이 비지 않는다: 피드백 안 한 숙제·보강 잡을 학생 (10/13)", async ({ page }) => {
    await gotoReady(page, "/admin?at=08:50");
    const checks = page.locator("li[data-check]");
    // 수업 전이라 미등원·숙제 미제출은 없다
    await expect(page.locator('li[data-check="notArrived"], li[data-check="homework"]')).toHaveCount(0);
    await expect(page.locator('li[data-check="feedback"]')).toContainText(/피드백 안 한 숙제/);
    await expect(page.locator('li[data-check="feedback"]').getByRole("link")).toHaveAttribute("href", "/admin/homework");
    await expect(page.locator('li[data-check="makeupNeeded"]')).toContainText(/보강 잡을 학생/);
    await expect(page.locator('li[data-check="makeupNeeded"]').getByRole("link")).toHaveAttribute("href", "/admin/makeups");
    expect(await checks.count()).toBeGreaterThanOrEqual(3);
  });

  test("보강: 반 색 아바타, 진행 중(파랑)·n시간 후·다음 보강", async ({ page }) => {
    const card = page.locator("section", { has: page.getByRole("heading", { name: /^오늘 보강/ }) });
    await gotoReady(page, "/admin?at=16:00");
    const first = card.locator("li[data-makeup]").first();
    await expect(first.locator("[data-avatar]")).toHaveCSS("width", "40px");
    await expect(first.locator("[data-state]")).toHaveText(/^\d+(분|시간) 후$/);
    // 상태는 오른쪽 끝이 아니라 시각 바로 옆 작은 회색 글씨 (10/13 명세)
    const state = first.locator("[data-state]");
    await expect(state).toHaveCSS("font-size", "13px");
    await expect(state).toHaveCSS("color", "rgb(100, 110, 124)");
    const timeBox = (await first.getByText(/^\d{2}:\d{2}–\d{2}:\d{2}$/).boundingBox())!;
    const stateBox = (await state.boundingBox())!;
    expect(stateBox.x - (timeBox.x + timeBox.width)).toBeLessThan(16);
    await expect(card.getByRole("heading", { name: "다음 보강" })).toBeVisible();
    // 17:30: 17:00 보강이 진행 중
    await gotoReady(page, "/admin?at=17:30");
    const live = card.locator("li[data-makeup]").first().locator("[data-state]");
    await expect(live).toHaveText("진행 중");
    await expect(live).toHaveCSS("color", "rgb(27, 100, 218)");
  });

  test("학부모 메시지: 반 색 아바타·이름 · 관계·용건 태그·시간, 오늘 수업에 영향 있는 연락이 먼저", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const card = page.locator("section", { has: page.getByRole("heading", { name: /^읽지 않은 학부모 메시지/ }) });
    const rows = card.locator("li[data-message]");
    await expect(rows).toHaveCount(5); // 최근 5건, 나머지는 "외 N건"
    await expect(card).toContainText(/외 \d+건은 메시지 화면에서 확인/);
    await expect(rows.first().locator("[data-avatar]")).toHaveText(/^(초저|초중|초고|브릿지|코어|마스터|포커스)$/);
    await expect(rows.first()).toContainText(/· (어머님|아버님)/);
    for (const t of await rows.locator("[data-time]").allInnerTexts()) expect(t).toMatch(/^(오전|오후) \d{1,2}:\d{2}$|^어제$|^\d{1,2}\/\d{1,2}$/);
    const tags = await rows.locator("[data-tag]").evaluateAll((els) => els.map((e) => e.getAttribute("data-tag")!));
    const firstOther = tags.findIndex((t) => t === "일정" || t === "문의");
    expect(firstOther).toBeGreaterThan(0);
    expect(tags.slice(firstOther).some((t) => ["결석", "조퇴", "지각"].includes(t))).toBe(false);
    // 자동 분류
    await expect(rows.filter({ hasText: "쉬게" }).locator("[data-tag]")).toHaveText("결석");
    await expect(rows.filter({ hasText: "데리러" }).locator("[data-tag]")).toHaveText("조퇴");
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
    await page.getByRole("heading", { name: /^확인할 일/ }).click();
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

});

test.describe("원장님 홈 휴대폰 375", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("카드가 한 줄로 쌓이고, 숫자는 2칸씩(마지막 칸은 가로로 꽉), 아래 탭 5개", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const tabs = page.getByRole("navigation", { name: "아래 메뉴" }).getByRole("link");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.first()).toHaveAttribute("aria-current", "page");
    // 카드: 왼쪽 끝·폭이 같고 위에서 아래로
    const cards = page.locator("[data-tone=page] section");
    const boxes = await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x: Math.round(r.x), w: Math.round(r.width), y: r.y })));
    expect(boxes.length).toBe(4);
    for (const b of boxes) {
      expect(b.x).toBe(16);
      expect(b.w).toBe(375 - 32);
    }
    expect(boxes.map((b) => b.y)).toEqual([...boxes.map((b) => b.y)].sort((a, b) => a - b));
    // 숫자 5칸: 2칸씩, 마지막 칸은 두 칸 폭
    const w = await page.locator("li[data-stat]").evaluateAll((lis) => lis.map((li) => Math.round(li.getBoundingClientRect().width)));
    expect(w[0]).toBe(w[1]);
    expect(w[4]).toBeGreaterThan(w[0] * 1.9);
    // 휴대폰 머리줄 오른쪽 아바타 → 같은 메뉴
    await page.getByRole("banner").getByRole("button", { name: /^내 계정 메뉴/ }).click();
    await expect(page.getByRole("menuitem", { name: "로그아웃" })).toBeVisible();
    await page.keyboard.press("Escape");
    // 더보기
    await tabs.last().click();
    await expect(page).toHaveURL(/\/admin\/more/);
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
