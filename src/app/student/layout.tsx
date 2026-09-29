import { MobileShell, type MobileTab } from "@/components/mobile/mobile-shell";
import { homeworkOfStudent } from "@/lib/mock/activity";
import { students } from "@/lib/mock/data";

// 학생 아래 탭 (HOME-09)
const STUDENT_TABS: MobileTab[] = [
  { label: "홈", href: "/student" },
  { label: "숙제", href: "/student/homework" },
  { label: "출결", href: "/student/attendance" },
  { label: "메시지", href: "/student/messages" },
];

// TODO(2단계): 로그인한 학생으로 교체. 지금은 숙제가 있는 첫 재원생
const demoStudent = students.find((s) => s.status === "enrolled" && homeworkOfStudent(s.id).length > 0)!;

export default function StudentLayout({ children }: LayoutProps<"/student">) {
  return (
    <MobileShell tabs={STUDENT_TABS} userLabel={<><b className="font-semibold text-ink">{demoStudent.name}</b> 학생</>}>
      {children}
    </MobileShell>
  );
}
