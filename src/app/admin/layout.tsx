import { TopBar } from "@/components/top-bar";
import { ADMIN_NAV } from "@/lib/nav";

// TODO(2단계): 로그인 정보에서 이름을 가져오고, 원장님이 아니면 접근 차단
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <TopBar nav={ADMIN_NAV} roleLabel="원장님" userName="총괄관리자" />
      <main className="mx-auto max-w-[1280px] px-4 py-6">{children}</main>
    </>
  );
}
