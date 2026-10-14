import type { Metadata } from "next";
import { HomeworkForm } from "@/components/homework/homework-form";
import { loadHomeworkTargets } from "@/lib/data/homework";
import { todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "숙제 등록" };
export const dynamic = "force-dynamic";

// 숙제 등록 (HW-01~03, 10/14). 원장님은 모든 재원생
export default async function AdminNewHomework() {
  const targets = await loadHomeworkTargets("admin");
  return <HomeworkForm targets={targets} today={todayKST()} listHref="/admin/homework" />;
}
