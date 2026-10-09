import type { Metadata } from "next";
import { TodayTimeline } from "@/components/admin/today-timeline";
import { TodoPanel } from "@/components/admin/todo-panel";
import { loadHomeV2 } from "@/lib/admin/home-v2-data";
import { formatDateKo, nowTimeKST, todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "홈 (새 구조)" };

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

/**
 * 원장님 새 홈 (10/9 비교용, 기존 /admin 은 그대로): "오늘 시간표가 중심인 홈"
 * PC(1024 이상) = 가운데 오늘 타임라인 + 오른쪽 처리할 일 320px / 휴대폰 = 지금 수업 중 · 다음 수업 · 처리할 일 한 줄(4단계)
 * 데이터는 src/lib/admin/home-v2-data.ts (기존 가상 데이터·계산 재사용, 새 쿼리 없음)
 */
export default async function AdminHomeV2({ searchParams }: PageProps<"/admin/home-v2">) {
  // 시연용: ?at=16:00 처럼 시각을 지정하면 그 시각 기준 (시계는 멈춘다)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;
  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const { blocks, todos } = loadHomeV2(date, now);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
      <TodayTimeline dateLabel={formatDateKo(date).replace(/^\d+년 /, "")} blocks={blocks} initialNow={now} demo={demoTime !== null} />
      {/* 오른쪽 처리할 일: 스크롤해도 위에 붙어 있다 */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 max-h-[calc(100dvh-48px)] overflow-y-auto [scrollbar-gutter:stable]">
          <TodoPanel items={todos} />
        </div>
      </aside>
    </div>
  );
}
