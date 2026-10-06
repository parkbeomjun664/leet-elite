"use client";

// 학생·학부모용 휴대폰 화면 틀 (HOME-09, HOME-10)
// 위: 얇은 흰 머리줄(로고 · 사용자) / 가운데: 좁은 한 줄 본문 / 아래: 고정 탭 4개
// PC에서 열어도 같은 좁은 기둥을 가운데에 보여 준다.
// 두 역할 첫 화면이 함께 쓰는 목록 줄(숙제·보강·메시지)도 여기에 둔다.

import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { PageTransition } from "@/components/page-transition";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DAY_STATUS_LABEL, type DayStatus } from "@/lib/attendance";
import { cn } from "@/lib/cn";
import { STATUS_BADGE_CLASS, statusColor, type MobileStatus } from "@/lib/status-colors";
import { MCARD, MCARD_LIST, ROW_DIVIDER } from "./styles";

export type MobileTab = { label: string; href: string };

type ShellProps = {
  tabs: MobileTab[]; // 첫 번째 탭이 홈
  userLabel: ReactNode; // 오른쪽 위 사용자 표시 ("김OO 학생")
  children: ReactNode;
};

export function MobileShell({ tabs, userLabel, children }: ShellProps) {
  const pathname = usePathname();
  const home = tabs[0]?.href ?? "/";

  // 홈 탭은 정확히 같을 때만, 나머지는 하위 주소까지 선택으로 본다
  const isActive = (href: string) =>
    href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh bg-bg">
      {/* 머리줄: 로고 · 학원 이름 · 사용자 */}
      <header className="sticky top-0 z-30 border-b border-line-soft bg-card pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between gap-3 px-4">
          <Link href={home} className="flex min-h-11 items-center gap-1.5" aria-label="홈으로">
            {/* 여백을 잘라 낸 투명 로고 (scripts/make-icons.mjs 로 생성) */}
            <Image src="/brand/leet-mark.png" alt="" width={407} height={512} className="h-7 w-auto" />
            <span className="text-[17px] font-extrabold tracking-tight text-brand">LEET</span>
            <span className="text-body font-semibold text-ink">영어학원</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3 text-body">
            <span className="min-w-0 truncate text-sub">{userLabel}</span>
            <LogoutButton className="shrink-0 text-caption" />
          </div>
        </div>
      </header>

      {/* 본문: 아래 탭에 가리지 않도록 탭 높이 + 안전 영역만큼 띄운다 */}
      <main className="mx-auto max-w-[480px] px-5 pt-6 pb-[calc(88px+env(safe-area-inset-bottom,0px))]">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* 아래 탭 */}
      <nav aria-label="주 메뉴" className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-card pb-[env(safe-area-inset-bottom,0px)]">
        <ul className="mx-auto grid h-16 max-w-[480px]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab, i) => {
            const active = isActive(tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press flex h-full flex-col items-center justify-center gap-1 text-[11px]",
                    active ? "font-bold text-ink" : "font-medium text-sub hover:text-ink",
                  )}
                >
                  <TabIcon index={i} />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

// 탭 아이콘: 선 두께가 같은 단순한 그림 (홈 · 숙제 · 출결 · 메시지 순서)
function TabIcon({ index }: { index: number }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (index) {
    case 0: // 집
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" />
        </svg>
      );
    case 1: // 공책
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
          <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
        </svg>
      );
    case 2: // 달력 + 체크
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="1.5" />
          <path d="M4 9.5h16M8.5 3v4M15.5 3v4M9 14.5l2 2 4-4" />
        </svg>
      );
    default: // 말풍선
      return (
        <svg {...common}>
          <path d="M4.5 5.5h15v10h-8l-4 3.5v-3.5h-3z" />
        </svg>
      );
  }
}

// ── 공통 목록 줄 ─────────────────────────────────────────

// 휴대폰 화면 구분 규칙 (10/2 보완): 테두리 없이 ① 회색 페이지 바탕 위 흰 카드 ② 여백 단차 ③ 카드 밖 제목
/** 휴대폰 화면의 구역: 카드 바깥 위쪽 제목(카드와 8px) + 카드. 구역 사이 28px */
export function MobileSection({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex min-h-7 items-center justify-between gap-2 px-1">
        <h2 className="text-body font-semibold text-ink">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** 목록이 비었을 때 한 줄 */
export function MobileEmpty({ children }: { children: ReactNode }) {
  return <p className={cn(MCARD, "text-body text-sub")}>{children}</p>;
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-faint">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function DayStatusBadge({ status, className }: { status: DayStatus; className?: string }) {
  return (
    <StatusBadge status={status} className={className}>
      {DAY_STATUS_LABEL[status]}
    </StatusBadge>
  );
}

/** 휴대폰 화면 배지: 상태 색 토큰 (status-colors.ts의 규칙 하나로) */
export function StatusBadge({ status, className, children }: { status: MobileStatus; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-[26px] items-center rounded-[var(--radius-badge)] px-2 text-caption font-semibold whitespace-nowrap", STATUS_BADGE_CLASS[statusColor(status)], className)}>
      {children}
    </span>
  );
}

export type HomeworkItem = {
  id: string;
  daily: boolean; // 매일 숙제 여부
  title: string;
  dateLabel: string; // "9/30 (수)"
  submitted: boolean;
  hasTeacherComment: boolean;
};

/** 숙제 목록: 한 줄 전체를 누를 수 있는 모양 (HW-06, HW-10) */
export function HomeworkList({ items }: { items: HomeworkItem[] }) {
  if (items.length === 0) return <MobileEmpty>받은 숙제가 없습니다.</MobileEmpty>;
  return (
    <ul className={MCARD_LIST}>
      {items.map((hw) => (
        <li key={hw.id} className={ROW_DIVIDER}>
          {/* TODO(HW-06): 숙제 상세·제출 화면으로 이동 */}
          <button type="button" className="flex min-h-14 w-full items-center gap-3 px-5 py-4 text-left active:bg-bg">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-body font-medium text-ink">{hw.title}</span>
              </div>
              <p className="mt-1 text-caption text-sub tabular">
                {hw.daily ? "매일 숙제" : "일반 숙제"} · {hw.dateLabel}
                {hw.hasTeacherComment && <span className="ml-1.5 font-medium text-ink">· 선생님 코멘트</span>}
              </p>
            </div>
            <StatusBadge status={hw.submitted ? "submitted" : "missing"}>{hw.submitted ? "제출함" : "미제출"}</StatusBadge>
            <Chevron />
          </button>
        </li>
      ))}
    </ul>
  );
}

export type MakeupItem = {
  id: string;
  dateLabel: string; // "10/2 (금)"
  timeLabel: string; // "16:00~17:30"
  teacherNickname: string | null; // 학생·학부모에게는 닉네임만
  reason: string;
  isToday: boolean;
};

/** 예정된 보강 (MKP-04) */
export function MakeupList({ items }: { items: MakeupItem[] }) {
  if (items.length === 0) return <MobileEmpty>예정된 보강이 없습니다.</MobileEmpty>;
  return (
    <ul className={MCARD_LIST}>
      {items.map((m) => (
        <li key={m.id} className={cn(ROW_DIVIDER, "flex min-h-14 items-center gap-3 px-5 py-4")}>
          <div className="min-w-0 flex-1">
            <p className="text-body font-medium text-ink tabular">
              {m.dateLabel} {m.timeLabel}
            </p>
            <p className="mt-1 truncate text-caption text-sub">
              {m.reason}
              {m.teacherNickname && ` · ${m.teacherNickname} 선생님`}
            </p>
          </div>
          {m.isToday && <StatusBadge status="upcoming">오늘</StatusBadge>}
        </li>
      ))}
    </ul>
  );
}

export type MessageItem = {
  id: string;
  senderName: string; // 선생님은 닉네임
  fromMe: boolean; // 학부모 본인이 보낸 글
  body: string;
  timeLabel: string; // "9/28 18:20"
  unread: boolean;
};

/** 메시지 미리보기 (MSG-04, MSG-05). 누르면 메시지 화면으로 */
export function MessageList({ items, href }: { items: MessageItem[]; href: string }) {
  if (items.length === 0) return <MobileEmpty>받은 메시지가 없습니다.</MobileEmpty>;
  return (
    <ul className={MCARD_LIST}>
      {items.map((m) => (
        <li key={m.id} className={ROW_DIVIDER}>
          <Link href={href} className="flex min-h-14 items-center gap-3 px-5 py-4 active:bg-bg">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn("truncate text-body font-medium", m.fromMe ? "text-sub" : "text-ink")}>
                  {m.fromMe ? "나" : m.senderName}
                </span>
                <span className="shrink-0 text-caption text-sub tabular">{m.timeLabel}</span>
              </div>
              <p className={cn("mt-1 line-clamp-2 text-body", m.unread ? "text-ink" : "text-sub")}>{m.body}</p>
            </div>
            {m.unread && <span className="size-2 shrink-0 rounded-full bg-ink" aria-label="읽지 않음" />}
            <Chevron />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * 휴대폰 화면의 주 버튼을 아래 탭 바로 위에 고정 (엄지 자리, docs/design.md 8번)
 * 같은 높이의 빈 자리를 본문에 남겨, 고정 버튼이 마지막 내용을 가리지 않게 한다. 화면마다 하나만
 */
export function MobileStickyAction({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-[72px]" />
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom,0px))] z-20 border-t border-line-soft bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[480px] px-5 py-3">{children}</div>
      </div>
    </>
  );
}
