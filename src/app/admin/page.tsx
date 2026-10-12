import type { Metadata } from "next";
import { MobileHome } from "@/components/admin/mobile-home";
import { TodayTimeline } from "@/components/admin/today-timeline";
import { TodoPanel } from "@/components/admin/todo-panel";
import { loadAdminHome } from "@/lib/admin/home-data";
import { formatDateKo, nowTimeKST, todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "홈" };

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

/**
 * 원장님 홈 (10/9 v2 → 10/12 정식 홈): "오늘 시간표가 중심인 홈"
 * PC(1024 이상) = 위 요약 + 왼쪽 오늘 타임라인 + 오른쪽 처리할 일 360px / 휴대폰 = 지금 수업 중 · 다음 수업 · 처리할 일 한 줄(4단계)
 * 데이터는 src/lib/admin/home-data.ts (기존 가상 데이터·계산 재사용, 새 쿼리 없음)
 */
export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  // 시연용: ?at=16:00 처럼 시각을 지정하면 그 시각 기준 (시계는 멈춘다)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;
  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const { blocks, todos } = loadAdminHome(date, now);
  const dateLabel = formatDateKo(date).replace(/^\d+년 /, "");

  return (
    // data-tone="page": 이 화면만 바탕을 토스 스타일 회색으로 (app-chrome.tsx, design.md 1-2)
    <div data-tone="page">
      {/* 휴대폰·태블릿(1024 미만): 요약 · 처리할 일 한 줄 · 지금 수업 중 · 다음 수업 */}
      <div className="lg:hidden">
        <MobileHome dateLabel={dateLabel} blocks={blocks} initialNow={now} demo={demoTime !== null} todoCount={todos.length} />
      </div>
      {/* PC: 위 요약 카드 → 아래 왼쪽 오늘 시간표 카드 + 오른쪽 처리할 일 카드 (카드 사이 16px, 10/12 v3) */}
      <div className="hidden lg:block">
        <TodayTimeline
          dateLabel={dateLabel}
          blocks={blocks}
          initialNow={now}
          demo={demoTime !== null}
          aside={
            // 오른쪽 처리할 일: 스크롤해도 위에 붙어 있다
            <aside className="sticky top-6">
              <div className="max-h-[calc(100dvh-48px)] overflow-y-auto rounded-[var(--radius-hcard)] bg-card p-6 [scrollbar-gutter:stable]">
                <TodoPanel items={todos} />
              </div>
            </aside>
          }
        />
      </div>
    </div>
  );
}
