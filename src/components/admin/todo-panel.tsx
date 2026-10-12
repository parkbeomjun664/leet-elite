"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { TodoItem } from "@/lib/admin/home-data";
import { cn } from "@/lib/cn";
import { mockSave } from "@/lib/mock/save";
import { toast } from "@/lib/toast";

// 원장님 새 홈 오른쪽 "처리할 일" (10/9 v2 3단계): 미등원 · 사유 없는 결석 · 읽지 않은 메시지 · 숙제 미제출 많은 반
// 바로 처리 버튼을 누르면 그 줄이 부드럽게 접히며 사라지고(먼저 반영), 뒤에서 저장한다. 저장이 실패하면 다시 나타나고 알린다
// [알림]은 바로 보내지 않고 받는 사람 수를 보여 주는 확인 창(휴대폰 하단 시트) → [보내기]를 눌러야 보낸다 (10/12)
// 지금은 가짜 저장: 실제 답장·알림은 메시지(11/24)·푸시 알림(11/30) 기능 날에 연결

const LEAVE_MS = 250; // 접히는 시간 (모션 토큰 slow)
const MESSAGE_LIMIT = 5; // 메시지는 최근 5건까지, 나머지는 "외 N건"

const KIND_LABEL: Record<TodoItem["kind"], string> = {
  notArrived: "미등원",
  absent: "결석",
  message: "메시지",
  homework: "숙제",
};

export function TodoPanel({
  items,
  title = "처리할 일",
  className,
}: {
  items: TodoItem[];
  title?: string;
  className?: string;
}) {
  const [leaving, setLeaving] = useState<Set<string>>(new Set()); // 접히는 중
  const [gone, setGone] = useState<Set<string>>(new Set()); // 다 접혀 목록에서 뺀 것
  const [confirming, setConfirming] = useState<TodoItem | null>(null); // 알림 확인 창
  const closeConfirm = useRef<() => void>(null);

  const left = items.filter((it) => !gone.has(it.id));
  const count = left.filter((it) => !leaving.has(it.id)).length;
  // 메시지는 최근 5건만 줄로, 나머지는 한 줄 "외 N건"
  const messagesLeft = left.filter((it) => it.kind === "message");
  const hiddenMessages = Math.max(0, messagesLeft.length - MESSAGE_LIMIT);
  const shownMessageIds = new Set(
    messagesLeft.slice(0, MESSAGE_LIMIT).map((it) => it.id),
  );
  const visible = left.filter(
    (it) => it.kind !== "message" || shownMessageIds.has(it.id),
  );

  const handle = async (it: TodoItem) => {
    setLeaving((s) => new Set(s).add(it.id));
    const t = setTimeout(() => setGone((s) => new Set(s).add(it.id)), LEAVE_MS);
    try {
      await mockSave();
      toast.success(
        it.action === "알림" && it.recipients
          ? `${it.recipients.label} ${it.recipients.count}명에게 알림을 보냈어요`
          : `${it.title} — ${it.action} 처리했어요`,
      );
    } catch {
      // 되돌리기: 다시 나타나게
      clearTimeout(t);
      setGone((s) => {
        const n = new Set(s);
        n.delete(it.id);
        return n;
      });
      setLeaving((s) => {
        const n = new Set(s);
        n.delete(it.id);
        return n;
      });
      toast.error(
        `${it.title} ${it.action}을(를) 처리하지 못했어요. 다시 눌러 주세요`,
      );
    }
  };

  return (
    <section aria-labelledby="todo-v2-title" className={className}>
      <h2
        id="todo-v2-title"
        className="flex items-baseline gap-2 text-caption font-semibold text-sub"
      >
        {title} <span className="tabular">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="mt-3 text-body text-sub">지금 처리할 일이 없어요.</p>
      ) : (
        <ul className="mt-2">
          {visible.map((it) => (
            <li
              key={it.id}
              aria-hidden={leaving.has(it.id) || undefined}
              // 높이를 0까지 줄이며 사라진다 (grid 줄 높이 0fr) → 아래 줄이 부드럽게 올라온다
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-[var(--duration-slow)] ease-[var(--ease-out)]",
                leaving.has(it.id)
                  ? "grid-rows-[0fr] opacity-0"
                  : "grid-rows-[1fr] opacity-100",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="flex items-start gap-3 border-b border-line py-2.5">
                  <Link
                    href={it.href}
                    className="min-w-0 flex-1 rounded-[var(--radius-control)] hover:underline"
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-body font-bold text-ink">
                        {it.title}
                      </span>
                      {it.time && (
                        <span className="shrink-0 text-caption text-sub tabular">
                          {it.time}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-sub">
                      <span className="sr-only">{KIND_LABEL[it.kind]} · </span>
                      {it.detail}
                    </span>
                  </Link>
                  {/* 알림 = 테두리 + 종 아이콘(확인 창을 연다) / 답장·연락 = 회색 면 (10/12 구분) */}
                  <button
                    type="button"
                    disabled={leaving.has(it.id)}
                    onClick={() =>
                      it.action === "알림" ? setConfirming(it) : handle(it)
                    }
                    className={cn(
                      "press mt-0.5 inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-3.5 text-caption font-semibold text-ink md:h-8",
                      it.action === "알림"
                        ? "border border-line bg-card pl-3 hover:bg-bg"
                        : "bg-line hover:bg-line-soft",
                    )}
                  >
                    {it.action === "알림" && (
                      <Bell aria-hidden className="size-3.5" strokeWidth={2} />
                    )}
                    {it.action}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {hiddenMessages > 0 && (
            <li className="py-3 text-caption text-sub">
              읽지 않은 메시지 외{" "}
              <span className="tabular">{hiddenMessages}</span>건은{" "}
              <Link
                href="/admin/messages"
                className="font-semibold text-ink hover:underline"
              >
                메시지 화면
              </Link>
              에서
            </li>
          )}
        </ul>
      )}

      {/* 알림 확인 창: 누구에게 몇 명 → [보내기]. 누른 뒤에만 열리므로 body에 바로 붙인다
          (처리할 일 칸이 sticky라 그 안에 두면 어두운 막이 시간표 점 아래로 깔린다) */}
      {confirming &&
        createPortal(
          <Sheet
            placement="bottom"
            open
            onClose={() => setConfirming(null)}
            closeRef={closeConfirm}
            title="알림 보내기"
            subtitle={confirming.title}
            footer={
              <div className="flex gap-2">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => closeConfirm.current?.()}
                >
                  취소
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  className="flex-[2]"
                  onClick={() => {
                    const it = confirming;
                    closeConfirm.current?.();
                    handle(it);
                  }}
                >
                  {confirming.recipients
                    ? `${confirming.recipients.count}명에게 보내기`
                    : "보내기"}
                </Button>
              </div>
            }
          >
            <div className="space-y-3 px-5 py-5">
              <p className="text-body text-ink">
                {confirming.recipients ? (
                  <>
                    <b className="font-bold">{confirming.recipients.label}</b>{" "}
                    <b className="font-bold tabular">
                      {confirming.recipients.count}명
                    </b>
                    에게 앱 알림을 보냅니다.
                  </>
                ) : (
                  "앱 알림을 보냅니다."
                )}
              </p>
              <p className="rounded-[var(--radius-control)] bg-bg px-3 py-2.5 text-caption text-sub">
                {confirming.detail}
              </p>
            </div>
          </Sheet>,
          document.body,
        )}
    </section>
  );
}
