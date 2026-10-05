import { expect, test } from "@playwright/test";

// 원장님 요청 1·2·3·3' (10/2): 선생님 화면 학생 상세, 원장님 홈 학생 이름
test.describe("선생님 화면 학생 상세", () => {
  test.use({ viewport: { width: 1440, height: 900 } }); // PC: 오른쪽 칸에 학생 상세가 고정으로 보인다

  test("수업 정보 2열 표, 최근 2주 출결 없음, 메시지 미니 창", async ({ page }) => {
    await page.goto("/teacher?at=16:00");
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
    await expect(messageSection.getByText("보냈습니다.")).toBeVisible();
    await expect(messageSection.getByLabel("메시지 내용")).toHaveValue("");
  });
});

test("원장님 홈: 학생 이름은 굵고 검게", async ({ page }) => {
  await page.goto("/admin?at=16:00");
  const name = page.locator("span.font-bold.text-ink").first();
  await expect(name).toBeVisible();
  await expect(name).toHaveCSS("font-weight", "700");
  await expect(name).toHaveCSS("color", "rgb(26, 26, 26)"); // ink #1A1A1A
});
