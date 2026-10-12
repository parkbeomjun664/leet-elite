"use client";

import { useEffect } from "react";

// 앱을 처음 열 때의 시작 화면 (10/12 범준님): 흰 바탕 가운데 LEET영어학원 로고
// - 같은 탭에서 처음 한 번만 (sessionStorage). 메뉴를 옮길 때는 지금처럼 회색 골격이 바로 뜬다
// - 서버가 그린 화면 위에 덮여 있다가, 화면이 준비되고(하이드레이션) 최소 0.6초가 지나면 0.3초 동안 사라진다
// - <head>의 작은 스크립트(src/lib/splash-script.ts)가 그리기 전에 html[data-splash]를 정한다 → 두 번째부터는 아예 안 보임
// - 자바스크립트가 꺼져 있으면 data-splash가 없어서 보이지 않는다(globals.css). 움직임 줄이기면 사라지는 움직임 없이 바로
// - 화면 흐름 시험(LEET_E2E=1)에서는 그리지 않는다 (layout.tsx)

const MIN_MS = 600; // 너무 짧게 번쩍이지 않게
const FADE_MS = 300;

export function Splash() {
  useEffect(() => {
    const html = document.documentElement;
    if (html.dataset.splash !== "on") return;
    const wait = Math.max(0, MIN_MS - performance.now());
    let t2: ReturnType<typeof setTimeout>;
    const t1 = setTimeout(() => {
      html.dataset.splash = "done";
      t2 = setTimeout(() => (html.dataset.splash = "off"), FADE_MS);
    }, wait);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div id="splash" aria-hidden className="pointer-events-none fixed inset-0 z-[100] place-items-center bg-card">
      <div className="flex flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- 하이드레이션 전에 바로 보여야 해서 next/image(지연 로딩) 대신 */}
        <img src="/brand/leet-mark.png" alt="" width={407} height={512} className="h-16 w-auto" fetchPriority="high" />
        <p className="flex items-baseline gap-1.5">
          <span className="text-[26px] font-extrabold tracking-tight text-brand">LEET</span>
          <span className="text-[22px] font-semibold text-ink">영어학원</span>
        </p>
      </div>
    </div>
  );
}
