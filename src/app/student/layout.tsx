import { MobileShell, type MobileTab } from "@/components/mobile/mobile-shell";
import { loadMyStudent } from "@/lib/data/me-student";

// 학생 아래 탭 (HOME-09)
const STUDENT_TABS: MobileTab[] = [
  { label: "홈", href: "/student" },
  { label: "숙제", href: "/student/homework" },
  { label: "출결", href: "/student/attendance" },
  { label: "메시지", href: "/student/messages" },
];

// 머리줄 이름 = 로그인한 학생 (10/13). 연결된 학생이 없으면 "학생"만
export default async function StudentLayout({ children }: LayoutProps<"/student">) {
  const me = await loadMyStudent();
  return (
    <MobileShell tabs={STUDENT_TABS} userLabel={me ? <><b className="font-semibold text-ink">{me.student.name}</b> 학생</> : "학생"}>
      {children}
    </MobileShell>
  );
}
