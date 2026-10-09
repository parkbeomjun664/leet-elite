import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { gotoReady } from "./ready";

// 접근성 자동 검사 (axe, WCAG 2.1 A·AA): 주요 화면에서 위반 0개 (10/6)
// 위반이 나오면 고치는 것이 원칙. 일부러 두는 것이 생기면 규칙 이름과 이유를 여기 적고 disableRules로 뺀다 (지금은 없음)
const PAGES = [
  ["선생님 홈", "/teacher?at=16:00"],
  ["선생님 출결 입력 창", "/teacher?at=16:00&student=s010&mode=attendance"],
  ["학생 홈", "/student?at=08:00"],
  ["학부모 홈", "/parent?at=16:00"],
  ["출결 키패드", "/kiosk"],
  ["원장님 홈", "/admin"],
  ["재원생 목록", "/admin/students"],
  ["학생 정보 수정 창", "/admin/students?edit=s010"],
  ["로그인", "/login"],
  ["개인정보 처리방침", "/privacy"],
  ["원장님 새 홈", "/admin/home-v2?at=16:00"],
  ["원장님 새 홈 처리할 일", "/admin/home-v2/todo?at=16:00"],
] as const;

async function violations(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal") // 개발 서버의 Next 표시
    .analyze();
  // 실패하면 무엇이 어디서 걸렸는지 바로 보이게
  return r.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
}

for (const width of [375, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const [name, path] of PAGES) {
      test(`${name}: 접근성 위반 0개`, async ({ page }) => {
        await gotoReady(page, path);
        await page.waitForTimeout(400); // 열림 움직임이 끝난 뒤
        expect(await violations(page)).toEqual([]);
      });
    }
  });
}

test.describe("휴대폰 학생 상세 화면", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("학생 상세 화면(목록 → 상세 전환): 접근성 위반 0개", async ({ page }) => {
    await gotoReady(page, "/teacher?at=16:00&student=s010");
    await page.waitForTimeout(400);
    expect(await violations(page)).toEqual([]);
  });
});
