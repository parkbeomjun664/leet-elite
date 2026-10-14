import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 원장님 홈 (10/14 저녁 배치): 사이드바 · 날짜 · 오늘 학원 숫자 · 확인할 일 KPI 4칸 · 보강 · 학부모 메시지
// 시험 날짜는 2026-10-05(월) 고정, 시각은 ?at=16:00
test.describe("원장님 홈 PC", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("배치: 날짜 → 숫자 5칸 → 확인할 일 KPI 4칸 → 보강·학부모 메시지 2열 (10/14 저녁 명세)", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    // 옅은 회색 바탕(canvas) + 흰 카드(모서리 20·안 24·테두리 1px·그림자 없음)
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-collapsed]")!).backgroundColor)).toBe("rgb(248, 249, 250)");
    const statsList = page.getByRole("list", { name: "오늘 학원" });
    const stats = statsList.locator("li[data-stat]");
    const kpis = page.locator("li[data-check]");
    const makeup = page.locator("section", { has: page.getByRole("heading", { name: "보강", exact: true }) });
    const msg = page.locator("section", { has: page.getByRole("heading", { name: /^읽지 않은 학부모 메시지/ }) });
    for (const c of [makeup, msg, kpis.first().getByRole("link")]) {
      await expect(c).toHaveCSS("border-radius", "20px");
      await expect(c).toHaveCSS("padding-top", "24px");
      await expect(c).toHaveCSS("box-shadow", "none");
    }
    await expect(statsList).toHaveCSS("background-color", "rgb(255, 255, 255)");
    // 날짜 제목·기준 시각
    await expect(page.getByRole("heading", { level: 1 })).toContainText("2026년 10월 5일 (월)");
    await expect(page.locator("[data-asof]")).toHaveText("16:00 기준");
    // 순서와 칸: KPI 4칸 한 줄(카드 사이 16px), 아래 2열 높이 같게
    const box = async (l: import("@playwright/test").Locator) => (await l.boundingBox())!;
    expect((await box(statsList)).y).toBeLessThan((await box(kpis.first())).y);
    await expect(kpis).toHaveCount(4);
    expect(await kpis.evaluateAll((ls) => ls.map((l) => l.getAttribute("data-check")))).toEqual(["unread", "teachers", "feedback", "makeupNeeded"]);
    const kb = await kpis.evaluateAll((ls) => ls.map((l) => l.getBoundingClientRect()).map((r) => [Math.round(r.y), Math.round(r.x), Math.round(r.width)]));
    expect(new Set(kb.map((k) => k[0])).size).toBe(1);
    expect(kb[1][1] - (kb[0][1] + kb[0][2])).toBe(16);
    expect((await box(makeup)).y).toBeGreaterThan((await box(kpis.first())).y);
    expect(Math.round((await box(makeup)).y)).toBe(Math.round((await box(msg)).y));
    expect(Math.round((await box(makeup)).height)).toBe(Math.round((await box(msg)).height));

    // 숫자 5칸: 숫자 700, 결석(0보다 크면) 빨강, 이름 앞 상태색 점 6px
    await expect(stats).toHaveCount(5);
    await expect(page.locator('[data-stat="attendance"] [data-value]')).toHaveCSS("color", "rgb(25, 31, 40)");
    await expect(page.locator('[data-stat="absent"] [data-value]')).toHaveCSS("color", "rgb(217, 31, 47)");
    const dots = await stats.locator("[data-dot]").evaluateAll((ds) => ds.map((d) => getComputedStyle(d).backgroundColor));
    expect(dots).toEqual(["rgb(0, 196, 113)", "rgb(240, 68, 82)", "rgb(49, 130, 246)", "rgb(123, 92, 250)", "rgb(139, 149, 161)"]);

    // KPI: 칸 전체가 링크, 이름 13px base, 숫자 700 진한(빨강 없음), 이름 요약 한 줄 말줄임, 점 색, 첫 칸 연한 파랑, "보기" 없음
    const first = kpis.first().getByRole("link");
    await expect(first).toHaveAttribute("href", "/admin/messages");
    await expect(first).toHaveCSS("background-color", "rgb(232, 243, 255)");
    await expect(first.locator("[data-label]")).toHaveCSS("font-size", "13px");
    await expect(first.locator("[data-label]")).toHaveCSS("color", "rgb(78, 89, 104)");
    for (const v of await kpis.locator("[data-value]").evaluateAll((els) => els.map((e) => getComputedStyle(e).color))) expect(["rgb(25, 31, 40)", "rgb(139, 149, 161)"]).toContain(v);
    await expect(first.locator(".truncate").last()).toHaveCSS("white-space", "nowrap");
    const kdots = await kpis.locator("[data-dot]").evaluateAll((ds) => ds.map((d) => getComputedStyle(d).backgroundColor));
    expect(kdots).toEqual(["rgb(49, 130, 246)", "rgb(255, 159, 10)", "rgb(255, 159, 10)", "rgb(240, 68, 82)"]);
    await expect(page.locator("li[data-check]").getByText("보기")).toHaveCount(0);
    // 바로가기·시간표는 없다
    await expect(page.getByRole("navigation", { name: "바로가기" })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "오늘 시간표" })).toHaveCount(0);
  });

  test("KPI 숫자가 0이면 회색(#8B95A1), 이름 요약은 '없어요' (아침 08:50: 아직 아무도 출근 전)", async ({ page }) => {
    await gotoReady(page, "/admin?at=08:50");
    const teachers = page.locator('li[data-check="teachers"]');
    await expect(teachers.locator("[data-value]")).toHaveText("0");
    await expect(teachers.locator("[data-value]")).toHaveCSS("color", "rgb(139, 149, 161)");
    await expect(teachers).toContainText("없어요");
    // 0이 아닌 칸은 진한 글씨
    await expect(page.locator('li[data-check="feedback"] [data-value]')).toHaveCSS("color", "rgb(25, 31, 40)");
  });

  test("보강: 오늘 / 다음 구분선, 반 연한 색 아바타, 진행 중(파랑)·n시간 후", async ({ page }) => {
    const card = page.locator("section", { has: page.getByRole("heading", { name: "보강", exact: true }) });
    await gotoReady(page, "/admin?at=16:00");
    const first = card.locator("li[data-makeup]").first();
    await expect(first.locator("[data-avatar]")).toHaveCSS("width", "40px");
    expect(await first.locator("[data-avatar]").evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe("rgb(242, 244, 246)");
    await expect(first.locator("[data-state]")).toHaveText(/^\d+(분|시간) 후$/);
    const state = first.locator("[data-state]");
    await expect(state).toHaveCSS("font-size", "13px");
    await expect(state).toHaveCSS("color", "rgb(100, 110, 124)");
    await expect(card.getByRole("heading", { name: "오늘", exact: true })).toBeVisible();
    await expect(card.getByRole("heading", { name: "다음", exact: true })).toBeVisible();
    expect(await card.locator("li[data-makeup]").count()).toBeLessThanOrEqual(5);
    // 17:30: 17:00 보강이 진행 중
    await gotoReady(page, "/admin?at=17:30");
    const live = card.locator("li[data-makeup]").first().locator("[data-state]");
    await expect(live).toHaveText("진행 중");
    await expect(live).toHaveCSS("color", "rgb(27, 100, 218)");
  });

  test("학부모 메시지: 출결(결석·조퇴·지각) 먼저 → 기타, 묶음 이름, 태그 색, 시간 오른쪽 끝, '외 n건' 파란 링크", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const card = page.locator("section", { has: page.getByRole("heading", { name: /^읽지 않은 학부모 메시지/ }) });
    const rows = card.locator("li[data-message]");
    await expect(rows).toHaveCount(5);
    const tags = await rows.locator("[data-tag]").evaluateAll((els) => els.map((e) => e.getAttribute("data-tag")!));
    const firstOther = tags.findIndex((t) => t === "일정" || t === "문의");
    expect(firstOther).toBeGreaterThan(0);
    expect(tags.slice(firstOther).some((t) => ["결석", "조퇴", "지각"].includes(t))).toBe(false);
    await expect(card.locator("[data-group-label]")).toHaveText(["출결", "기타"]);
    // 태그 색: 결석 빨강 / 지각·조퇴 주황 / 일정 파랑 (글자는 대비 기준에 맞춘 짙은 같은 계열)
    await expect(rows.filter({ hasText: "쉬게" }).locator("[data-tag]")).toHaveText("결석");
    await expect(rows.filter({ hasText: "쉬게" }).locator("[data-tag]")).toHaveCSS("color", "rgb(217, 31, 47)");
    await expect(rows.filter({ hasText: "데리러" }).locator("[data-tag]")).toHaveText("조퇴");
    await expect(rows.filter({ hasText: "데리러" }).locator("[data-tag]")).toHaveCSS("background-color", "rgb(255, 244, 229)");
    await expect(card.locator('[data-tag="일정"]').first()).toHaveCSS("background-color", "rgb(232, 243, 255)");
    // 반 아바타: 반별 연한 색 (모두 같은 회색이 아니다)
    const avatarBgs = await rows.locator("[data-avatar]").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
    expect(new Set(avatarBgs).size).toBeGreaterThan(1);
    // 시간은 이름 줄 오른쪽 끝, 카드 안
    const cb = (await card.boundingBox())!;
    for (const t of await rows.locator("[data-time]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right))) expect(t).toBeLessThanOrEqual(cb.x + cb.width);
    for (const t of await rows.locator("[data-time]").allInnerTexts()) expect(t).toMatch(/^(오전|오후) \d{1,2}:\d{2}$|^어제$|^\d{1,2}\/\d{1,2}$/);
    // 외 n건: 파란 링크
    const more = card.getByRole("link", { name: /^외 \d+건 더 보기$/ });
    await expect(more).toHaveCSS("color", "rgb(27, 100, 218)");
    await expect(more).toHaveAttribute("href", "/admin/messages");
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
    await page.getByRole("heading", { level: 1 }).click();
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

  test("휴대폰: KPI 2×2, 보강·메시지 위아래(카드 안 여백 16px), 숫자 5칸 한 줄, 아래 탭 5개", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const tabs = page.getByRole("navigation", { name: "아래 메뉴" }).getByRole("link");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.first()).toHaveAttribute("aria-current", "page");
    // KPI 2×2
    const kb = await page.locator("li[data-check]").evaluateAll((ls) => ls.map((l) => l.getBoundingClientRect()).map((r) => [Math.round(r.y), Math.round(r.x)]));
    expect(kb[0][0]).toBe(kb[1][0]);
    expect(kb[2][0]).toBeGreaterThan(kb[0][0]);
    expect(kb[2][1]).toBe(kb[0][1]);
    // 보강 → 메시지 위아래, 카드 안 여백 16px
    const makeup = page.locator("section", { has: page.getByRole("heading", { name: "보강", exact: true }) });
    const msg = page.locator("section", { has: page.getByRole("heading", { name: /^읽지 않은 학부모 메시지/ }) });
    expect((await msg.boundingBox())!.y).toBeGreaterThan((await makeup.boundingBox())!.y + (await makeup.boundingBox())!.height - 1);
    await expect(makeup).toHaveCSS("padding-top", "16px");
    // 숫자 5칸: 한 줄, 같은 폭
    const st = await page.locator("li[data-stat]").evaluateAll((lis) => lis.map((li) => li.getBoundingClientRect()).map((r) => [Math.round(r.y), Math.round(r.width)]));
    expect(new Set(st.map((s) => s[0])).size).toBe(1);
    expect(new Set(st.map((s) => s[1])).size).toBe(1);
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
