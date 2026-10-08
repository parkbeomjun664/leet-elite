import { ComingSoon } from "@/components/coming-soon";

// 아직 만들지 않은 학부모 탭은 모두 여기로 온다
const LABELS: Record<string, string> = { homework: "자녀 숙제", attendance: "자녀 출결", messages: "메시지" };

export default async function ParentPlaceholder({ params }: PageProps<"/parent/[...rest]">) {
  const { rest } = await params;
  return <ComingSoon title={LABELS[rest[0]] ?? "이 화면"} homeHref="/parent" mobile />;
}
