import { TopBar } from "@/components/top-bar";
import { PageTransition } from "@/components/page-transition";
import { ADMIN_NAV } from "@/lib/nav";

// 원장님만 들어오는 것은 src/proxy.ts가 막는다. TODO(2단계): 상단 이름을 로그인 정보로
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  // 바탕은 연회색, 구역은 흰 카드 (10/7, docs/design.md 1-1)
  return (
    <div className="min-h-dvh bg-bg">
      <TopBar nav={ADMIN_NAV} roleLabel="원장님" userName="총괄관리자" />
      <main className="mx-auto max-w-[1280px] px-4 py-6">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
