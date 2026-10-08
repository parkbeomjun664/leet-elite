import { ComingSoon } from "@/components/coming-soon";

// 아직 만들지 않은 학생 탭은 모두 여기로 온다
const LABELS: Record<string, string> = { homework: "숙제", attendance: "내 출결", messages: "메시지" };

export default async function StudentPlaceholder({ params }: PageProps<"/student/[...rest]">) {
  const { rest } = await params;
  return <ComingSoon title={LABELS[rest[0]] ?? "이 화면"} homeHref="/student" mobile />;
}
