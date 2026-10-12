import { TeacherList } from "@/components/teachers/teacher-list";
import { loadAdminTeachers } from "@/lib/data/teachers";

// 선생님 (TCH-01). 10/13: 목록·추가·로그인 계정 발급만. 담당 반·수정·퇴사는 선생님 관리(10/26)
export const dynamic = "force-dynamic";

export default async function AdminTeachers() {
  const teachers = await loadAdminTeachers();
  return <TeacherList teachers={teachers} />;
}
