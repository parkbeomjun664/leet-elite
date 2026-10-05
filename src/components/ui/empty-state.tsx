import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 비어 있을 때 안내. 아이콘 → 한 문장 → (안내) → (버튼) 가운데 정렬 (docs/design.md 4번)
 * 문장은 상황 + 할 수 있는 일. 점선 테두리·빨강 글씨는 쓰지 않는다
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      {Icon && <Icon aria-hidden className="mb-3 size-6 text-faint" strokeWidth={1.75} />}
      <p className="text-body font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 text-caption text-sub">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
