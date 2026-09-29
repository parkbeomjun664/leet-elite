"use client";

import { useMemo, useState } from "react";
import { addMinutes } from "@/lib/date";
import { DAY_STATUS_LABEL, type DayStatus, type StudentDay } from "@/lib/attendance";

type ClassChip = { id: string; name: string };

type Props = {
  dateLabel: string; // "2026년 9월 29일 (화)"
  classes: ClassChip[];
  days: StudentDay[];
};

// 에듀OK처럼 타일 배경색과 왼쪽 띠로 상태를 구분한다
const TILE: Record<DayStatus, { stripe: string; bg: string; text: string }> = {
  checked_in: { stripe: "border-l-ok", bg: "bg-ok-tint/70", text: "text-ok" },
  checked_out: { stripe: "border-l-info", bg: "bg-info-tint/70", text: "text-info" },
  absent: { stripe: "border-l-brand", bg: "bg-brand-tint/70", text: "text-brand" },
  not_arrived: { stripe: "border-l-warn", bg: "bg-warn-tint/80", text: "text-warn" },
  upcoming: { stripe: "border-l-line", bg: "bg-card", text: "text-sub" },
  no_class: { stripe: "border-l-line-soft", bg: "bg-card", text: "text-sub" },
};

const STATUS_FILTERS: { key: "all" | DayStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "not_arrived", label: "미등원" },
  { key: "checked_in", label: "등원" },
  { key: "checked_out", label: "하원" },
  { key: "absent", label: "결석" },
];

const LEGEND: DayStatus[] = ["checked_in", "checked_out", "not_arrived", "absent", "upcoming"];

export function AttendanceBoard({ dateLabel, classes, days }: Props) {
  const [classId, setClassId] = useState<string>("all");
  const [status, setStatus] = useState<"all" | DayStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const inClass = useMemo(
    () => (classId === "all" ? days : days.filter((d) => d.student.classIds.includes(classId))),
    [days, classId],
  );
  const count = (s: "all" | DayStatus) => (s === "all" ? inClass.length : inClass.filter((d) => d.status === s).length);
  const visible = inClass
    .filter((d) => status === "all" || d.status === status)
    .filter((d) => !query || d.student.name.includes(query.trim()));

  const arrived = visible.filter((d) => d.status === "checked_in" || d.status === "checked_out");
  const expected = visible.filter((d) => d.status === "not_arrived" || d.status === "upcoming" || d.status === "absent");
  const others = visible.filter((d) => d.status === "no_class");

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-5 pb-20">
      {/* 제목 · 날짜 · 요약 */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          {/* TODO: 날짜 이동 연결 */}
          <IconButton label="이전 날짜">‹</IconButton>
          <h1 className="text-[22px] leading-none font-bold tracking-tight tabular">{dateLabel}</h1>
          <IconButton label="다음 날짜">›</IconButton>
          <button type="button" className="h-9 rounded-[var(--radius-control)] border border-line bg-card px-3 text-sm text-sub hover:text-ink">
            오늘
          </button>
        </div>
        <dl className="flex items-center gap-5 text-[15px]">
          <Stat label="오늘 수업" value={days.filter((d) => d.slot).length} />
          <Stat label="등원" value={days.filter((d) => d.status === "checked_in" || d.status === "checked_out").length} tone="text-ok" />
          <Stat label="미등원" value={days.filter((d) => d.status === "not_arrived").length} tone="text-warn" />
          <Stat label="결석" value={days.filter((d) => d.status === "absent").length} tone="text-brand" />
        </dl>
      </div>

      {/* 필터 */}
      <div className="divide-y divide-line-soft rounded-[var(--radius-card)] border border-line bg-card">
        <FilterRow label="반">
          <Segment active={classId === "all"} onClick={() => setClassId("all")}>
            전체 <Num>{days.length}</Num>
          </Segment>
          {classes.map((c) => (
            <Segment key={c.id} active={classId === c.id} onClick={() => setClassId(c.id)}>
              {c.name} <Num>{days.filter((d) => d.student.classIds.includes(c.id)).length}</Num>
            </Segment>
          ))}
        </FilterRow>
        <FilterRow label="상태">
          {STATUS_FILTERS.map((f) => (
            <Segment key={f.key} active={status === f.key} onClick={() => setStatus(f.key)}>
              {f.label} <Num>{count(f.key)}</Num>
            </Segment>
          ))}
          <label className="ml-auto">
            <span className="sr-only">이름 검색</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 검색"
              className="h-9 w-40 rounded-[var(--radius-control)] border border-line px-3 text-[15px] focus:border-brand focus:outline-none"
            />
          </label>
        </FilterRow>
      </div>

      {/* 색 안내 */}
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-sub" aria-label="색 안내">
        {LEGEND.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`size-3.5 rounded-[3px] border border-line border-l-4 ${TILE[s].stripe} ${TILE[s].bg}`} aria-hidden />
            {DAY_STATUS_LABEL[s]}
          </li>
        ))}
      </ul>

      <TileSection title="오늘 등원" items={arrived} selected={selected} onToggle={toggle} empty="아직 등원한 학생이 없습니다." />
      <TileSection title="오늘 수업 · 등원 전" items={expected} selected={selected} onToggle={toggle} empty="오늘 수업 학생이 모두 등원했습니다." />
      {others.length > 0 && <TileSection title="오늘 수업 없음" items={others} selected={selected} onToggle={toggle} />}

      {/* 선택한 학생 일괄 처리 (에듀OK 하단 버튼 줄) */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <span className="mr-2 text-[15px]">
              선택한 학생 <b className="tabular">{selected.size}</b>명
            </span>
            {/* TODO: 일괄 등원·하원, 메시지 연결 (ATT-04, MSG-01) */}
            <ActionButton primary>등원 처리</ActionButton>
            <ActionButton>하원 처리</ActionButton>
            <ActionButton>메시지 보내기</ActionButton>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-sm text-sub hover:text-ink">
              선택 해제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TileSection({
  title,
  items,
  selected,
  onToggle,
  empty,
}: {
  title: string;
  items: StudentDay[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  empty?: string;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2.5 flex items-baseline gap-2 text-base font-bold">
        {title}
        <span className="text-[15px] font-semibold text-sub tabular">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="border-y border-line-soft py-3.5 text-[15px] text-sub">{empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((d) => (
            <Tile key={d.student.id} day={d} checked={selected.has(d.student.id)} onToggle={() => onToggle(d.student.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

// 타일 한 칸: 3줄 고정 (이름 줄 / 수업·상태 줄 / 등원·하원·출결 줄) + 비고
function Tile({ day, checked, onToggle }: { day: StudentDay; checked: boolean; onToggle: () => void }) {
  const { student, slot, record, status } = day;
  const t = TILE[status];
  const meta = [student.school, student.grade].filter(Boolean).join(" ");
  return (
    <li
      className={`rounded-[var(--radius-control)] border border-l-4 px-3 py-2.5 ${t.stripe} ${t.bg} ${
        checked ? "border-brand ring-1 ring-brand" : "border-line"
      }`}
    >
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onToggle} className="size-4 shrink-0 accent-[var(--color-brand)]" />
        <span className="truncate text-base font-bold">{student.name}</span>
        <span className="truncate text-sm text-sub">{meta}</span>
      </label>

      <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 text-sm tabular">
        <span className="text-sub">{slot ? `${slot.start} ~ ${addMinutes(slot.start, slot.durationMin)}` : "오늘 수업 없음"}</span>
        <span className={`text-right font-semibold ${t.text}`}>{status === "no_class" ? "" : DAY_STATUS_LABEL[status]}</span>

        <span>
          <span className="text-sub">등원</span> <span className="inline-block w-11">{record?.checkInAt ?? "–"}</span>
          <span className="text-sub">하원</span> {record?.checkOutAt ?? "–"}
        </span>
        {/* TODO: 출결 입력 폼 (ATT-02) */}
        <button type="button" className="text-right text-sm font-semibold text-brand hover:underline">
          출결
        </button>
      </div>

      {record?.memo && <p className="mt-1 truncate text-sm text-sub">비고 · {record.memo}</p>}
    </li>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="w-9 shrink-0 text-sm font-semibold text-sub">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

function Segment({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 rounded-[var(--radius-control)] px-3 text-[15px] transition-colors ${
        active ? "bg-ink font-semibold text-white" : "text-ink/80 hover:bg-line-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <span className="ml-0.5 text-sm opacity-70 tabular">{children}</span>;
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-sub">{label}</dt>
      <dd className={`text-xl font-bold tabular ${tone}`}>{value}</dd>
    </div>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-9 place-items-center rounded-[var(--radius-control)] border border-line bg-card text-lg text-sub hover:text-ink"
    >
      {children}
    </button>
  );
}

function ActionButton({ primary, children }: { primary?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`h-10 rounded-[var(--radius-control)] px-4 text-[15px] font-semibold ${
        primary ? "bg-brand text-white hover:bg-brand-dark" : "border border-line bg-card text-ink hover:border-ink/30"
      }`}
    >
      {children}
    </button>
  );
}
