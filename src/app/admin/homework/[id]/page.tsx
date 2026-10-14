import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeworkDetailView } from "@/components/homework/homework-detail";
import { loadHomeworkDetail } from "@/lib/data/homework";
import { todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "숙제" };
export const dynamic = "force-dynamic";

// 숙제 상세: 학생별 제출 현황 (HW-05, 10/14). 볼 수 없는 숙제(다른 반 등)는 없는 것과 같게 404
export default async function AdminHomeworkDetail({ params }: PageProps<"/admin/homework/[id]">) {
  const { id } = await params;
  const hw = await loadHomeworkDetail("admin", id);
  if (!hw) notFound();
  return <HomeworkDetailView hw={hw} listHref="/admin/homework" today={todayKST()} />;
}
