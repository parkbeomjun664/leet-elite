// Lighthouse 점수 확인 (10/6): 성능 90 · 접근성 95 이상인지. 화면을 바꾼 날과 배포 전에 돌린다 (화면당 20~30초)
//
// 1) 빌드판 켜기 (개발 서버는 꺼 둔다. 개발 서버는 느려서 점수가 낮게 나온다)
//      npm run build
//      npx next start -p 3300
// 2) 다른 창에서:  npm run lighthouse
//
// - 휴대폰 기준(Lighthouse 기본: 느린 4G·CPU 4배 느리게)으로 잰다
// - 로그인이 필요한 화면은 시험 계정(.env.local의 E2E_PASSWORD)으로 먼저 로그인한다. dev DB 시험 계정이 있어야 한다
// - 기준보다 낮으면 실패(종료 코드 1)로 끝난다. 화면별 보고서(HTML)는 저장소 밖 임시 폴더에 남긴다
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.LH_BASE ?? "http://localhost:3300";
const PORT = 9333;
const MIN = { performance: 90, accessibility: 95 };

// [시험 계정, 주소]. 계정이 null이면 로그인 없이
const PAGES = [
  [null, "/login"],
  ["student", "/student"],
  ["parent", "/parent"],
  ["teacher", "/teacher"],
  ["admin", "/admin"],
  ["admin", "/admin/students"],
  ["kiosk", "/kiosk"],
];

try {
  process.loadEnvFile(".env.local");
} catch {
  // 없으면 로그인 화면만 잰다
}
const password = process.env.E2E_PASSWORD;

const reportDir = mkdtempSync(join(tmpdir(), "leet-lighthouse-"));
// Lighthouse가 같은 브라우저(같은 로그인 쿠키)에 붙도록 원격 디버깅 포트를 연다
const browser = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "leet-lh-profile-")), {
  channel: "chrome",
  headless: true,
  args: [`--remote-debugging-port=${PORT}`],
});

async function loginAs(id) {
  await browser.clearCookies();
  if (!id) return;
  const page = await browser.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder("휴대폰 번호 또는 아이디").fill(id);
  await page.getByPlaceholder("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 15000 });
  await page.close();
}

// 로그인 쿠키는 남기고 브라우저 캐시만 비운다 → 모든 화면을 "처음 방문" 조건으로 같게 잰다
async function clearCache() {
  const page = await browser.newPage();
  const cdp = await browser.newCDPSession(page);
  await cdp.send("Network.clearBrowserCache");
  await page.close();
}

const rows = [];
let failed = false;
for (const [id, path] of PAGES) {
  if (id && !password) {
    rows.push(`${path.padEnd(16)} 건너뜀 (.env.local에 E2E_PASSWORD 없음)`);
    continue;
  }
  await loginAs(id);
  await clearCache();
  const result = await lighthouse(
    BASE + path,
    { port: PORT, output: "html", onlyCategories: ["performance", "accessibility"], logLevel: "error" },
    // 로그인 쿠키를 지우지 않게 (캐시는 위 clearCache로 따로 비운다)
    { extends: "lighthouse:default", settings: { disableStorageReset: true } },
  );
  const { categories } = result.lhr;
  const perf = Math.round(categories.performance.score * 100);
  const a11y = Math.round(categories.accessibility.score * 100);
  const ok = perf >= MIN.performance && a11y >= MIN.accessibility;
  if (!ok) failed = true;
  const file = join(reportDir, `${path.replace(/\W+/g, "_") || "root"}.html`);
  writeFileSync(file, result.report);
  const m = result.lhr.audits;
  rows.push(
    `${path.padEnd(16)} 성능 ${String(perf).padStart(3)}  접근성 ${String(a11y).padStart(3)}  ${ok ? "통과" : "기준 미달"}` +
      `   (LCP ${m["largest-contentful-paint"].displayValue}, CLS ${m["cumulative-layout-shift"].displayValue}, TBT ${m["total-blocking-time"].displayValue})`,
  );
}
await browser.close();

console.log(`\nLighthouse (휴대폰 기준, 기준: 성능 ${MIN.performance} · 접근성 ${MIN.accessibility})\n` + rows.join("\n"));
console.log(`\n화면별 보고서: ${reportDir}`);
process.exit(failed ? 1 : 0);
