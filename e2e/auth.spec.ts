import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// 로그인 흐름 (AUTH-01·03·06·07·09·10). 출입 통제를 건너뛰는 머리글 없이, dev Supabase에 실제로 로그인한다
// 시험 계정: scripts/seed-dev.mts (비밀번호는 .env.local의 E2E_PASSWORD, 없으면 계정이 필요한 테스트는 건너뜀)
test.use({ extraHTTPHeaders: {}, viewport: { width: 1280, height: 900 } });
test.describe.configure({ mode: "serial" });

const PASSWORD = process.env.E2E_PASSWORD;
const LOGIN_ERROR = "아이디 또는 비밀번호가 올바르지 않습니다.";

async function login(page: Page, id: string, pw: string, opts?: { keep?: boolean }) {
  await page.getByPlaceholder("휴대폰 번호 또는 아이디").fill(id);
  await page.getByPlaceholder("비밀번호").fill(pw);
  if (opts?.keep) await page.getByLabel("로그인 상태 유지").check();
  await page.getByRole("button", { name: "로그인" }).click();
}

// 이 테스트가 남긴 틀린 횟수 기록을 지운다 (같은 컴퓨터 IP가 10분 동안 막히지 않게)
test.afterAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  const admin = createClient(url, key, { auth: { persistSession: false } });
  await admin.from("login_attempts").delete().or("login_id.like.e2e-%,login_id.like.ip:%");
});

test("로그인 안 하면 로그인 화면으로, 보던 주소는 기억", async ({ page }) => {
  await page.goto("/teacher?at=16:00");
  await expect(page).toHaveURL(/\/login\?next=%2Fteacher%3Fat%3D16/);
  await page.goto("/admin/students");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fstudents/);
});

test("개인정보 처리방침은 로그인 없이, 로그인 화면 아래 링크로 열린다 (NF-10)", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "개인정보 처리방침" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "개인정보 처리방침" })).toBeVisible();
});

test("틀리면 문구 하나, 아이디는 남고 비밀번호는 비움", async ({ page }) => {
  await page.goto("/login");
  await login(page, "e2e-nobody", "wrong-pass");
  await expect(page.getByText(LOGIN_ERROR)).toBeVisible();
  await expect(page.getByPlaceholder("휴대폰 번호 또는 아이디")).toHaveValue("e2e-nobody");
  await expect(page.getByPlaceholder("비밀번호")).toHaveValue("");
});

test("같은 아이디 5번 틀리면 잠금 안내 (AUTH-10)", async ({ page }) => {
  const id = `e2e-lock-${Date.now()}`;
  await page.goto("/login");
  for (let i = 1; i <= 5; i++) {
    await login(page, id, `wrong-${i}`);
    await expect(page.getByText(LOGIN_ERROR)).toBeVisible();
  }
  await expect(page.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();
});

test.describe("시험 계정", () => {
  test.skip(!PASSWORD, ".env.local에 E2E_PASSWORD가 없어서 건너뜀");

  for (const [id, home] of [
    ["admin", "/admin"],
    ["teacher", "/teacher"],
    ["student", "/student"],
    ["parent", "/parent"],
    ["kiosk", "/kiosk"],
  ] as const) {
    test(`${id}: 로그인하면 ${home}`, async ({ page }) => {
      await page.goto("/login");
      await login(page, id, PASSWORD!);
      await expect(page).toHaveURL(new RegExp(`${home}$`));
    });
  }

  test("역할에 안 맞는 화면은 자기 첫 화면으로, 로그아웃하면 다시 막힘", async ({ page }) => {
    await page.goto("/login");
    await login(page, "teacher", PASSWORD!);
    await expect(page).toHaveURL(/\/teacher$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/teacher$/);
    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("로그인 전에 열려던 화면으로 돌아간다", async ({ page }) => {
    await page.goto("/teacher?at=16:00");
    await login(page, "teacher", PASSWORD!);
    await expect(page).toHaveURL(/\/teacher\?at=16(%3A|:)00$/);
  });

  test("로그인 상태 유지: 안 하면 브라우저를 닫으면 사라지는 쿠키, 하면 30일 (AUTH-06)", async ({ page, context }) => {
    const authCookies = async () => (await context.cookies()).filter((c) => c.name.startsWith("sb-"));
    await page.goto("/login");
    await login(page, "student", PASSWORD!);
    await expect(page).toHaveURL(/\/student$/);
    for (const c of await authCookies()) expect(c.expires).toBe(-1);

    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page, "student", PASSWORD!, { keep: true });
    await expect(page).toHaveURL(/\/student$/);
    const days = (c: { expires: number }) => (c.expires - Date.now() / 1000) / 86400;
    const cookies = await authCookies();
    expect(cookies.length).toBeGreaterThan(0);
    for (const c of cookies) expect(days(c)).toBeGreaterThan(29);
  });

  test("첫 로그인: 비밀번호를 바꾸기 전에는 다른 화면에 못 감 (AUTH-03)", async ({ page }) => {
    await page.goto("/login");
    await login(page, "newbie", PASSWORD!);
    await expect(page).toHaveURL(/\/account\/password/);
    await page.goto("/student");
    await expect(page).toHaveURL(/\/account\/password$/);
    // 규칙에 맞지 않으면 안내 (실제로 바꾸지는 않는다: 다음 실행에도 같은 계정을 쓰도록)
    await page.getByLabel(/새 비밀번호/).fill("abc");
    await page.getByLabel("한 번 더").fill("abc");
    await page.getByRole("button", { name: "비밀번호 바꾸기" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "6자 이상" })).toBeVisible();
    await page.getByLabel(/새 비밀번호/).fill("abcdef12");
    await page.getByLabel("한 번 더").fill("abcdef13");
    await page.getByRole("button", { name: "비밀번호 바꾸기" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "두 칸의 비밀번호가 달라요" })).toBeVisible();
  });
});
