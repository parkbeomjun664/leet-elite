import { TopBar } from "@/components/top-bar";
import { TEACHER_NAV } from "@/lib/nav";
import { PageTransition } from "@/components/page-transition";
import { teachers } from "@/lib/mock/data";

// TODO(2단계): 로그인한 선생님으로 교체. 지금은 가상 데이터의 첫 번째 선생님으로 표시
const demoTeacher = teachers[0];

export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  // 흰 바탕, 구역은 여백·라벨·1px 선으로 (10/7 오후, docs/design.md 1-1)
  return (
    <div className="min-h-dvh bg-card">
      <TopBar nav={TEACHER_NAV} roleLabel="선생님" userName={demoTeacher.nickname} />
      <main className="mx-auto max-w-[1280px] px-4 py-6">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
