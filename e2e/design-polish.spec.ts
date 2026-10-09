import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 10/5 디자인 다듬기: 24시간제 시간 고르기, 선생님 숫자 0은 회색, 키패드 휴대폰 세로
test("출결 입력: 시간은 24시간제 시·분 선택칸", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoReady(page, "/teacher?at=16:00&student=s010&mode=attendance");
  const hour = page.getByRole("combobox", { name: "등원 시각 시" });
  await expect(hour).toBeVisible();
  await expect(hour.locator("option")).toHaveCount(24);
  await expect(hour).toHaveValue(/^\d{2}$/);
  await expect(page.getByRole("combobox", { name: "등원 시각 분" }).locator("option")).toHaveCount(60);

  // 시를 바꾸면 분은 그대로
  const minuteBefore = await page.getByRole("combobox", { name: "등원 시각 분" }).inputValue();
  await hour.selectOption("15");
  await expect(hour).toHaveValue("15");
  await expect(page.getByRole("combobox", { name: "등원 시각 분" })).toHaveValue(minuteBefore);
});

test("선생님 홈 숫자 줄: 고른 칸만 검정 28px·버건디 밑줄, 나머지 회색 22px (10/9 저녁: 결석도 빨강 글씨 없이)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoReady(page, "/teacher?at=16:00");
  const group = page.getByRole("group", { name: "상태로 보기" });
  const read = () =>
    group.locator("button").evaluateAll((bs) =>
      bs.map((b) => {
        const n = b.querySelector("span span")!;
        const s = getComputedStyle(n);
        return { label: b.textContent?.replace(/[0-9]/g, "").trim(), pressed: b.getAttribute("aria-pressed"), n: Number(n.textContent), size: s.fontSize, color: s.color };
      }),
    );
  const ink = "rgb(26, 26, 26)";
  const sub = "rgb(106, 105, 102)";
  let cells = await read();
  for (const c of cells) {
    expect(c.size).toBe(c.pressed === "true" ? "28px" : "22px");
    expect(c.color).toBe(c.pressed === "true" ? ink : sub);
  }
  // 다른 칸을 고르면 그 칸이 커지고 검정
  await group.getByRole("button", { name: /등원/ }).first().click();
  cells = await read();
  const picked = cells.find((c) => c.pressed === "true")!;
  expect(picked.size).toBe("28px");
  // 결석 학생 칸은 결석 전용 분홍 바탕: 한 명을 [여러 명 선택] → [결석]으로 결석 처리해 본다 (화면에서만)
  await group.getByRole("button", { name: /오늘 수업/ }).click();
  await page.getByRole("button", { name: "여러 명 선택" }).click();
  const box = page.getByRole("checkbox", { name: / 선택$/ }).last();
  const name = (await box.getAttribute("aria-label"))!.replace(/ 선택$/, "");
  await box.check();
  await page.getByRole("button", { name: "결석 처리" }).click();
  const tile = page.locator("li").filter({ has: page.getByRole("button", { name: new RegExp(`^${name} `) }) });
  await expect(tile).toHaveCSS("background-color", "rgb(251, 236, 238)");
});

test("키패드 상단은 로고와 현재 시각만, 휴대폰 세로에서도 잘리지 않는다 (10/9 출결 앱 패턴)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kiosk");
  const header = page.locator("header");
  await expect(header.locator("p").first()).toHaveText("LEET영어학원");
  await expect(header.getByText(/^\d{2}:\d{2}$/)).toBeVisible(); // 현재 시각
  await expect(header.getByText(/년 .*월/)).toHaveCount(0); // 날짜 줄 없음
  // 버튼은 소리 켜고 끄기 아이콘 하나뿐 (글자 없음)
  await expect(header.getByRole("button")).toHaveCount(1);
  const box = await header.locator("p").first().evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(box.scroll).toBeLessThanOrEqual(box.client);
});

// 10/8 UI 2: 누름 반응 (버튼 0.97 + 어둡게, 카드·줄 0.99 + 옅은 회색), 움직임 줄이기면 크기 변화 없음
test.describe("누름 반응", () => {
  const pressed = async (page: import("@playwright/test").Page, selector: string) => {
    const el = page.locator(selector).first();
    const box = (await el.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250); // 150ms 전환이 끝난 뒤
    const style = await el.evaluate((e) => {
      const s = getComputedStyle(e);
      return { transform: s.transform, filter: s.filter, bg: s.backgroundColor };
    });
    await page.mouse.up({ button: "left" }).catch(() => {});
    return style;
  };

  test("버튼은 0.97로 작아지고 살짝 어두워진다, 표 줄은 0.99 + 옅은 회색", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoReady(page, "/admin/students");
    const btn = await pressed(page, 'main button:has-text("학생 등록")');
    expect(btn.transform).toBe("matrix(0.97, 0, 0, 0.97, 0, 0)");
    expect(btn.filter).toBe("brightness(0.95)");
    await page.keyboard.press("Escape");
    // 표 줄: 체크박스 칸이 아닌 이름 칸을 누른다
    const row = page.getByRole("row", { name: "조나윤 상세 보기" });
    await row.scrollIntoViewIfNeeded();
    const box = (await row.getByRole("cell").nth(1).boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const r = await row.evaluate((e) => ({ t: getComputedStyle(e).transform, bg: getComputedStyle(e).backgroundColor }));
    await page.mouse.up();
    expect(r.t).toBe("matrix(0.99, 0, 0, 0.99, 0, 0)");
    expect(r.bg).toBe("rgba(0, 0, 0, 0.04)");
  });

  test("움직임 줄이기 설정이면 크기는 그대로", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoReady(page, "/admin/students");
    const btn = await pressed(page, 'main button:has-text("학생 등록")');
    expect(btn.transform).toBe("none");
  });
});

test("선생님 홈 오른쪽 상세(1280): 따로 스크롤·스크롤바 자리·머리 고정, 사용 프로그램은 회색 테두리 칩 (10/8 UI 7 → 10/9 데스크 패턴)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/teacher?at=16:00");
  const panel = page.locator("aside");
  await expect(panel).toHaveCSS("overflow-y", "auto");
  await expect(panel).toHaveCSS("scrollbar-gutter", "stable");
  await expect(panel.locator("header")).toHaveCSS("position", "sticky");
  // 상세 안쪽에 따로 스크롤되는 칸이 없다 (이중 스크롤 없음)
  const inner = await panel.evaluate((p) =>
    [...p.querySelectorAll("*")]
      .filter((e) => !["TEXTAREA", "INPUT", "SELECT"].includes(e.tagName))
      .filter((e) => ["auto", "scroll"].includes(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight)
      .map((e) => e.tagName + "." + e.className),
  );
  expect(inner).toEqual([]);
  // 켜진 프로그램 칩: 흰 바탕 + 회색 테두리 (검정 꽉 찬 칩 아님)
  const chip = panel.getByRole("button", { name: "클래스카드" });
  if ((await chip.getAttribute("aria-pressed")) !== "true") await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(chip).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(chip).toHaveCSS("border-top-color", "rgb(228, 226, 222)");
});

test("준비 중 화면: 아이콘 40px, 본문 위에서 30% 지점, [홈으로] (10/8 UI 8)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/admin/makeups");
  const icon = page.locator("main svg").first();
  const box = (await icon.boundingBox())!;
  expect(Math.round(box.width)).toBe(40);
  // 본문 칸(상단 메뉴 65px 아래) 높이의 30% 근처에서 시작 (±24px)
  const target = 65 + (900 - 65) * 0.3;
  expect(Math.abs(box.y - target)).toBeLessThanOrEqual(24);
  await page.getByRole("main").getByRole("link", { name: "홈으로" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
