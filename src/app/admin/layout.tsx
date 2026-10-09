import { AdminChrome } from "@/components/admin/admin-chrome";
import { ADMIN_NAV } from "@/lib/nav";

// 원장님만 들어오는 것은 src/proxy.ts가 막는다. TODO(10/19): 상단 이름을 로그인 정보로
// 화면 틀(상단 메뉴 / 새 홈의 사이드바)은 주소를 보고 AdminChrome이 고른다 (10/9 홈 v2 비교)
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminChrome nav={ADMIN_NAV} userName="총괄관리자">
      {children}
    </AdminChrome>
  );
}
