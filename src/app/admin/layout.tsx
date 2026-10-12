import { AdminChrome } from "@/components/admin/admin-chrome";
import { ADMIN_NAV } from "@/lib/nav";

// 원장님만 들어오는 것은 src/proxy.ts가 막는다. TODO(10/19): 사용자 이름을 로그인 정보로
// 화면 틀: PC 왼쪽 사이드바(접고 펼치기) · 휴대폰 아래 탭 (10/12 확정, src/components/admin/admin-chrome.tsx)
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AdminChrome nav={ADMIN_NAV} userName="총괄관리자">
      {children}
    </AdminChrome>
  );
}
