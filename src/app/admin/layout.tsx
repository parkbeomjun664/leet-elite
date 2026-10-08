import { SubNav, TopBar } from "@/components/top-bar";
import { PageTransition } from "@/components/page-transition";
import { ADMIN_NAV } from "@/lib/nav";

// 원장님만 들어오는 것은 src/proxy.ts가 막는다. TODO(2단계): 상단 이름을 로그인 정보로
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  // 흰 바탕, 구역은 여백·라벨·1px 선으로 (10/7 오후, docs/design.md 1-1)
  return (
    <div className="min-h-dvh bg-card">
      <TopBar nav={ADMIN_NAV} roleLabel="원장님" userName="총괄관리자" />
      {/* 하위 메뉴 줄은 본문 칸 맨 위에, 여백 칸은 주소마다 새로 (메뉴 이동 중 화면 밀림 0, 10/8) */}
      <main>
        <SubNav nav={ADMIN_NAV} />
        <PageTransition className="mx-auto max-w-[1280px] px-4 py-6">{children}</PageTransition>
      </main>
    </div>
  );
}
