import { MobileShell, type MobileTab } from "@/components/mobile/mobile-shell";
import { guardians } from "@/lib/mock/data";

// 학부모 아래 탭 (HOME-10)
const PARENT_TABS: MobileTab[] = [
  { label: "홈", href: "/parent" },
  { label: "숙제", href: "/parent/homework" },
  { label: "출결", href: "/parent/attendance" },
  { label: "메시지", href: "/parent/messages" },
];

// TODO(2단계): 로그인한 보호자로 교체. 지금은 자녀가 두 명 이상인 첫 보호자
const demoGuardian = guardians.find((g) => g.studentIds.length > 1)!;

export default function ParentLayout({ children }: LayoutProps<"/parent">) {
  return (
    <MobileShell tabs={PARENT_TABS} userLabel={<><b className="font-semibold text-ink">{demoGuardian.name}</b> 님</>}>
      {children}
    </MobileShell>
  );
}
