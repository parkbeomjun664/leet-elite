import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// 숙제 등록·목록을 실제 dev DB에서 (HW-01~04, 10/14). 시험이 만든 숙제(제목 "e2e-")는 앞뒤로 서버 키로 지운다
// 비밀번호는 .env.local의 E2E_PASSWORD. 없으면 건너뛴다
test.use({ extraHTTPHeaders: {}, viewport: { width: 1280, height: 900 } });
test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_PASSWORD || !process.env.SUPABASE_SECRET_KEY, ".env.local에 E2E_PASSWORD·SUPABASE_SECRET_KEY가 없어서 건너뜀");

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const RUN = Date.now().toString(36);
// 반 소속 → 학생 (생성 타입이 한 줄인지 배열인지 확실치 않아 둘 다 받는다)
const isEnrolled = (s: unknown) => [s].flat().some((x) => (x as { status?: string } | null)?.status === "enrolled");

async function cleanup() {
  await admin().from("homework").delete().like("title", "e2e-%");
}
test.beforeAll(cleanup);
test.afterAll(cleanup);

async function loginAs(page: Page, id: string) {
  await page.goto("/login");
  await page.getByPlaceholder("휴대폰 번호 또는 아이디").fill(id);
  await page.getByPlaceholder("비밀번호").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

async function fillAndSubmit(page: Page, title: string, classIndex: number) {
  const chip = page.getByRole("group", { name: "반으로 고르기" }).getByRole("button").nth(classIndex);
  const n = Number((await chip.textContent())!.match(/(\d+)$/)![1]);
  await chip.click();
  await page.getByRole("textbox", { name: /^제목/ }).fill(title);
  await page.getByRole("button", { name: "숙제 내기" }).click();
  await expect(page.getByTestId("toast")).toContainText(`${n}명에게 냈어요`);
  return n;
}

test("원장님: 반 하나에 숙제 → DB에 숙제·대상 줄, 목록에 제출 0 / n명", async ({ page }) => {
  const title = `e2e-원장-${RUN}`;
  await loginAs(page, "admin");
  await page.goto("/admin/homework/new");
  const n = await fillAndSubmit(page, title, 1); // 전체 다음 첫 반
  await expect(page).toHaveURL(/\/admin\/homework$/);
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row.locator("[data-progress]")).toContainText(`0 / ${n}명`);

  const { data } = await admin().from("homework").select("kind, created_by, homework_targets ( student_id )").eq("title", title).single();
  expect(data!.kind).toBe("general");
  expect(data!.created_by).not.toBeNull();
  expect(data!.homework_targets).toHaveLength(n);
});

test("선생님: 담당 반만 고를 수 있고, 낸 숙제는 선생님 목록에. 다른 선생님 반 숙제는 안 보인다", async ({ page }) => {
  const title = `e2e-선생님-${RUN}`;
  await loginAs(page, "teacher");
  await page.goto("/teacher/homework/new");
  // 담당 반 알약 수 = DB에서 이 선생님(Jenny) 반 중 학생이 있는 반
  const chips = page.getByRole("group", { name: "반으로 고르기" }).getByRole("button");
  const { data: me } = await admin().from("profiles").select("id").eq("login_id", "teacher").single();
  const { data: t } = await admin().from("teachers").select("id").eq("profile_id", me!.id).single();
  const { data: myClasses } = await admin().from("classes").select("id, class_members ( left_on, students ( status ) )").eq("teacher_id", t!.id).eq("is_active", true);
  const withStudents = myClasses!.filter((c) => c.class_members.some((m) => m.left_on === null && isEnrolled(m.students))).length;
  await expect(chips).toHaveCount(withStudents + 1); // + 전체

  await fillAndSubmit(page, title, 1);
  await expect(page).toHaveURL(/\/teacher\/homework$/);
  await expect(page.getByRole("listitem").filter({ hasText: title })).toBeVisible();
  const { data } = await admin().from("homework").select("created_by").eq("title", title).single();
  expect(data!.created_by).toBe(me!.id);
});

test("원장님 목록에는 선생님이 낸 숙제도, 선생님 목록에는 담당 학생 숙제만", async ({ page }) => {
  // 원장님이 선생님 담당이 아닌 반에 숙제를 하나 더
  const other = `e2e-다른반-${RUN}`;
  const { data: me } = await admin().from("profiles").select("id").eq("login_id", "teacher").single();
  const { data: t } = await admin().from("teachers").select("id").eq("profile_id", me!.id).single();
  const { data: otherClass } = await admin()
    .from("classes")
    .select("id, class_members ( student_id, left_on, students ( status ) )")
    .neq("teacher_id", t!.id)
    .eq("is_active", true)
    .limit(5);
  const sid = otherClass!.flatMap((c) => c.class_members).find((m) => m.left_on === null && isEnrolled(m.students))!.student_id;
  const { data: hw } = await admin().from("homework").insert({ kind: "general", title: other }).select("id").single();
  await admin().from("homework_targets").insert({ homework_id: hw!.id, student_id: sid });

  await loginAs(page, "admin");
  await page.goto("/admin/homework");
  await expect(page.getByRole("listitem").filter({ hasText: `e2e-선생님-${RUN}` })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: other })).toBeVisible();

  await page.context().clearCookies();
  await loginAs(page, "teacher");
  await page.goto("/teacher/homework");
  await expect(page.getByRole("listitem").filter({ hasText: `e2e-선생님-${RUN}` })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: other })).toHaveCount(0);
});
