import type { Metadata } from "next";
import { HomeworkList } from "@/components/homework/homework-list";
import { loadHomeworkList } from "@/lib/data/homework";
import { todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "숙제" };
// 매 요청마다 새로 읽는다 (등록·제출이 바로 보이게)
export const dynamic = "force-dynamic";

// 숙제 목록 (HW-04, 10/14). 원장님은 전체
export default async function AdminHomework() {
  const rows = await loadHomeworkList("admin");
  return <HomeworkList rows={rows} newHref="/admin/homework/new" baseHref="/admin/homework" today={todayKST()} />;
}
