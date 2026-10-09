import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TodoPanel } from "@/components/admin/todo-panel";
import { loadHomeV2 } from "@/lib/admin/home-v2-data";
import { nowTimeKST, todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "처리할 일" };
export const dynamic = "force-dynamic";

// 원장님 새 홈 휴대폰: "처리할 일 N" 줄을 누르면 오는 목록 화면 (PC는 홈 오른쪽에 같은 목록, 10/9 v2)
export default async function TodoPage({ searchParams }: PageProps<"/admin/home-v2/todo">) {
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;
  const { todos } = loadHomeV2(todayKST(), demoTime ?? nowTimeKST());
  return (
    <div className="space-y-4">
      <Link href="/admin/home-v2" className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-caption text-sub hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" />홈
      </Link>
      <h1 className="text-lead font-bold">처리할 일</h1>
      <TodoPanel items={todos} title="남은 일" />
    </div>
  );
}
