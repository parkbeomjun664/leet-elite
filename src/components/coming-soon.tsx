import { Hammer } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// 아직 만들지 않은 메뉴를 눌렀을 때 보여 주는 화면 (10/5: 빈 상태 부품으로. 점선·빨강 글씨 없이)
// 10/8 UI 8: 아이콘 40px, 본문 칸 위에서 30% 지점, 아래에 [홈으로] 보조 버튼
// 30% 지점 = (화면 높이 - 상단 메뉴) × 0.3 - 본문 위 여백 24px - 빈 상태 부품 위 여백 40px. 상단 메뉴: PC 65px, 좁은 화면 113px (휴대폰 화면은 64px)
export function ComingSoon({ title, stage, homeHref, mobile = false }: { title: string; stage?: string; homeHref: string; mobile?: boolean }) {
  return (
    <section
      className={
        mobile
          ? "pt-[max(1rem,calc((100dvh-64px)*0.3-64px))]"
          : "pt-[max(1rem,calc((100dvh-113px)*0.3-64px))] lg:pt-[max(1rem,calc((100dvh-65px)*0.3-64px))]"
      }
    >
      <EmptyState
        icon={Hammer}
        iconClassName="size-10"
        title={<h1 className="text-title font-bold">{title}</h1>}
        description={
          <>
            {stage ? `${stage}에 만들 화면이에요` : "곧 만들 화면이에요"} <Badge className="ml-1 align-middle">준비 중</Badge>
          </>
        }
        action={
          <Link href={homeHref} className={buttonClass("secondary", "md")}>
            홈으로
          </Link>
        }
      />
    </section>
  );
}
