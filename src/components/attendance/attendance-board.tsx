"use client";

import { useMemo, useState } from "react";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { StudentDetail, type StudentDetailData } from "@/components/students/student-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyLine, SectionTitle, Stat } from "@/components/ui/panel";
import { FilterRow, Segment } from "@/components/ui/segment";
import { Sheet } from "@/components/ui/sheet";
import { DAY_STATUS_LABEL, sortDays, studentDay, type DayStatus, type StudentDay } from "@/lib/attendance";
import { cn } from "@/lib/cn";
import { addMinutes } from "@/lib/date";
import type { Attendance } from "@/lib/mock/types";

type ClassChip = { id: string; name: string };

type Props = {
  date: string; // YYYY-MM-DD
  dateLabel: string; // "2026년 9월 30일 (수)"
  nowTime: string; // "HH:MM"
  classes: ClassChip[];
  days: StudentDay[];
  details: Record<string, StudentDetailData>;
  homeworkHref: string;
  /** 주소로 바로 열 학생 (?student=s010&mode=attendance) */
  initialOpen?: { studentId: string; mode: "detail" | "attendance" } | null;
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

type Open = { studentId: string; mode: "detail" | "attendance" } | null;

export function AttendanceBoard({ date, dateLabel, nowTime, classes, days: initialDays, details, homeworkHref, initialOpen = null }: Props) {
  const [classId, setClassId] = useState<string>("all");
  const [status, setStatus] = useState<"all" | DayStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Open>(initialOpen);
  // 화면에서 고친 출결 (시연용. 저장 연결 전까지는 새로고침하면 사라짐)
  const [edits, setEdits] = useState<Record<string, Attendance>>({});

  const days = useMemo(
    () =>
      initialDays
        .map((d) => (edits[d.student.id] ? studentDay(d.student, [edits[d.student.id]], date, nowTime) : d))
        .sort(sortDays),
    [initialDays, edits, date, nowTime],
  );

  const inClass = classId === "all" ? days : days.filter((d) => d.student.classIds.includes(classId));
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

  const openDay = open ? days.find((d) => d.student.id === open.studentId) : undefined;
  const tileProps = {
    selected,
    onToggle: toggle,
    onOpen: (id: string) => setOpen({ studentId: id, mode: "detail" }),
    onAttendance: (id: string) => setOpen({ studentId: id, mode: "attendance" }),
  };

  return (
    <div className="space-y-5 pb-20">
      {/* 날짜 · 요약 */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          {/* TODO: 날짜 이동 연결 (지난 날짜 출결 조회) */}
          <IconButton label="이전 날짜">‹</IconButton>
          <h1 className="text-[22px] leading-none font-bold tracking-tight tabular">{dateLabel}</h1>
          <IconButton label="다음 날짜">›</IconButton>
          <Button size="sm" className="h-9">
            오늘
          </Button>
        </div>
        <dl className="flex items-center gap-5">
          <Stat label="오늘 수업" value={days.filter((d) => d.slot).length} />
          <Stat label="등원" value={days.filter((d) => d.status === "checked_in" || d.status === "checked_out").length} tone="text-ok" />
          <Stat label="미등원" value={days.filter((d) => d.status === "not_arrived").length} tone="text-warn" />
          <Stat label="결석" value={days.filter((d) => d.status === "absent").length} tone="text-brand" />
        </dl>
      </div>

      {/* 필터 */}
      <div className="divide-y divide-line-soft rounded-[var(--radius-card)] border border-line bg-card">
        <FilterRow label="반">
          <Segment active={classId === "all"} onClick={() => setClassId("all")} count={days.length}>
            전체
          </Segment>
          {classes.map((c) => (
            <Segment key={c.id} active={classId === c.id} onClick={() => setClassId(c.id)} count={days.filter((d) => d.student.classIds.includes(c.id)).length}>
              {c.name}
            </Segment>
          ))}
        </FilterRow>
        <FilterRow label="상태">
          {STATUS_FILTERS.map((f) => (
            <Segment key={f.key} active={status === f.key} onClick={() => setStatus(f.key)} count={count(f.key)}>
              {f.label}
            </Segment>
          ))}
          <label className="ml-auto">
            <span className="sr-only">이름 검색</span>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 검색" className="h-9 w-40" />
          </label>
        </FilterRow>
      </div>

      {/* 색 안내 */}
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-sub" aria-label="색 안내">
        {LEGEND.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={cn("size-3.5 rounded-[3px] border border-line border-l-4", TILE[s].stripe, TILE[s].bg)} aria-hidden />
            {DAY_STATUS_LABEL[s]}
          </li>
        ))}
        <li className="ml-auto hidden text-sub md:block">학생 이름을 누르면 수업 정보·숙제·메시지가 열립니다</li>
      </ul>

      <TileSection title="오늘 등원" items={arrived} empty="아직 등원한 학생이 없습니다." {...tileProps} />
      <TileSection title="오늘 수업 · 등원 전" items={expected} empty="오늘 수업 학생이 모두 등원했습니다." {...tileProps} />
      {others.length > 0 && <TileSection title="오늘 수업 없음" items={others} {...tileProps} />}

      {/* 선택한 학생 일괄 처리 (에듀OK 하단 버튼 줄) */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <span className="mr-2 text-[15px]">
              선택한 학생 <b className="tabular">{selected.size}</b>명
            </span>
            {/* TODO: 일괄 등원·하원, 메시지 연결 (ATT-04, MSG-01) */}
            <Button variant="primary">등원 처리</Button>
            <Button>하원 처리</Button>
            <Button>메시지 보내기</Button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-sm text-sub hover:text-ink">
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* 학생 상세 / 출결 입력 창 */}
      {openDay && (
        <Sheet
          open
          onClose={() => setOpen(null)}
          title={open?.mode === "attendance" ? `${openDay.student.name} 출결 입력` : openDay.student.name}
          subtitle={[openDay.student.school, openDay.student.grade, details[openDay.student.id]?.classNames.join(", ")].filter(Boolean).join(" · ")}
          width={open?.mode === "attendance" ? "md:w-[440px]" : "md:w-[560px]"}
        >
          {open?.mode === "attendance" ? (
            <div className="px-5 py-5">
              <AttendanceForm
                studentId={openDay.student.id}
                date={date}
                nowTime={nowTime}
                record={openDay.record}
                onCancel={() => setOpen(null)}
                onSave={(rec) => {
                  setEdits((prev) => ({ ...prev, [rec.studentId]: rec }));
                  setOpen(null);
                }}
              />
            </div>
          ) : (
            <StudentDetail
              day={openDay}
              data={details[openDay.student.id]}
              homeworkHref={homeworkHref}
              onOpenAttendance={() => setOpen({ studentId: openDay.student.id, mode: "attendance" })}
            />
          )}
        </Sheet>
      )}
    </div>
  );
}

type TileHandlers = {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAttendance: (id: string) => void;
};

function TileSection({ title, items, empty, ...handlers }: { title: string; items: StudentDay[]; empty?: string } & TileHandlers) {
  return (
    <section aria-label={title}>
      <SectionTitle count={items.length}>{title}</SectionTitle>
      {items.length === 0 ? (
        <EmptyLine>{empty}</EmptyLine>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((d) => (
            <Tile key={d.student.id} day={d} {...handlers} />
          ))}
        </ul>
      )}
    </section>
  );
}

// 타일 한 칸: 이름 줄 / 수업·상태 줄 / 등원·하원·출결 줄 + 비고
function Tile({ day, selected, onToggle, onOpen, onAttendance }: { day: StudentDay } & TileHandlers) {
  const { student, slot, record, status } = day;
  const t = TILE[status];
  const checked = selected.has(student.id);
  const meta = [student.school, student.grade].filter(Boolean).join(" ");
  return (
    <li className={cn("rounded-[var(--radius-control)] border border-l-4 px-3 py-2.5", t.stripe, t.bg, checked ? "border-brand ring-1 ring-brand" : "border-line")}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(student.id)}
          aria-label={`${student.name} 선택`}
          className="size-4 shrink-0 accent-[var(--color-brand)]"
        />
        <button type="button" onClick={() => onOpen(student.id)} className="flex min-w-0 items-baseline gap-2 text-left hover:underline">
          <span className="truncate text-base font-bold">{student.name}</span>
          <span className="truncate text-sm text-sub">{meta}</span>
        </button>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 text-sm tabular">
        <span className="text-sub">{slot ? `${slot.start} ~ ${addMinutes(slot.start, slot.durationMin)}` : "오늘 수업 없음"}</span>
        <span className={cn("text-right font-semibold", t.text)}>{status === "no_class" ? "" : DAY_STATUS_LABEL[status]}</span>

        <span>
          <span className="text-sub">등원</span> <span className="inline-block w-11">{record?.checkInAt ?? "–"}</span>
          <span className="text-sub">하원</span> {record?.checkOutAt ?? "–"}
        </span>
        <button type="button" onClick={() => onAttendance(student.id)} className="text-right text-sm font-semibold text-brand hover:underline">
          출결
        </button>
      </div>

      {record?.memo && <p className="mt-1 truncate text-sm text-sub">비고 · {record.memo}</p>}
    </li>
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
