import { expect, test } from "@playwright/test";
import { gotoReady } from "./ready";

// 계정 발급 화면 (STU-08, AUTH-02·03, 10/13). 가상 데이터 시험 모드: 서버는 DB에 만들지 않고 성공만 돌려준다
// 실제 dev DB에 발급하고 그 계정으로 로그인하는 흐름은 accounts-db.spec.ts
test.use({ viewport: { width: 1280, height: 900 } });

const TEMP_PASSWORD = /^[a-hjkmnp-z2-9]{8}$/;

test("학생 수정 창: 아이디를 정해 발급하면 임시 비밀번호를 한 번 보여 주고, 다시 열면 아이디만", async ({ page }) => {
  await gotoReady(page, "/admin/students");
  await page.getByRole("row", { name: "조나윤 상세 보기" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "로그인 계정" })).toBeVisible();

  // 조나윤은 휴대폰이 없어 아이디 칸이 비어 있다 → 그대로 누르면 안내
  const idInput = dialog.getByLabel("로그인 아이디");
  await expect(idInput).toHaveValue("");
  await dialog.getByRole("button", { name: "계정 발급" }).click();
  await expect(dialog.getByText("아이디를 입력해 주세요")).toBeVisible();

  // 쓸 수 없는 글자는 서버가 막는다
  await idInput.fill("조나윤");
  await dialog.getByRole("button", { name: "계정 발급" }).click();
  await expect(dialog.getByText(/영문 소문자·숫자로 2~40자/)).toBeVisible();

  // Enter도 발급 (바깥 [저장]이 눌리지 않는다)
  await idInput.fill("Jo.Nayun");
  await idInput.press("Enter");
  await expect(dialog.getByTestId("issued-login-id")).toHaveText("jo.nayun");
  await expect(dialog.getByTestId("issued-temp-password")).toHaveText(TEMP_PASSWORD);
  await expect(dialog.getByText("이 창을 닫으면 임시 비밀번호를 다시 볼 수 없어요")).toBeVisible();
  await expect(page.getByTestId("toast")).toContainText("계정을 발급했어요");

  // 닫고 다시 열면 비밀번호는 없고 아이디·상태만
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("row", { name: "조나윤 상세 보기" }).click();
  await expect(page.getByRole("dialog").getByTestId("issued-temp-password")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("jo.nayun");
  await expect(page.getByRole("dialog")).toContainText("사용 중");
  await expect(page.getByRole("dialog").getByRole("button", { name: "비밀번호 재설정" })).toBeVisible();
});

test("아이디 기본값: 학생 휴대폰 번호(숫자만). 형제가 같은 번호면 비워 두고 따로 정하라고 안내", async ({ page }) => {
  await gotoReady(page, "/admin/students");
  await page.getByRole("row", { name: "조민재 상세 보기" }).click();
  await expect(page.getByRole("dialog").getByLabel("로그인 아이디")).toHaveValue("01055501001");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // 표승현·표준현 형제는 같은 번호
  await page.getByRole("row", { name: "표승현 상세 보기" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("로그인 아이디")).toHaveValue("");
  await expect(dialog).toContainText("표준현 학생과 같은 번호예요. 아이디를 따로 정해 주세요");
});

test("선생님 화면: 목록 → 줄을 눌러 계정 발급", async ({ page }) => {
  await gotoReady(page, "/admin/teachers");
  await expect(page.getByRole("heading", { name: "선생님", level: 1 })).toBeVisible();
  const list = page.getByRole("list", { name: "선생님" });
  await expect(list.getByRole("listitem")).toHaveCount(4);
  await expect(list).toContainText("계정 미발급");

  await list.getByRole("button", { name: "김지현 계정 보기" }).click();
  const dialog = page.getByRole("dialog", { name: "김지현 선생님" });
  await dialog.getByLabel("로그인 아이디").fill("010-5550-9001");
  await dialog.getByRole("button", { name: "계정 발급" }).click();
  await expect(dialog.getByTestId("issued-login-id")).toHaveText("01055509001");
  await expect(dialog.getByTestId("issued-temp-password")).toHaveText(TEMP_PASSWORD);
  await page.keyboard.press("Escape");
  await expect(list.getByRole("button", { name: "김지현 계정 보기" })).toContainText("01055509001");
  await expect(page.getByText("4명 · 계정 발급 1명")).toBeVisible();
});

test("선생님 추가: 이름·호칭을 넣으면 바로 계정 발급 창으로", async ({ page }) => {
  await gotoReady(page, "/admin/teachers");
  await page.getByRole("button", { name: "선생님 추가" }).click();
  const form = page.getByRole("dialog", { name: "선생님 추가" });
  await form.getByRole("button", { name: "추가" }).click();
  await expect(form.getByText("이름을 입력해 주세요")).toBeVisible();
  await form.getByLabel("이름").fill("정시험");
  await form.getByLabel("호칭").fill("Tester");
  await form.getByRole("button", { name: "추가" }).click();

  const dialog = page.getByRole("dialog", { name: "정시험 선생님" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("로그인 아이디")).toBeVisible();
  await expect(page.getByRole("list", { name: "선생님" }).getByRole("listitem")).toHaveCount(5);
});
