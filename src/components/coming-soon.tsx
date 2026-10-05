import { Hammer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

// 아직 만들지 않은 메뉴를 눌렀을 때 보여 주는 화면 (10/5: 빈 상태 부품으로. 점선·빨강 글씨 없이)
export function ComingSoon({ title, stage }: { title: string; stage?: string }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-bg py-6">
      <EmptyState
        icon={Hammer}
        title={<h1 className="text-title font-bold">{title}</h1>}
        description={stage ? `${stage}에 만들 화면이에요` : "곧 만들 화면이에요"}
        action={<Badge>준비 중</Badge>}
      />
    </section>
  );
}
