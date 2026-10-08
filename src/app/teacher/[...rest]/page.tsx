import { ComingSoon } from "@/components/coming-soon";
import { TEACHER_NAV } from "@/lib/nav";

// 아직 만들지 않은 선생님 메뉴는 모두 여기로 온다
export default async function TeacherPlaceholder({ params }: PageProps<"/teacher/[...rest]">) {
  const { rest } = await params;
  const href = `/teacher/${rest.join("/")}`;
  // 하위 메뉴 이름을 먼저 찾는다 (예: "숙제"보다 "숙제 관리")
  const label =
    TEACHER_NAV.flatMap((i) => [...(i.children ?? []), i]).find((i) => i.href === href)?.label ?? "이 화면";
  return <ComingSoon title={label} homeHref="/teacher" />;
}
