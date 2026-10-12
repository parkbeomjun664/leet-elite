import type { Metadata } from "next";
import { HomeView } from "@/components/admin/home-view";
import { loadAdminHome } from "@/lib/admin/home-data";
import { formatDateKo, nowTimeKST, todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "홈" };

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

/**
 * 원장님 홈 (10/9 v2 → 10/12 v4 토스 스타일): 요약 카드(상태별 히어로) · 오늘 시간표 · 처리할 일
 * 배치는 src/components/admin/home-view.tsx, 데이터는 src/lib/admin/home-data.ts (가상 데이터·계산 재사용, 새 쿼리 없음)
 */
export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  // 시연용: ?at=16:00 처럼 시각을 지정하면 그 시각 기준 (시계는 멈춘다)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;
  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const { blocks, todos, stats } = loadAdminHome(date, now);
  const dateLabel = formatDateKo(date).replace(/^\d+년 /, "");

  return (
    // data-tone="page": 이 화면만 바탕을 토스 스타일 회색으로 (app-chrome.tsx, design.md 1-2)
    <div data-tone="page">
      <HomeView dateLabel={dateLabel} blocks={blocks} todos={todos} stats={stats} initialNow={now} demo={demoTime !== null} />
    </div>
  );
}
