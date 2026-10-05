import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * 화면 전체를 쓰는 안내 (에러·없는 주소). 무엇이 안 됐는지 한 문장 → 할 일 → 다음 행동 버튼 (docs/design.md 8번)
 * 사과하지 않고, 빨강 글씨를 쓰지 않는다. 버튼은 주 하나 + 보조 하나까지
 */
export function StatusScreen({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  actions: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-card px-6 pt-[env(safe-area-inset-top,0px)] pb-[calc(10vh+env(safe-area-inset-bottom,0px))] text-center">
      <Icon aria-hidden className="size-8 text-faint" strokeWidth={1.75} />
      <h1 className="mt-4 text-heading font-semibold text-ink">{title}</h1>
      <p className="mt-1.5 max-w-[320px] text-body text-sub">{description}</p>
      <div className="mt-6 flex w-full max-w-[320px] flex-col gap-2">{actions}</div>
    </main>
  );
}
