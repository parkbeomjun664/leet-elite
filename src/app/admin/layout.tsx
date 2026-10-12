import { AppChrome, type ChromeTab } from "@/components/app-chrome";
import { myDisplayName } from "@/lib/auth/me";
import { ADMIN_NAV } from "@/lib/nav";

// 원장님만 들어오는 것은 src/proxy.ts가 막는다
// 화면 틀: PC 왼쪽 사이드바(접고 펼치기 · 아래 프로필) · 휴대폰 아래 탭 (10/12 확정, src/components/app-chrome.tsx)
const TABS: ChromeTab[] = [
  { label: "홈", href: "/admin" },
  { label: "출결", href: "/admin/attendance" },
  { label: "숙제", href: "/admin/homework" },
  { label: "메시지", href: "/admin/messages" },
  { label: "더보기", href: "/admin/more" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // 사이드바 프로필 이름: 계정의 실제 이름 (없거나 "총괄관리자" 같은 내부 이름이면 "원장님")
  const name = await myDisplayName();
  return (
    <AppChrome nav={ADMIN_NAV} role="원장" userName={name} tabs={TABS} extraHomePaths={["/admin/todo"]}>
      {children}
    </AppChrome>
  );
}
