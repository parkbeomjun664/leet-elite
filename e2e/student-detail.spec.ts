import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 원장님 요청 1·2·3·3' (10/2): 선생님 화면 학생 상세, 원장님 홈 학생 이름
test.describe("선생님 화면 학생 상세", () => {
  test.use({ viewport: { width: 1440, height: 900 } }); // PC: 오른쪽 칸에 학생 상세가 고정으로 보인다

  test("수업 정보 2열 표, 최근 2주 출결 없음, 메시지 미니 창", async ({ page }) => {
    await gotoReady(page, "/teacher?at=16:00");
    const panel = page.locator("aside").filter({ hasText: "수업 정보" });
    await expect(panel).toBeVisible();

    // 1. 수업 정보: 2열 표 (반|수업 시간 / 출결 코드|사용 프로그램 / 보호자|메모)
    const grid = panel.locator("dl");
    await expect(grid.locator("dt")).toHaveText(["반", "수업 시간", "출결 코드", "사용 프로그램", "보호자", "메모"]);
    await expect(grid).toHaveCSS("grid-template-columns", /^\S+ \S+$/);

    // 2. 최근 2주 출결 구역은 없다
    await expect(panel.getByText("최근 2주 출결")).toHaveCount(0);

    // 3. 메시지 미니 창: 학생 대화방이 먼저, 최근 4개까지, 한 줄 입력
    const messageSection = panel.locator("section").filter({ has: page.getByRole("group", { name: "대화방 선택" }) });
    const rooms = messageSection.getByRole("group", { name: "대화방 선택" });
    await expect(rooms.getByRole("button", { name: /^학생/ })).toHaveAttribute("aria-pressed", "true");
    await expect(messageSection.getByRole("link", { name: "전체 보기" })).toHaveAttribute("href", "/teacher/messages");
    expect(await messageSection.locator("ul > li").count()).toBeLessThanOrEqual(4);

    await rooms.getByRole("button", { name: /^학부모/ }).click();
    await expect(rooms.getByRole("button", { name: /^학부모/ })).toHaveAttribute("aria-pressed", "true");
    expect(await messageSection.locator("ul > li").count()).toBeLessThanOrEqual(4);

    await messageSection.getByLabel("메시지 내용").fill("내일 단어 시험 있어요");
    await messageSection.getByRole("button", { name: "보내기" }).click();
    // 보내기를 누르면 바로 목록에 붙고(보내는 중), 저장이 끝나면 토스트 (10/5 낙관적 업데이트)
    await expect(messageSection.getByText("내일 단어 시험 있어요")).toBeVisible({ timeout: 200 });
    await expect(page.getByTestId("toast")).toContainText("메시지를 보냈어요");
    await expect(messageSection.getByText("보내는 중")).toHaveCount(0);
    await expect(messageSection.getByLabel("메시지 내용")).toHaveValue("");
  });
});

test("원장님 홈: 오늘 학원 숫자 줄과 확인할 일 (10/9 순서·크기·어제 대비)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoReady(page, "/admin?at=16:00");
  const todo = page.locator("section").filter({ has: page.getByRole("heading", { name: /^확인할 일/ }) });
  const items = todo.locator("ul > li");
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
  // 구역 라벨의 개수와 목록 줄 수가 같다
  await expect(todo.getByRole("heading", { name: `확인할 일 ${count}` })).toBeVisible();
  // 줄마다 처리하러 가는 링크
  await expect(items.first().getByRole("link")).toContainText("보기");
  // 오늘 학원 숫자 다섯 칸
  const stats = page.locator("section").filter({ has: page.getByRole("heading", { name: "오늘 학원" }) });
  await expect(stats.getByRole("listitem")).toHaveCount(5);
  // 바로가기는 자주 쓰는 4개만 (HOME-02 축소), 테두리 알약 높이 36 이상
  const shortcuts = page.getByRole("navigation", { name: "바로가기" }).getByRole("link");
  await expect(shortcuts).toHaveCount(4);
  expect((await shortcuts.first().boundingBox())!.height).toBeGreaterThanOrEqual(36);

  // 순서: 날짜 → 숫자 줄 → 확인할 일 → 바로가기 (10/9 요약 숫자 먼저)
  const y = async (l: import("@playwright/test").Locator) => (await l.boundingBox())!.y;
  const h1 = page.getByRole("heading", { level: 1 });
  expect(await y(h1)).toBeLessThan(await y(stats));
  expect(await y(stats)).toBeLessThan(await y(todo));
  expect(await y(todo)).toBeLessThan(await y(shortcuts.first()));
  // 크기: 날짜 18, 오늘 숫자·확인할 일 숫자 모두 28
  await expect(h1).toHaveCSS("font-size", "18px");
  await expect(items.first().locator("span").first()).toHaveCSS("font-size", "28px");
  await expect(stats.locator("li a > span > span").first()).toHaveCSS("font-size", "28px");
  // 어제와 비교: 시험 날짜 10/5(월)의 어제는 일요일(수업 없음)이라 보여 주지 않는다 (규칙은 src/lib/diff-label.test.ts)
  await expect(stats.getByText(/^어제/)).toHaveCount(0);
});

test("원장님 홈: 학생 이름은 굵고 검게", async ({ page }) => {
  await gotoReady(page, "/admin?at=16:00");
  const name = page.locator("span.font-bold.text-ink").first();
  await expect(name).toBeVisible();
  await expect(name).toHaveCSS("font-weight", "700");
  await expect(name).toHaveCSS("color", "rgb(26, 26, 26)"); // ink #1A1A1A
});
