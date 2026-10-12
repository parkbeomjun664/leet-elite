import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 원장님 홈 (10/9 v2 → 10/12 v4 토스 스타일): 사이드바 · 요약(상태별 히어로) · 오늘 시간표 · 처리할 일
// 시험 날짜는 2026-10-05(월) 고정, 시각은 ?at=16:00
test.describe("원장님 홈 PC", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("토스 스타일 카드·요약 위계·시간순 반 블록·지금 선", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const side = page.getByRole("navigation", { name: "주 메뉴" });
    await expect(side.getByRole("link")).toHaveCount(7);
    await expect(side.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");

    // 회색 바탕 #F2F4F6 + 흰 카드(모서리 20, 안 여백 24, 그림자 없음), 카드 사이 16
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("[data-collapsed]")!).backgroundColor)).toBe("rgb(242, 244, 246)");
    const summary = page.locator("header[data-phase]");
    const card = page.locator("section", { has: page.getByRole("heading", { name: "오늘 시간표" }) });
    for (const c of [summary, card]) {
      await expect(c).toHaveCSS("border-radius", "20px");
      await expect(c).toHaveCSS("box-shadow", "none");
      await expect(c).toHaveCSS("padding-top", "24px");
    }
    expect(Math.round((await card.boundingBox())!.y - ((await summary.boundingBox())!.y + (await summary.boundingBox())!.height))).toBe(16);

    // 요약 위계: 날짜 15px 600 본문색 → 히어로 32px 700 진한 검정 → 범례 → 상태 문장 14px
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "15px");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("color", "rgb(78, 89, 104)");
    const hero = summary.locator("[data-hero]");
    await expect(hero).toHaveText(/^등원 \d+\/\d+$/);
    await expect(hero).toHaveCSS("font-size", "32px");
    await expect(hero).toHaveCSS("font-weight", "700");
    await expect(hero).toHaveCSS("color", "rgb(25, 31, 40)");
    await expect(summary.locator("[data-status]")).toHaveCSS("font-size", "14px");
    await expect(summary.locator("[data-asof]")).toHaveText("16:00 기준");
    await expect(summary.locator("[data-asof]")).toHaveCSS("font-size", "12px");
    // 오른쪽 숫자 3개 (20px 700)
    await expect(summary.locator("[data-stat]")).toHaveCount(3);
    await expect(summary.locator('[data-stat="오늘 수업"]')).toHaveCSS("font-size", "20px");
    // 화면 읽기 프로그램용 한 문장
    await expect(page.locator("p[aria-live]")).toHaveText(/^등원 \d+\/\d+\. .+ 수업 중$/);

    // 시간표: 시간순, 반 블록 바탕 #F9FAFB 모서리 12, 진행 중 블록은 #F2F7FF + "진행 중"
    const timeline = page.getByRole("list", { name: "오늘 시간표" });
    const starts = await timeline.locator("[data-start]").evaluateAll((els) => els.map((e) => e.getAttribute("data-start")!));
    expect(starts.length).toBeGreaterThan(0);
    expect(starts).toEqual([...starts].sort());
    const live = timeline.locator('a[data-state="수업 중"]').first();
    await expect(live).toHaveCSS("background-color", "rgb(242, 247, 255)");
    await expect(live).toHaveCSS("border-radius", "12px");
    await expect(live.locator("[data-status-label]")).toHaveText("진행 중");
    const upcoming = timeline.locator('a[data-state="예정"]').first();
    await expect(upcoming).toHaveCSS("background-color", "rgb(249, 250, 251)");
    await expect(upcoming.locator("[data-status-label]")).toHaveText(/^\d+(분|시간) 후$/);
    await expect(timeline).not.toContainText("예정");
    // 반 색 점 8px, 보강은 바탕 없는 작은 줄
    await expect(live.locator("[data-class-dot]")).toHaveCSS("width", "8px");
    const makeup = timeline.locator("[data-makeup]").first();
    await expect(makeup).toHaveText(/^\d{2}:\d{2}–\d{2}:\d{2}보강 · /);
    await expect(makeup).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    // 지금 시각 선은 시작한 블록과 아직인 블록 사이
    const nowLine = timeline.getByRole("listitem", { name: "지금 16:00" });
    await expect(nowLine).toBeVisible();
    const order = await timeline.locator("> li").evaluateAll((lis) => lis.map((li) => li.getAttribute("aria-label") ?? li.querySelector("a")?.getAttribute("data-state") ?? "보강"));
    const at = order.indexOf("지금 16:00");
    expect(order.slice(0, at).every((x) => x !== "예정")).toBe(true);
    expect(order.slice(at + 1).filter((x) => x !== "보강").every((x) => x === "예정")).toBe(true);
  });

  test("히어로 3상태: 첫 수업 전 → 수업 중 → 모든 수업 끝", async ({ page }) => {
    const summary = page.locator("header[data-phase]");
    // 첫 수업 전 (10:42): 첫 수업까지 남은 시간 + 첫 반 · 선생님 · 인원, 진행 막대 없음
    await gotoReady(page, "/admin?at=10:42");
    await expect(summary).toHaveAttribute("data-phase", "before");
    await expect(summary.locator("[data-hero]")).toHaveText("첫 수업까지 3시간 48분");
    await expect(summary.locator("[data-hero-sub]")).toHaveText(/^14:30 OB-초중 · Jenny · \d+명$/);
    await expect(summary.locator("[data-day-progress]")).toHaveCount(0);
    await expect(summary.locator("[data-status] span[aria-hidden]")).toHaveCount(0); // 파랑 점은 수업 중에만
    // 수업 중 (16:00): 등원 n/전체, 파랑 점 + "OB-초중 · OB-초고 수업 중", 진행 막대(등원만)
    await gotoReady(page, "/admin?at=16:00");
    await expect(summary).toHaveAttribute("data-phase", "during");
    await expect(summary.locator("[data-hero]")).toHaveText(/^등원 \d+\/\d+$/);
    await expect(summary.locator("[data-status]")).toHaveText(/OB-초중 · OB-초고 수업 중$/);
    await expect(summary.locator("[data-status] span[aria-hidden]")).toHaveClass(/bg-live/);
    await expect(summary.locator("[data-day-progress] [data-arrival-fill]")).toHaveClass(/bg-arrive/);
    // 모든 수업 끝 (22:30): "오늘 수업 끝" + 등원·결석
    await gotoReady(page, "/admin?at=22:30");
    await expect(summary).toHaveAttribute("data-phase", "after");
    await expect(summary.locator("[data-hero]")).toHaveText("오늘 수업 끝");
    await expect(summary.locator("[data-hero-sub]")).toHaveText(/^등원 \d+\/\d+ · 결석 \d+$/);
    await expect(summary.locator("[data-day-progress]")).toHaveCount(0);
  });

  test("범례: 등원·미등원·결석·수업 전, 네 숫자의 합 = 오늘 수업 학생 수", async ({ page }) => {
    for (const at of ["10:42", "16:00", "22:30"]) {
      await gotoReady(page, `/admin?at=${at}`);
      const legend = page.locator("[data-legend]");
      const items = await legend.locator("li").allInnerTexts();
      expect(items.map((t) => t.replace(/\s*\d+$/, "").trim())).toEqual(["등원", "미등원", "결석", "수업 전"]);
      const sum = (await legend.locator("[data-n]").allInnerTexts()).reduce((n, t) => n + Number(t), 0);
      const students = Number((await page.locator('[data-stat="학생"]').innerText()).match(/\d+/)![0]);
      expect(sum).toBe(students);
    }
  });

  test("반 진행 막대는 수업 시작 10분 전부터 (중등 17:00 반: 16:49 없음 → 16:50 있음)", async ({ page }) => {
    const row = () => page.getByRole("list", { name: "오늘 시간표" }).locator("a", { hasText: "중등(브릿지)" });
    await gotoReady(page, "/admin?at=16:49");
    await expect(row().locator("[data-progress]")).toHaveCount(0);
    await gotoReady(page, "/admin?at=16:50");
    await expect(row().locator("[data-progress]")).toBeVisible();
    await expect(row().locator("[data-progress] [data-arrival-fill]")).toHaveClass(/bg-arrive/);
    await expect(row().locator("[data-progress] > span")).toHaveCSS("height", "4px");
  });

  test("처리할 일: 반 색 아바타·이름 · 관계·용건 태그·시간, 오늘 영향 → 읽지 않음 → 최신순, 태그 바꾸기", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const panel = page.locator("section").filter({ has: page.getByRole("heading", { name: /^처리할 일/ }) });
    const msgs = panel.locator('li[data-todo="message"]');
    // 아바타 40px: 반 약칭, 반 색 연한 톤
    const avatar = msgs.first().locator("[data-avatar]");
    await expect(avatar).toHaveCSS("width", "40px");
    await expect(avatar).toHaveText(/^(초저|초중|초고|브릿지|코어|마스터|포커스)$/);
    // 같은 반은 시간표 점과 같은 색
    const classOfAvatar = await panel.locator("li[data-todo]").first().locator("[data-avatar]").getAttribute("class");
    expect(classOfAvatar).toMatch(/bg-class-\d-bg/);
    // 첫 줄 "이름 · 관계" + 태그, 시간 표시 (오늘 오전/오후 h:mm · 어제 · M/D)
    await expect(msgs.first()).toContainText(/· (어머님|아버님)/);
    for (const t of await msgs.locator("[data-todo-time]").allInnerTexts()) expect(t).toMatch(/^(오전|오후) \d{1,2}:\d{2}$|^어제$|^\d{1,2}\/\d{1,2}$/);
    // 정렬: 오늘 수업에 영향(결석·조퇴·지각) 메시지가 일정·문의보다 먼저
    const tags = await msgs.getByRole("button", { name: /^용건 / }).evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label")!.replace(/^용건 (\S+).*/, "$1")));
    const firstOther = tags.findIndex((t) => t === "일정" || t === "문의");
    expect(firstOther).toBeGreaterThan(0);
    expect(tags.slice(firstOther).some((t) => ["결석", "조퇴", "지각"].includes(t))).toBe(false);
    // 자동 분류: "감기 … 쉬게" → 결석, "데리러" → 조퇴, "늦을" → 지각, "특강 일정" → 일정
    await expect(msgs.filter({ hasText: "쉬게" }).getByRole("button", { name: /^용건 결석/ })).toBeVisible();
    await expect(msgs.filter({ hasText: "데리러" }).getByRole("button", { name: /^용건 조퇴/ })).toBeVisible();
    // 태그 바꾸기: 일정 → 문의
    const sched = msgs.filter({ hasText: "특강" });
    await sched.getByRole("button", { name: /^용건 일정/ }).click();
    await page.getByRole("menuitemradio", { name: "문의" }).click();
    await expect(sched.getByRole("button", { name: /^용건 문의/ })).toBeVisible();
    await expect(page.getByTestId("toast")).toContainText('"문의"');
    // 답장 버튼: 연회색 바탕 + 진한 글씨, 32px, 모서리 8
    const reply = msgs.first().getByRole("button", { name: "답장" });
    await expect(reply).toHaveCSS("height", "32px");
    await expect(reply).toHaveCSS("border-radius", "8px");
    await expect(reply).toHaveCSS("background-color", "rgb(242, 244, 246)");
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
    const hw = panel.locator('li[data-todo="homework"]');
    const countOf = async () => Number((await panel.getByRole("heading").innerText()).match(/\d+/)![0]);
    // 14:00: 오늘 가장 이른 반(14:30 시작)도 아직 → 숙제 줄 없음
    await gotoReady(page, "/admin?at=14:00");
    await expect(hw).toHaveCount(0);
    const before = await countOf();
    // 16:00: 14:30·15:30 시작 반은 지났고, 17:00 이후 반은 아직
    await gotoReady(page, "/admin?at=16:00");
    const titles = await hw.locator("[data-todo-title]").allInnerTexts();
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
    await first.getByRole("button", { name: "답장" }).click();
    await expect(panel.getByText(title, { exact: true })).toHaveCount(0);
    await expect(panel.getByRole("heading")).not.toHaveText(before);
    await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "success");

    // 실패 흉내: 다시 나타나고 실패 안내
    await page.evaluate(() => (window.__leetFailSave = true));
    const next = panel.locator("ul > li").filter({ has: page.getByRole("button", { name: "답장" }) }).first();
    const title2 = (await next.locator("[data-todo-title]").innerText()).trim();
    await next.getByRole("button", { name: "답장" }).click();
    await expect(page.getByTestId("toast")).toHaveAttribute("data-kind", "error");
    await expect(panel.getByText(title2, { exact: true })).toBeVisible();
  });
});

test.describe("원장님 홈 휴대폰 375", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("요약 → 처리할 일 한 줄 → 시간표 카드가 한 줄로 쌓이고, 반 블록은 시간·상태 / 반 / 인원·늦게 오는 학생", async ({ page }) => {
    await gotoReady(page, "/admin?at=16:00");
    const tabs = page.getByRole("navigation", { name: "아래 메뉴" }).getByRole("link");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.first()).toHaveAttribute("aria-current", "page");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // 흰 카드가 한 줄로 쌓인다: 왼쪽 끝과 폭이 같고, 위에서 아래로
    const boxes = await Promise.all(
      [page.locator("header[data-phase]"), page.getByRole("link", { name: /^처리할 일/ }), page.locator("section", { has: page.getByRole("heading", { name: "오늘 시간표" }) })].map(
        async (l) => (await l.boundingBox())!,
      ),
    );
    for (const b of boxes) {
      expect(Math.round(b.x)).toBe(16);
      expect(Math.round(b.width)).toBe(375 - 32);
    }
    expect(boxes[0].y).toBeLessThan(boxes[1].y);
    expect(boxes[1].y).toBeLessThan(boxes[2].y);
    // 반 블록 쌓기: 시간과 상태가 같은 줄, 반 이름은 그 아래, 인원은 또 그 아래
    const row = page.getByRole("list", { name: "오늘 시간표" }).locator('a[data-state="수업 중"]').first();
    const y = async (sel: string) => (await row.locator(sel).first().boundingBox())!.y;
    expect(Math.abs((await y("[data-start]")) - (await y("[data-status-label]")))).toBeLessThan(4);
    expect(await y("[data-class-dot]")).toBeGreaterThan(await y("[data-start]"));
    // 시간은 한 줄
    expect((await row.locator("[data-start]").boundingBox())!.height).toBeLessThan(30);
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
