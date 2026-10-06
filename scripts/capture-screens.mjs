// 화면 확인용 캡처 (디자인 점검·전후 비교·범위 확인서). 가상 데이터 서버에서만 찍는다
// 1) 서버: LEET_REAL_DATA=0 LEET_E2E=1 npx next dev -p 3200 (로그인 출입 통제를 건너뛰는 시험 모드)
// 2) 실행: node scripts/capture-screens.mjs <저장 폴더> [이름 일부]
//    저장 폴더는 저장소 밖(임시 폴더)으로. 캡처 파일은 저장소에 넣지 않는다 (docs/workflow.md 6번)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const out = process.argv[2];
const filter = process.argv[3];
if (!out) {
  console.error("저장 폴더를 넣어 주세요: node scripts/capture-screens.mjs <폴더> [이름 일부]");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const BASE = "http://localhost:3200";
// 기준 폭 세 가지 (docs/design.md 8번): 휴대폰 375 · 태블릿·키패드 768 · PC 1280
const PHONE = { width: 375, height: 812 };
const TABLET = { width: 768, height: 1024 };
const PC = { width: 1280, height: 860 };
const ALL = [PHONE, TABLET, PC];

// [이름, 주소, 크기들]
const SCREENS = [
  ["login", "/login", ALL],
  ["password", "/account/password", ALL],
  ["teacher-home", "/teacher?at=16:00", ALL],
  ["teacher-detail", "/teacher?at=16:00&student=s010", [PHONE, TABLET]],
  ["teacher-attendance", "/teacher?at=16:00&student=s010&mode=attendance", ALL],
  ["admin-home", "/admin", ALL],
  ["admin-students", "/admin/students", ALL],
  ["admin-edit", "/admin/students?edit=s010", ALL],
  ["kiosk", "/kiosk", ALL],
  ["student-home", "/student?at=16:00", ALL],
  ["parent-home", "/parent?at=16:00", ALL],
  ["coming-soon", "/teacher/messages", [PC]],
  ["coming-soon-m", "/student/messages", [PHONE]],
  ["design-system", "/design-system", [PC]],
];

const browser = await chromium.launch({ channel: "chrome" });
for (const [name, path, sizes] of SCREENS) {
  if (filter && !name.includes(filter)) continue;
  for (const viewport of sizes) {
    // 로그인 출입 통제를 건너뛰는 시험용 머리글 (개발 서버를 LEET_E2E=1로 켰을 때만 통한다)
    const page = await browser.newPage({ viewport, extraHTTPHeaders: { "x-leet-e2e-no-auth": "1" } });
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    // 화면 준비 + 등장 움직임이 끝날 때까지
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await page.waitForTimeout(600);
    // 개발 서버의 Next 표시(N 동그라미)는 캡처에서 숨긴다
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const tag = String(viewport.width);
    await page.screenshot({ path: `${out}/${name}-${tag}.png`, fullPage: true });
    await page.close();
    console.log("찍음", name, tag);
  }
}
await browser.close();
