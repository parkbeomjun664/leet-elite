import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TodoPanel } from "@/components/admin/todo-panel";
import { loadAdminHome } from "@/lib/admin/home-data";
import { nowTimeKST, todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "처리할 일" };
export const dynamic = "force-dynamic";

// 원장님 홈 휴대폰: "처리할 일 N" 줄을 누르면 오는 목록 화면 (PC는 홈 오른쪽에 같은 목록, 10/9 v2)
export default async function TodoPage({ searchParams }: PageProps<"/admin/todo">) {
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;
  const { todos } = loadAdminHome(todayKST(), demoTime ?? nowTimeKST());
  return (
    // 홈과 같은 토스 스타일: 회색 바탕 + 흰 카드 (10/12 v3)
    <div data-tone="page" className="space-y-4">
      <Link href="/admin" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-caption text-muted hover:text-strong">
        <ChevronLeft aria-hidden className="size-4" />홈
      </Link>
      <h1 className="text-lead font-bold text-strong">처리할 일</h1>
      <TodoPanel items={todos} title="남은 일" className="rounded-[var(--radius-hcard)] bg-card p-6" />
    </div>
  );
}
