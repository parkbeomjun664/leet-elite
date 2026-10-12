// 화면 비교 캡처 (10/12): 가상 데이터 개발 서버에서 한 주소를 PC 1440 · 휴대폰 375로 찍는다
// 사용:
//   1) 가상 데이터 서버 켜기 (Git Bash):  LEET_E2E=1 LEET_TODAY=2026-10-05 LEET_REAL_DATA=0 npx next dev -p 3000
//   2) node scripts/capture-preview.mjs docs/preview admin-home-v5 "/admin?at=16:00"
//      → docs/preview/admin-home-v5-1440.png, admin-home-v5-375.png
// - 로그인 없이 가상 데이터로 그리도록 x-leet-e2e-no-auth 머리글을 보낸다 (src/proxy.ts 시험 모드)
// - 휴대폰 아래 탭(fixed)은 전체 캡처 중간에 찍히지 않게 페이지 맨 끝으로 옮긴다
// - 실제 명단(_private)이 있으면 반드시 LEET_REAL_DATA=0으로 켠 서버에서 찍는다 (CLAUDE.md)
// - 끝나면 3000번 서버를 끈다. 켜 둔 채로 npm run test:e2e를 돌리면 Playwright 서버가 뜨지 못한다
import { chromium } from "@playwright/test";

const [out = "docs/preview", prefix = "capture", path = "/admin?at=16:00"] = process.argv.slice(2);
const b = await chromium.launch({ channel: "chrome" });
for (const [w, h] of [
  [1440, 900],
  [375, 812],
]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, extraHTTPHeaders: { "x-leet-e2e-no-auth": "1" } })).newPage();
  await p.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  // 개발 서버 표시(Next 아이콘)는 지운다
  await p.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => e.remove()));
  await p.evaluate(() =>
    document.querySelectorAll("nav").forEach((n) => {
      if (getComputedStyle(n).position === "fixed") n.style.position = "static";
    }),
  );
  await p.screenshot({ path: `${out}/${prefix}-${w}.png`, fullPage: true });
  await p.context().close();
}
await b.close();
