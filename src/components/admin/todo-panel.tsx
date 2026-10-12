"use client";

import { Bell, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { classTone } from "@/lib/admin/class-color";
import type { TodoItem } from "@/lib/admin/home-data";
import { MESSAGE_TAGS, tagGroup, type MessageTag } from "@/lib/admin/message-tag";
import { cn } from "@/lib/cn";
import { mockSave } from "@/lib/mock/save";
import { toast } from "@/lib/toast";

// 원장 홈 "처리할 일" (10/9 v2 → 10/12 v4): 미등원 · 사유 없는 결석 · 읽지 않은 메시지 · 숙제 미제출 많은 반
// 줄 앞 40px 아바타 = 반 색 연한 톤 + 반 약칭(시간표 점과 같은 색). 첫 줄 "황수빈 · 아버님" + 용건 태그(눌러서 바꿀 수 있다)
// 정렬은 데이터에서: ① 오늘 수업에 영향 ② 읽지 않음 ③ 최신순 (home-data.ts)
// 바로 처리 버튼을 누르면 그 줄이 부드럽게 접히며 사라지고(먼저 반영), 뒤에서 저장한다. 저장이 실패하면 다시 나타나고 알린다
// [알림]은 받는 사람 수를 보여 주는 확인 하단 시트 → [N명에게 보내기]를 눌러야 보낸다
// 지금은 가짜 저장: 실제 답장·알림은 메시지(11/24)·푸시 알림(11/30) 기능 날에 연결

const LEAVE_MS = 250; // 접히는 시간 (모션 토큰 slow)
const MESSAGE_LIMIT = 5; // 메시지는 최근 5건까지, 나머지는 "외 N건"

const KIND_LABEL: Record<TodoItem["kind"], string> = { notArrived: "미등원", absent: "결석", message: "메시지", homework: "숙제" };

/** 용건 태그 색: 결석·조퇴·지각 = 빨강 계열 / 일정 = 파랑 계열 / 문의 = 회색 */
const TAG_CLASS: Record<ReturnType<typeof tagGroup>, string> = {
  today: "bg-class-5-bg text-class-5-text",
  schedule: "bg-class-1-bg text-class-1-text",
  ask: "bg-page text-base",
};

/** 줄 앞 40px 아바타: 반 색 연한 톤 + 반 약칭 */
function TodoAvatar({ it }: { it: TodoItem }) {
  const tone = classTone(it.avatar.sortOrder);
  return (
    <span aria-hidden data-avatar className={cn("grid size-10 shrink-0 place-items-center rounded-full text-caption font-bold tracking-tight", tone.bg, tone.text)}>
      {it.avatar.short}
    </span>
  );
}

/** 용건 태그: 누르면 작은 목록에서 바꾼다 (원장님이 자동 분류를 고칠 수 있게) */
function TagButton({ tag, onChange }: { tag: MessageTag; onChange: (t: MessageTag) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    root.current?.querySelector<HTMLElement>("[aria-checked=true]")?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  return (
    <span ref={root} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`용건 ${tag} (바꾸기)`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-5 items-center gap-0.5 rounded-[var(--radius-tag)] pr-1 pl-1.5 text-micro font-semibold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink",
          TAG_CLASS[tagGroup(tag)],
        )}
      >
        {tag}
        <ChevronDown aria-hidden className="size-3 opacity-70" />
      </button>
      {open && (
        <span
          role="menu"
          aria-label="용건 바꾸기"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              (root.current?.querySelector("button") as HTMLButtonElement | null)?.focus();
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const items = [...(root.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]") ?? [])];
              const i = items.indexOf(document.activeElement as HTMLElement);
              items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
            }
          }}
          className="absolute top-full left-0 z-40 mt-1 flex w-28 flex-col rounded-[var(--radius-button-sm)] bg-card p-1 shadow-float animate-fade-in"
        >
          {MESSAGE_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              role="menuitemradio"
              aria-checked={t === tag}
              onClick={() => {
                setOpen(false);
                if (t !== tag) onChange(t);
              }}
              className="flex h-8 items-center justify-between rounded-[6px] px-2 text-caption text-strong outline-none hover:bg-page focus-visible:bg-page"
            >
              {t}
              {t === tag && <span aria-hidden className={cn("size-1.5 rounded-full", tagGroup(t) === "today" ? "bg-danger" : tagGroup(t) === "schedule" ? "bg-live" : "bg-muted-soft")} />}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

export function TodoPanel({ items, title = "처리할 일", className }: { items: TodoItem[]; title?: string; className?: string }) {
  const [leaving, setLeaving] = useState<Set<string>>(new Set()); // 접히는 중
  const [gone, setGone] = useState<Set<string>>(new Set()); // 다 접혀 목록에서 뺀 것
  const [confirming, setConfirming] = useState<TodoItem | null>(null); // 알림 확인 창
  const [tags, setTags] = useState<Record<string, MessageTag>>({}); // 원장님이 바꾼 용건
  const closeConfirm = useRef<() => void>(null);

  const left = items.filter((it) => !gone.has(it.id));
  const count = left.filter((it) => !leaving.has(it.id)).length;
  // 메시지는 최근 5건만 줄로, 나머지는 한 줄 "외 N건"
  const messagesLeft = left.filter((it) => it.kind === "message");
  const hiddenMessages = Math.max(0, messagesLeft.length - MESSAGE_LIMIT);
  const shownMessageIds = new Set(messagesLeft.slice(0, MESSAGE_LIMIT).map((it) => it.id));
  const visible = left.filter((it) => it.kind !== "message" || shownMessageIds.has(it.id));

  const changeTag = async (it: TodoItem, t: MessageTag) => {
    const before = tags[it.id] ?? it.tag;
    setTags((s) => ({ ...s, [it.id]: t }));
    try {
      await mockSave();
      toast.success(`${it.title} 용건을 "${t}"(으)로 바꿨어요`);
    } catch {
      setTags((s) => ({ ...s, [it.id]: before! }));
      toast.error("용건을 바꾸지 못했어요. 다시 골라 주세요");
    }
  };

  const handle = async (it: TodoItem) => {
    setLeaving((s) => new Set(s).add(it.id));
    const t = setTimeout(() => setGone((s) => new Set(s).add(it.id)), LEAVE_MS);
    try {
      await mockSave();
      toast.success(it.action === "알림" && it.recipients ? `${it.recipients.label} ${it.recipients.count}명에게 알림을 보냈어요` : `${it.title} — ${it.action} 처리했어요`);
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
    <section aria-labelledby="todo-title" className={className}>
      <h2 id="todo-title" className="flex items-baseline gap-2 text-subhead font-semibold text-strong">
        {title} <span className="tabular">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="mt-3 text-body text-muted">지금 처리할 일이 없어요.</p>
      ) : (
        <ul className="mt-2">
          {visible.map((it) => {
            const tag = tags[it.id] ?? it.tag;
            return (
              <li
                key={it.id}
                data-todo={it.kind}
                aria-hidden={leaving.has(it.id) || undefined}
                // 높이를 0까지 줄이며 사라진다 (grid 줄 높이 0fr) → 아래 줄이 부드럽게 올라온다
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows,opacity] duration-[var(--duration-slow)] ease-[var(--ease-out)]",
                  leaving.has(it.id) ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                )}
              >
                {/* 태그 목록이 줄 밖으로 펼쳐지도록, 접히는 중에만 넘침을 자른다 */}
                <div className={cn("min-h-0 min-w-0", leaving.has(it.id) && "overflow-hidden")}>
                  <div className="flex items-center gap-3 py-3">
                    <TodoAvatar it={it} />
                    <div className="min-w-0 flex-1">
                      {/* 첫 줄: 이름(줄지 않음) · 관계 + 용건 태그. 좁으면 관계가 먼저 줄어든다 */}
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Link href={it.href} className="flex min-w-0 items-baseline gap-1 rounded-[var(--radius-control)] hover:underline">
                          <span data-todo-title className="shrink-0 text-body font-semibold whitespace-nowrap text-strong">
                            {it.title}
                          </span>
                          {it.relation && <span className="min-w-0 truncate text-caption text-muted">· {it.relation}</span>}
                        </Link>
                        {tag && <TagButton tag={tag} onChange={(t) => changeTag(it, t)} />}
                      </div>
                      <p className="mt-0.5 truncate text-caption text-muted">
                        <span className="sr-only">{KIND_LABEL[it.kind]} · </span>
                        {it.detail}
                      </p>
                    </div>
                    {/* 오른쪽: 시간(오늘 "오전 9:12" · 어제 · 10/9) 위, 버튼 아래 */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {it.time && (
                        <span data-todo-time className="text-micro text-muted tabular">
                          {it.time}
                        </span>
                      )}
                      {/* 알림 = 흰 바탕 + 테두리 + 종(확인 창을 연다) / 답장·연락 = 연회색 바탕 + 진한 글씨 */}
                      <button
                        type="button"
                        disabled={leaving.has(it.id)}
                        onClick={() => (it.action === "알림" ? setConfirming(it) : handle(it))}
                        className={cn(
                          // 휴대폰은 손가락 44px, 768 이상 32px. 모서리 8
                          "press inline-flex h-11 items-center gap-1 rounded-[var(--radius-button-sm)] px-3 text-caption font-semibold text-strong md:h-8",
                          it.action === "알림" ? "border border-line bg-card pl-2.5 hover:bg-page" : "bg-page hover:bg-line-soft",
                        )}
                      >
                        {it.action === "알림" && <Bell aria-hidden className="size-3.5" strokeWidth={2} />}
                        {it.action}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {hiddenMessages > 0 && (
            <li className="pt-2 text-caption text-muted">
              읽지 않은 메시지 외 <span className="tabular">{hiddenMessages}</span>건은{" "}
              <Link href="/admin/messages" className="font-semibold text-strong hover:underline">
                메시지 화면
              </Link>
              에서
            </li>
          )}
        </ul>
      )}

      {/* 알림 확인 창: 누구에게 몇 명 → [보내기]. 누른 뒤에만 열리므로 body에 바로 붙인다
          (처리할 일 칸이 sticky라 그 안에 두면 어두운 막이 시간표 아래로 깔린다) */}
      {confirming &&
        createPortal(
          <Sheet
            placement="bottom"
            open
            onClose={() => setConfirming(null)}
            closeRef={closeConfirm}
            title="알림 보내기"
            subtitle={[confirming.title, confirming.relation].filter(Boolean).join(" · ")}
            footer={
              <div className="flex gap-2">
                <Button size="lg" className="flex-1" onClick={() => closeConfirm.current?.()}>
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
                  {confirming.recipients ? `${confirming.recipients.count}명에게 보내기` : "보내기"}
                </Button>
              </div>
            }
          >
            <div className="space-y-3 px-5 py-5">
              <p className="text-body text-strong">
                {confirming.recipients ? (
                  <>
                    <b className="font-bold">{confirming.recipients.label}</b> <b className="font-bold tabular">{confirming.recipients.count}명</b>에게 앱 알림을 보냅니다.
                  </>
                ) : (
                  "앱 알림을 보냅니다."
                )}
              </p>
              <p className="rounded-[var(--radius-control)] bg-page px-3 py-2.5 text-caption text-base">{confirming.detail}</p>
            </div>
          </Sheet>,
          document.body,
        )}
    </section>
  );
}
