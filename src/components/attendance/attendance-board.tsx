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
import { useMedia } from "@/lib/use-media";

// 선생님 첫 화면 (HOME-03~08). 원장님 원문 구조:
// PC  = 왼쪽 학생 목록(오늘 등원 → 등원 전 → 수업 없음) / 오른쪽 학생 상세가 항상 보이는 좌우 분할
// 휴대폰 = 목록만 보이고, 학생을 누르면 상세가 전체 화면 창으로 열림

type ClassChip = { id: string; name: string };

type Props = {
  date: string; // YYYY-MM-DD
  dateLabel: string; // "2026년 10월 1일 (목)"
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

export function AttendanceBoard({ date, dateLabel, nowTime, classes, days: initialDays, details, homeworkHref, initialOpen = null }: Props) {
  const isDesktop = useMedia("(min-width: 1024px)");
  const [classId, setClassId] = useState<string>("all");
  const [status, setStatus] = useState<"all" | DayStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNoClass, setShowNoClass] = useState(false);
  // 화면에서 고친 출결 (시연용. 저장 연결 전까지는 새로고침하면 사라짐)
  const [edits, setEdits] = useState<Record<string, Attendance>>({});

  const days = useMemo(
    () =>
      initialDays
        .map((d) => (edits[d.student.id] ? studentDay(d.student, [edits[d.student.id]], date, nowTime) : d))
        .sort(sortDays),
    [initialDays, edits, date, nowTime],
  );

  // 오른쪽 칸에 보이는 학생 (PC). 처음에는 주소로 받은 학생 → 오늘 첫 등원 학생 → 목록 첫 학생
  const [focusId, setFocusId] = useState<string | null>(
    initialOpen?.studentId ?? days.find((d) => d.status === "checked_in")?.student.id ?? days[0]?.student.id ?? null,
  );
  // 휴대폰에서 연 상세 창, 그리고 출결 입력 창 (둘 다 창으로 뜸)
  const [detailSheet, setDetailSheet] = useState(initialOpen?.mode === "detail");
  const [attendanceFor, setAttendanceFor] = useState<string | null>(initialOpen?.mode === "attendance" ? initialOpen.studentId : null);

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

  const saveRecord = (rec: Attendance) => setEdits((prev) => ({ ...prev, [rec.studentId]: rec }));

  const focusDay = days.find((d) => d.student.id === focusId);
  const attendanceDay = days.find((d) => d.student.id === attendanceFor);

  const tileProps: TileHandlers = {
    selected,
    focusId: isDesktop ? focusId : null,
    onToggle: toggle,
    onOpen: (id) => {
      setFocusId(id);
      if (!isDesktop) setDetailSheet(true);
    },
    onAttendance: (id) => setAttendanceFor(id),
    // 등원한 학생을 지금 시각으로 바로 하원 처리 (키패드를 안 찍고 간 학생)
    onCheckOut: (d) =>
      saveRecord({
        studentId: d.student.id,
        date,
        checkInAt: d.record?.checkInAt ?? null,
        checkOutAt: nowTime,
        status: "present",
        memo: d.record?.memo ?? "",
      }),
  };

  const detailSubtitle = (d: StudentDay) =>
    [d.student.school, d.student.grade, details[d.student.id]?.classNames.join(", ")].filter(Boolean).join(" · ");

  return (
    <div className="grid gap-6 pb-20 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_500px]">
      {/* ── 왼쪽: 목록 ── */}
      <div className="min-w-0 space-y-5">
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

        {/* 필터 (휴대폰에서는 한 줄로 옆으로 밀어 보기) */}
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
          </FilterRow>
          <div className="px-4 py-2.5">
            <label>
              <span className="sr-only">이름 검색</span>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 검색" className="h-9 sm:w-60" />
            </label>
          </div>
        </div>

        {/* 색 안내 */}
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-sub" aria-label="색 안내">
          {LEGEND.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={cn("size-3.5 rounded-[3px] border border-line border-l-4", TILE[s].stripe, TILE[s].bg)} aria-hidden />
              {DAY_STATUS_LABEL[s]}
            </li>
          ))}
        </ul>

        <TileSection title="오늘 등원" items={arrived} empty="아직 등원한 학생이 없습니다." {...tileProps} />
        <TileSection title="오늘 수업 · 등원 전" items={expected} empty="오늘 수업 학생이 모두 등원했습니다." {...tileProps} />

        {/* 오늘 수업 없는 학생: 접어 두고 필요할 때 펼친다 (보강·결석 처리용) */}
        {others.length > 0 && (
          <section aria-label="오늘 수업 없음">
            <button
              type="button"
              onClick={() => setShowNoClass((v) => !v)}
              aria-expanded={showNoClass}
              className="flex w-full items-center justify-between rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-left hover:border-ink/20"
            >
              <span className="text-base font-bold">
                오늘 수업 없음 <span className="text-[15px] font-semibold text-sub tabular">{others.length}명</span>
              </span>
              <span className="text-sm text-sub">{showNoClass ? "접기 ▴" : "펼치기 ▾"}</span>
            </button>
            {showNoClass && (
              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {others.map((d) => (
                  <Tile key={d.student.id} day={d} {...tileProps} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* ── 오른쪽: 학생 상세 (PC에서만, 스크롤해도 따라옴) ── */}
      <aside className="hidden lg:block">
        {/* 상단 메뉴(96px, 고정) 바로 아래에 붙는다 */}
        <div className="sticky top-[112px] flex max-h-[calc(100dvh-128px)] flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
          {focusDay ? (
            <>
              <header className="border-b border-line px-5 py-4">
                <h2 className="text-lg font-bold">{focusDay.student.name}</h2>
                <p className="mt-0.5 text-[15px] text-sub">{detailSubtitle(focusDay)}</p>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <StudentDetail
                  key={focusDay.student.id}
                  day={focusDay}
                  data={details[focusDay.student.id]}
                  homeworkHref={homeworkHref}
                  onOpenAttendance={() => setAttendanceFor(focusDay.student.id)}
                />
              </div>
            </>
          ) : (
            <p className="px-5 py-10 text-center text-[15px] text-sub">왼쪽에서 학생 이름을 누르면 수업 정보·숙제·메시지가 여기에 보입니다.</p>
          )}
        </div>
      </aside>

      {/* 휴대폰: 학생 상세 창 */}
      {!isDesktop && detailSheet && focusDay && (
        <Sheet open onClose={() => setDetailSheet(false)} title={focusDay.student.name} subtitle={detailSubtitle(focusDay)}>
          <StudentDetail
            key={focusDay.student.id}
            day={focusDay}
            data={details[focusDay.student.id]}
            homeworkHref={homeworkHref}
            onOpenAttendance={() => setAttendanceFor(focusDay.student.id)}
          />
        </Sheet>
      )}

      {/* 출결 입력 창 (PC·휴대폰 공통) */}
      {attendanceDay && (
        <Sheet
          open
          onClose={() => setAttendanceFor(null)}
          title={`${attendanceDay.student.name} 출결 입력`}
          subtitle={detailSubtitle(attendanceDay)}
          width="md:w-[440px]"
        >
          <div className="px-5 py-5">
            <AttendanceForm
              studentId={attendanceDay.student.id}
              date={date}
              nowTime={nowTime}
              record={attendanceDay.record}
              onCancel={() => setAttendanceFor(null)}
              onSave={(rec) => {
                saveRecord(rec);
                setAttendanceFor(null);
              }}
            />
          </div>
        </Sheet>
      )}

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
    </div>
  );
}

type TileHandlers = {
  selected: Set<string>;
  focusId: string | null; // PC에서 오른쪽 칸에 보이는 학생 (타일 강조)
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAttendance: (id: string) => void;
  onCheckOut: (day: StudentDay) => void;
};

function TileSection({ title, items, empty, ...handlers }: { title: string; items: StudentDay[]; empty?: string } & TileHandlers) {
  return (
    <section aria-label={title}>
      <SectionTitle count={items.length}>{title}</SectionTitle>
      {items.length === 0 ? (
        <EmptyLine>{empty}</EmptyLine>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => (
            <Tile key={d.student.id} day={d} {...handlers} />
          ))}
        </ul>
      )}
    </section>
  );
}

// 타일 한 칸: 이름 줄 / 수업·상태 줄 / 등원·하원·버튼 줄 + 비고
function Tile({ day, selected, focusId, onToggle, onOpen, onAttendance, onCheckOut }: { day: StudentDay } & TileHandlers) {
  const { student, slot, record, status } = day;
  const t = TILE[status];
  const checked = selected.has(student.id);
  const focused = focusId === student.id;
  const meta = [student.school, student.grade].filter(Boolean).join(" ");
  return (
    <li
      className={cn(
        "rounded-[var(--radius-control)] border border-l-4 px-3 py-2.5",
        t.stripe,
        t.bg,
        checked || focused ? "border-brand ring-1 ring-brand" : "border-line",
      )}
    >
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
        <span className="flex items-center justify-end gap-2">
          {status === "checked_in" && (
            <button
              type="button"
              onClick={() => onCheckOut(day)}
              className="rounded-[4px] bg-info px-2 py-0.5 text-sm font-semibold text-white hover:opacity-90"
            >
              하원
            </button>
          )}
          <button type="button" onClick={() => onAttendance(student.id)} className="text-sm font-semibold text-brand hover:underline">
            출결
          </button>
        </span>
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
