import type { Metadata } from "next";
import { HomeworkForm } from "@/components/homework/homework-form";
import { loadHomeworkTargets } from "@/lib/data/homework";
import { todayKST } from "@/lib/date";

export const metadata: Metadata = { title: "숙제 등록" };
export const dynamic = "force-dynamic";

// 숙제 등록 (HW-01~03, 10/14). 선생님은 담당 반 학생만(RLS)
export default async function TeacherNewHomework() {
  const targets = await loadHomeworkTargets("teacher");
  return <HomeworkForm targets={targets} today={todayKST()} listHref="/teacher/homework" />;
}
