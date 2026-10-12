import { AppChrome, type ChromeTab } from "@/components/app-chrome";
import { myDisplayName } from "@/lib/auth/me";
import { isMockRequest } from "@/lib/data/source";
import { teachers } from "@/lib/mock/data";
import { TEACHER_NAV } from "@/lib/nav";

// 선생님 화면 틀: 원장님과 같은 사이드바 + 아래 프로필(역할 "선생님") · 휴대폰 아래 탭 (10/12 범준님, 상단 메뉴에서 바꿈)
// 휴대폰 아래 탭은 5칸이라 출퇴근은 사이드바(PC)에서만. 출퇴근 기능 날(12/7)에 탭 구성을 다시 본다
const TABS: ChromeTab[] = [
  { label: "홈", href: "/teacher" },
  { label: "숙제", href: "/teacher/homework" },
  { label: "담당 학생", href: "/teacher/students" },
  { label: "보강", href: "/teacher/makeups" },
  { label: "메시지", href: "/teacher/messages" },
];

export default async function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  // 실제 로그인 = 계정 이름, 가상 데이터 시험 = 첫 번째 가상 선생님 이름
  const name = (await myDisplayName()) ?? ((await isMockRequest()) ? teachers[0].nickname : null);
  return (
    <AppChrome nav={TEACHER_NAV} role="선생님" userName={name} tabs={TABS}>
      {children}
    </AppChrome>
  );
}
