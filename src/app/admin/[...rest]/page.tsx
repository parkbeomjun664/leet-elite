import { ComingSoon } from "@/components/coming-soon";
import { ADMIN_NAV } from "@/lib/nav";

// 아직 만들지 않은 원장님 메뉴는 모두 여기로 온다
export default async function AdminPlaceholder({ params }: PageProps<"/admin/[...rest]">) {
  const { rest } = await params;
  const href = `/admin/${rest.join("/")}`;
  // 하위 메뉴 이름을 먼저 찾는다 (예: "학생관리"보다 "재원생")
  const label =
    ADMIN_NAV.flatMap((i) => [...(i.children ?? []), i]).find((i) => i.href === href)?.label ?? "이 화면";
  return <ComingSoon title={label} homeHref="/admin" />;
}
