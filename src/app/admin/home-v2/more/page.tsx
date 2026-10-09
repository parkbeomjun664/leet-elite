import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = { title: "더보기" };

// 원장님 새 홈 휴대폰 아래 탭 "더보기": 아래 탭에 없는 메뉴 (10/9 v2)
const ITEMS = [
  { label: "학생관리", href: "/admin/students" },
  { label: "반 관리", href: "/admin/classes" },
  { label: "선생님 관리", href: "/admin/teachers" },
  { label: "선생님 출퇴근", href: "/admin/work-logs" },
  { label: "보강", href: "/admin/makeups" },
  { label: "기존 홈 보기 (비교용)", href: "/admin" },
];

export default function MorePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lead font-bold">더보기</h1>
      <ul className="divide-y divide-line-soft border-y border-line-soft">
        {ITEMS.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="press-card -mx-1 flex min-h-14 items-center justify-between rounded-[var(--radius-control)] px-1 text-body text-ink">
              {it.label}
              <ChevronRight aria-hidden className="size-5 text-sub" />
            </Link>
          </li>
        ))}
      </ul>
      <LogoutButton className="text-caption" />
    </div>
  );
}
