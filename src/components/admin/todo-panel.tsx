"use client";

import Link from "next/link";
import { useState } from "react";
import type { TodoItem } from "@/lib/admin/home-v2-data";
import { cn } from "@/lib/cn";
import { mockSave } from "@/lib/mock/save";
import { toast } from "@/lib/toast";

// 원장님 새 홈 오른쪽 "처리할 일" (10/9 v2 3단계): 미등원 · 사유 없는 결석 · 읽지 않은 메시지 · 숙제 미제출 많은 반
// 바로 처리 버튼을 누르면 그 줄이 부드럽게 접히며 사라지고(먼저 반영), 뒤에서 저장한다. 저장이 실패하면 다시 나타나고 알린다
// 지금은 가짜 저장: 실제 답장·알림은 메시지(11/24)·푸시 알림(11/30) 기능 날에 연결

const LEAVE_MS = 250; // 접히는 시간 (모션 토큰 slow)
const MESSAGE_LIMIT = 5; // 메시지는 최근 5건까지, 나머지는 "외 N건"

const KIND_LABEL: Record<TodoItem["kind"], string> = { notArrived: "미등원", absent: "결석", message: "메시지", homework: "숙제" };

export function TodoPanel({ items, title = "처리할 일", className }: { items: TodoItem[]; title?: string; className?: string }) {
  const [leaving, setLeaving] = useState<Set<string>>(new Set()); // 접히는 중
  const [gone, setGone] = useState<Set<string>>(new Set()); // 다 접혀 목록에서 뺀 것

  const left = items.filter((it) => !gone.has(it.id));
  const count = left.filter((it) => !leaving.has(it.id)).length;
  // 메시지는 최근 5건만 줄로, 나머지는 한 줄 "외 N건"
  const messagesLeft = left.filter((it) => it.kind === "message");
  const hiddenMessages = Math.max(0, messagesLeft.length - MESSAGE_LIMIT);
  const shownMessageIds = new Set(messagesLeft.slice(0, MESSAGE_LIMIT).map((it) => it.id));
  const visible = left.filter((it) => it.kind !== "message" || shownMessageIds.has(it.id));

  const handle = async (it: TodoItem) => {
    setLeaving((s) => new Set(s).add(it.id));
    const t = setTimeout(() => setGone((s) => new Set(s).add(it.id)), LEAVE_MS);
    try {
      await mockSave();
      toast.success(`${it.title} — ${it.action} 처리했어요`);
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
      toast.error(`${it.title} ${it.action}을(를) 처리하지 못했어요. 다시 눌러 주세요`);
    }
  };

  return (
    <section aria-labelledby="todo-v2-title" className={className}>
      <h2 id="todo-v2-title" className="flex items-baseline gap-2 text-caption font-semibold text-sub">
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
                leaving.has(it.id) ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="flex items-start gap-3 border-b border-line-soft py-3">
                  <Link href={it.href} className="min-w-0 flex-1 rounded-[var(--radius-control)] hover:underline">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-body font-bold text-ink">{it.title}</span>
                      {it.time && <span className="shrink-0 text-caption text-sub tabular">{it.time}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-sub">
                      <span className="sr-only">{KIND_LABEL[it.kind]} · </span>
                      {it.detail}
                    </span>
                  </Link>
                  <button
                    type="button"
                    disabled={leaving.has(it.id)}
                    onClick={() => handle(it)}
                    className="press mt-0.5 h-11 shrink-0 rounded-full bg-line-soft px-3.5 text-caption font-semibold text-ink hover:bg-line md:h-8"
                  >
                    {it.action}
                  </button>
                </div>
              </div>
            </li>
          ))}
          {hiddenMessages > 0 && (
            <li className="py-3 text-caption text-sub">
              읽지 않은 메시지 외 <span className="tabular">{hiddenMessages}</span>건은{" "}
              <Link href="/admin/messages" className="font-semibold text-ink hover:underline">
                메시지 화면
              </Link>
              에서
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
