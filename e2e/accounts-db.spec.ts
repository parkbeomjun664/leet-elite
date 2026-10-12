import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Page } from "@playwright/test";

// 계정 발급을 실제 dev DB에서 (STU-08, AUTH-01~03, 10/13)
// 원장님이 발급 → 그 아이디·임시 비밀번호로 로그인 → 비밀번호 변경 강제 → 바꾸면 자기 첫 화면
// 시험이 만든 계정·선생님은 끝나면 서버 키로 지운다 (학생 줄은 그대로, 계정 연결만 풀림)
// 비밀번호는 .env.local의 E2E_PASSWORD. 없으면 건너뛴다
test.use({ extraHTTPHeaders: {}, viewport: { width: 1280, height: 900 } });
test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_PASSWORD || !process.env.SUPABASE_SECRET_KEY, ".env.local에 E2E_PASSWORD·SUPABASE_SECRET_KEY가 없어서 건너뜀");

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

// 이번 실행에서 만든 아이디 (모두 e2e- 로 시작 → 남았으면 다음 실행 정리에서도 지운다)
const RUN = Date.now().toString(36);
const createdTeacherIds: string[] = [];

async function cleanup() {
  const db = admin();
  const { data } = await db.from("profiles").select("id").like("login_id", "e2e-%");
  for (const p of data ?? []) await db.auth.admin.deleteUser(p.id);
  if (createdTeacherIds.length) await db.from("teachers").delete().in("id", createdTeacherIds);
  await db.from("teachers").delete().like("real_name", "시험선생%");
  await db.from("login_attempts").delete().like("login_id", "e2e-%");
}
test.beforeAll(cleanup);
test.afterAll(cleanup);

/** 계정이 없는 시드 재원생 하나 (시드 학생 id는 30000000-로 시작, scripts/seed-dev.mts) */
async function seedStudentWithoutAccount() {
  const { data } = await admin().from("students").select("id, name").eq("status", "enrolled").is("profile_id", null).order("name");
  const hit = data?.find((s) => s.id.startsWith("30000000-"));
  expect(hit, "계정 없는 시드 재원생").toBeDefined();
  return hit!;
}

async function loginAs(page: Page, id: string, pw: string) {
  await page.goto("/login");
  await page.getByPlaceholder("휴대폰 번호 또는 아이디").fill(id);
  await page.getByPlaceholder("비밀번호").fill(pw);
  await page.getByRole("button", { name: "로그인" }).click();
  // 로그인 쿠키가 생기고 화면이 넘어간 뒤에 다음 주소로 (기다리지 않으면 로그인 전 요청이 되어 로그인 화면으로 돌아온다)
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** 새 창(쿠키 따로)에서 발급받은 계정으로 첫 로그인 → 비밀번호 바꾸기 → 도착한 화면 */
async function firstLogin(browser: Browser, id: string, temp: string) {
  const ctx = await browser.newContext({ baseURL: "http://localhost:3200", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await loginAs(page, id, temp);
  await expect(page).toHaveURL(/\/account\/password/);
  const next = `${temp}x9`;
  await page.getByLabel(/새 비밀번호/).fill(next);
  await page.getByLabel("한 번 더").fill(next);
  await page.getByRole("button", { name: "비밀번호 바꾸기" }).click();
  return { ctx, page };
}

test("원장님: 학생 계정 발급 → 학생이 임시 비밀번호로 첫 로그인 → 비밀번호를 바꾸면 자기 화면", async ({ page, browser }) => {
  const student = await seedStudentWithoutAccount();
  const loginId = `e2e-s-${RUN}`;

  await loginAs(page, "admin", process.env.E2E_PASSWORD!);
  await page.goto(`/admin/students?edit=${student!.id}`);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("로그인 아이디").fill(loginId);
  await dialog.getByRole("button", { name: "계정 발급" }).click();
  await expect(dialog.getByTestId("issued-login-id")).toHaveText(loginId);
  const temp = (await dialog.getByTestId("issued-temp-password").textContent())!.trim();
  expect(temp).toMatch(/^[a-z2-9]{8}$/);

  // DB: 계정 줄·학생 연결·첫 로그인 표시
  const { data: profile } = await admin().from("profiles").select("id, role, must_change_password, display_name").eq("login_id", loginId).single();
  expect(profile).toMatchObject({ role: "student", must_change_password: true, display_name: student!.name });
  const { data: linked } = await admin().from("students").select("profile_id").eq("id", student!.id).single();
  expect(linked!.profile_id).toBe(profile!.id);

  // 새로고침해도 아이디가 보이고, 같은 학생에 또 발급할 수 없다
  await page.reload();
  await expect(page.getByRole("dialog")).toContainText(loginId);
  await expect(page.getByRole("dialog").getByRole("button", { name: "계정 발급" })).toHaveCount(0);

  // 학생 첫 로그인 → 비밀번호 변경 → 학생 첫 화면에 자기 이름
  const { ctx, page: sp } = await firstLogin(browser, loginId, temp);
  await expect(sp).toHaveURL(/\/student$/);
  await expect(sp.getByRole("banner")).toContainText(student!.name);
  await ctx.close();
});

test("이미 쓰는 아이디는 발급하지 않는다 (계정도 만들지 않음)", async ({ page }) => {
  const student = await seedStudentWithoutAccount();
  await loginAs(page, "admin", process.env.E2E_PASSWORD!);
  await page.goto(`/admin/students?edit=${student!.id}`);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("로그인 아이디").fill("teacher"); // 시험 선생님 계정의 아이디
  await dialog.getByRole("button", { name: "계정 발급" }).click();
  await expect(dialog.getByText("teacher는 이미 쓰는 아이디예요")).toBeVisible();
  const { data: still } = await admin().from("students").select("profile_id").eq("id", student!.id).single();
  expect(still!.profile_id).toBeNull();
});

test("원장님: 선생님 추가 → 계정 발급 → 선생님 첫 로그인은 선생님 화면으로", async ({ page, browser }) => {
  const name = `시험선생${RUN}`;
  const loginId = `e2e-t-${RUN}`;
  await loginAs(page, "admin", process.env.E2E_PASSWORD!);
  await page.goto("/admin/teachers");
  await page.getByRole("button", { name: "선생님 추가" }).click();
  const form = page.getByRole("dialog", { name: "선생님 추가" });
  await form.getByLabel("이름").fill(name);
  await form.getByLabel("호칭").fill("Tester");
  await form.getByRole("button", { name: "추가" }).click();

  const dialog = page.getByRole("dialog", { name: `${name} 선생님` });
  await dialog.getByLabel("로그인 아이디").fill(loginId);
  await dialog.getByRole("button", { name: "계정 발급" }).click();
  const temp = (await dialog.getByTestId("issued-temp-password").textContent())!.trim();

  const { data: t } = await admin().from("teachers").select("id, profiles ( role, login_id )").eq("real_name", name).single();
  createdTeacherIds.push(t!.id);
  expect(t!.profiles).toMatchObject({ role: "teacher", login_id: loginId });

  const { ctx, page: tp } = await firstLogin(browser, loginId, temp);
  await expect(tp).toHaveURL(/\/teacher$/);
  await ctx.close();
});

test("선생님 계정은 선생님 화면(/admin/teachers)에 못 들어간다", async ({ page }) => {
  await loginAs(page, "teacher", process.env.E2E_PASSWORD!);
  await expect(page).toHaveURL(/\/teacher$/);
  await page.goto("/admin/teachers");
  await expect(page).toHaveURL(/\/teacher$/);
});
