"use client";

import { useMemo, useState } from "react";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { StudentDetail, type StudentDetailData } from "@/components/students/student-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { EmptyLine, SectionTitle } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import { DAY_STATUS_LABEL, sortDays, studentDay, type DayStatus, type StudentDay } from "@/lib/attendance";
import { cn } from "@/lib/cn";
import { addMinutes, nowTimeKST } from "@/lib/date";
import type { Attendance } from "@/lib/mock/types";
import { useMediaReady } from "@/lib/use-media";

// 선생님 첫 화면 (HOME-03~08). 원장님 원문 구조:
// PC  = 왼쪽 학생 목록(오늘 등원 → 등원 전 → 수업 없음) / 오른쪽 학생 상세가 항상 보이는 좌우 분할
// 휴대폰 = 목록만 보이고, 학생을 누르면 상세가 전체 화면 창으로 열림

type ClassChip = { id: string; name: string };

type Props = {
  date: string; // YYYY-MM-DD
  dateLabel: string; // "2026년 10월 1일 (목)"
  nowTime: string; // "HH:MM"
  demo?: boolean; // 시연 시각(?at=)으로 보는 중이면 true → 버튼을 눌러도 그 시각으로 기록
  classes: ClassChip[];
  days: StudentDay[];
  details: Record<string, StudentDetailData>;
  homeworkHref: string;
  messagesHref: string;
  /** 주소로 바로 열 학생 (?student=s010&mode=attendance) */
  initialOpen?: { studentId: string; mode: "detail" | "attendance" } | null;
};

// 상태는 글자색 + 작은 점으로만 구분한다 (칸 바탕은 모두 흰색, 10/1 단순화)
const STATUS_COLOR: Record<DayStatus, string> = {
  checked_in: "text-ok",
  checked_out: "text-info",
  absent: "text-brand",
  not_arrived: "text-warn",
  upcoming: "text-sub",
  no_class: "text-sub",
};

// 위쪽 숫자 = 상태 필터 (숫자를 누르면 그 학생들만)
const STATUS_FILTERS: { key: "all" | DayStatus; label: string; color: string }[] = [
  { key: "all", label: "오늘 수업", color: "text-ink" },
  { key: "upcoming", label: "수업 전", color: "text-ink/60" },
  { key: "not_arrived", label: "미등원", color: "text-warn" },
  { key: "checked_in", label: "등원", color: "text-ok" },
  { key: "checked_out", label: "하원", color: "text-info" },
  { key: "absent", label: "결석", color: "text-brand" },
];

export function AttendanceBoard({ date, dateLabel, nowTime, demo = false, classes, days: initialDays, details, homeworkHref, messagesHref, initialOpen = null }: Props) {
  // null = 아직 모름(첫 화면). 이때는 휴대폰용 창을 띄우지 않는다
  const media = useMediaReady("(min-width: 1024px)");
  const isDesktop = media === true;
  const [classId, setClassId] = useState<string>("all");
  const [status, setStatus] = useState<"all" | DayStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 여러 명 선택은 필요할 때만 켠다 (평소에는 체크박스를 숨겨 화면을 단순하게)
  const [selecting, setSelecting] = useState(false);
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
  // 출결 창을 연 시각: 창의 등원·하원 시각에 미리 넣는다 (화면을 연 시각이 아니라 버튼을 누른 시각)
  const [openedAt, setOpenedAt] = useState(nowTime);
  // 지금 시각. 시연(?at=) 중이면 시연 시각
  const now = () => (demo ? nowTime : nowTimeKST());
  const openAttendance = (id: string) => {
    setOpenedAt(now());
    setAttendanceFor(id);
  };

  const inClass = classId === "all" ? days : days.filter((d) => d.student.classIds.includes(classId));
  // "오늘 수업"은 오늘 수업이 있는 학생 수 (수업 없는 학생 제외)
  const count = (s: "all" | DayStatus) => (s === "all" ? inClass.filter((d) => d.slot).length : inClass.filter((d) => d.status === s).length);
  const visible = inClass
    .filter((d) => status === "all" || d.status === status)
    .filter((d) => !query || d.student.name.includes(query.trim()));

  const arrived = visible.filter((d) => d.status === "checked_in" || d.status === "checked_out");
  const expected = visible.filter((d) => d.status === "not_arrived" || d.status === "upcoming" || d.status === "absent");
  const others = visible.filter((d) => d.status === "no_class");
  const filtering = status !== "all" || query.trim() !== "";

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const saveRecord = (rec: Attendance) => setEdits((prev) => ({ ...prev, [rec.studentId]: rec }));

  // 여러 명 한 번에 처리 (ATT-04): 등원은 아직 안 온 학생만, 하원은 등원한 학생만 바뀐다
  const chosen = days.filter((d) => selected.has(d.student.id));
  const bulk = (kind: "in" | "out" | "absent") => {
    const t = now();
    for (const d of chosen) {
      const memo = d.record?.memo ?? "";
      if (kind === "in" && !d.record?.checkInAt) {
        saveRecord({ studentId: d.student.id, date, checkInAt: t, checkOutAt: null, status: "present", memo });
      } else if (kind === "out" && d.record?.checkInAt && !d.record.checkOutAt) {
        saveRecord({ studentId: d.student.id, date, checkInAt: d.record.checkInAt, checkOutAt: t, status: "present", memo });
      } else if (kind === "absent") {
        saveRecord({ studentId: d.student.id, date, checkInAt: null, checkOutAt: null, status: "absent", memo });
      }
    }
    setSelected(new Set());
  };

  // 오른쪽 칸 학생: 고른 학생 → 없으면 지금 목록의 첫 학생 (빈 칸으로 두지 않는다)
  const focusDay = days.find((d) => d.student.id === focusId) ?? visible.find((d) => d.slot) ?? visible[0];
  const attendanceDay = days.find((d) => d.student.id === attendanceFor);

  const tileProps: TileHandlers = {
    selecting,
    selected,
    focusId: isDesktop ? (focusDay?.student.id ?? null) : null,
    onToggle: toggle,
    onOpen: (id) => {
      setFocusId(id);
      if (!isDesktop) setDetailSheet(true);
    },
    onAttendance: openAttendance,
    // 등원한 학생을 지금 시각으로 바로 하원 처리 (키패드를 안 찍고 간 학생)
    onCheckOut: (d) =>
      saveRecord({
        studentId: d.student.id,
        date,
        checkInAt: d.record?.checkInAt ?? null,
        // 화면을 열어 둔 채 나중에 눌러도 "누른 시각"으로 기록한다
        checkOutAt: now(),
        status: "present",
        memo: d.record?.memo ?? "",
      }),
  };

  const detailSubtitle = (d: StudentDay) =>
    [d.student.school, d.student.grade, details[d.student.id]?.classNames.join(", ")].filter(Boolean).join(" · ");

  return (
    // 아래 여백은 일괄 처리 줄이 떠 있을 때만
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_500px]", selecting && "pb-24")}>
      {/* ── 왼쪽: 목록 ── */}
      <div className="min-w-0 space-y-5">
        {/* 날짜 */}
        <div className="flex items-center gap-1">
          {/* TODO: 날짜 이동 연결 (지난 날짜 출결 조회) */}
          <IconButton label="이전 날짜">‹</IconButton>
          <h1 className="px-1 text-[22px] leading-none font-bold tracking-tight tabular">{dateLabel}</h1>
          <IconButton label="다음 날짜">›</IconButton>
          <button type="button" className="ml-2 h-8 rounded-[var(--radius-control)] border border-line px-3 text-sm text-sub hover:text-ink">
            오늘
          </button>
        </div>

        {/* 오늘 숫자 = 상태 필터. 누른 숫자의 학생만 보여 준다 */}
        {/* 지금 보고 있는 칸은 회색 바탕 + 굵은 밑줄. 한 번 더 누르면 "오늘 수업"(전체)으로 */}
        <div role="group" aria-label="상태로 보기" className="grid grid-cols-6 border-y border-line">
          {STATUS_FILTERS.map((f) => {
            const active = status === f.key;
            const n = count(f.key);
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => setStatus(active && f.key !== "all" ? "all" : f.key)}
                className={cn("relative py-3 text-center transition-colors", active ? "bg-bg" : "hover:bg-bg/50")}
              >
                {/* 0이면 회색: 색은 확인할 숫자(미등원 1, 결석 2 등)에만 남긴다 (10/5) */}
                <span className={cn("block text-2xl leading-tight font-semibold tabular", n === 0 ? "text-ink/50" : f.color)}>{n}</span>
                <span className={cn("text-[13px] whitespace-nowrap", active ? "font-semibold text-ink" : "text-sub")}>{f.label}</span>
                {active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-ink" />}
              </button>
            );
          })}
        </div>

        {/* 반 · 이름 검색 (한 줄) */}
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {/* 반 이름 옆 숫자 = 그 반 학생 수 */}
          <Chip active={classId === "all"} onClick={() => setClassId("all")} count={days.length}>
            전체 반
          </Chip>
          {classes.map((c) => (
            <Chip key={c.id} active={classId === c.id} onClick={() => setClassId(c.id)} count={days.filter((d) => d.student.classIds.includes(c.id)).length}>
              {c.name}
            </Chip>
          ))}
          <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSelecting((v) => !v);
                setSelected(new Set());
              }}
              className="shrink-0 text-sm text-sub hover:text-ink"
            >
              {selecting ? "선택 끝내기" : "여러 명 선택"}
            </button>
            <label className="w-full sm:w-52">
              <span className="sr-only">이름 검색</span>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 검색" className="h-9" />
            </label>
          </div>
        </div>

        {filtering ? (
          // 상태·이름으로 거른 중: 해당하는 칸만 보여 준다
          <>
            {arrived.length > 0 && <TileSection title="오늘 등원" items={arrived} {...tileProps} />}
            {expected.length > 0 && <TileSection title="오늘 수업 · 등원 전" items={expected} {...tileProps} />}
            {visible.length === 0 && <EmptyLine>조건에 맞는 학생이 없습니다.</EmptyLine>}
          </>
        ) : (
          // 원장님 원문 순서: 오늘 등원 → 등원 전 → 수업 없음. 비어 있는 칸은 한 줄로 줄인다
          <>
            <TileSection title="오늘 등원" items={arrived} empty="아직 없습니다" {...tileProps} />
            <TileSection
              title="오늘 수업 · 등원 전"
              items={expected}
              empty={arrived.length > 0 ? "모두 등원했습니다" : "오늘 수업이 있는 학생이 없습니다"}
              {...tileProps}
            />
          </>
        )}

        {/* 오늘 수업 없는 학생: 접어 두고 필요할 때 펼친다 (보강·결석 처리용) */}
        {others.length > 0 && (
          <section aria-label="오늘 수업 없음">
            <button
              type="button"
              onClick={() => setShowNoClass((v) => !v)}
              aria-expanded={showNoClass}
              className="flex w-full items-center justify-between border-t border-line py-3 text-left"
            >
              <span className="text-base font-semibold text-sub">
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
        {/* 상단 메뉴(64px, 고정) 바로 아래에 붙고, 화면 높이만큼 채운다 (오른쪽이 비어 보이지 않게) */}
        <div className="sticky top-[88px] flex h-[calc(100dvh-112px)] flex-col overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.05)]">
          {focusDay ? (
            <>
              <header className="border-b border-line-soft px-5 py-4">
                <h2 className="text-lg font-semibold">{focusDay.student.name}</h2>
                <p className="mt-0.5 text-[13px] text-sub">{detailSubtitle(focusDay)}</p>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <StudentDetail
                  key={focusDay.student.id}
                  day={focusDay}
                  data={details[focusDay.student.id]}
                  homeworkHref={homeworkHref}
                  messagesHref={messagesHref}
                  onOpenAttendance={() => openAttendance(focusDay.student.id)}
                />
              </div>
            </>
          ) : (
            <p className="m-auto px-5 text-center text-[15px] text-sub">왼쪽에서 학생 이름을 누르면 수업 정보·숙제·메시지가 여기에 보입니다.</p>
          )}
        </div>
      </aside>

      {/* 휴대폰: 학생 상세 창 */}
      {media === false && detailSheet && focusDay && (
        <Sheet open onClose={() => setDetailSheet(false)} title={focusDay.student.name} subtitle={detailSubtitle(focusDay)}>
          <StudentDetail
            key={focusDay.student.id}
            day={focusDay}
            data={details[focusDay.student.id]}
            homeworkHref={homeworkHref}
            messagesHref={messagesHref}
            onOpenAttendance={() => openAttendance(focusDay.student.id)}
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
              nowTime={openedAt}
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

      {/* 여러 명 선택 중: 아래 줄에서 한 번에 처리 (ATT-04) */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <span className="mr-1 text-[15px]">
              {chosen.length > 0 ? (
                <>
                  <b className="tabular">{chosen.length}</b>명 선택
                </>
              ) : (
                <span className="text-sub">학생 칸의 체크를 눌러 고르세요</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set(visible.filter((d) => d.slot).map((d) => d.student.id)))}
              className="mr-2 text-sm text-sub underline underline-offset-2 hover:text-ink"
            >
              오늘 수업 학생 모두
            </button>
            <Button variant="primary" disabled={chosen.length === 0} onClick={() => bulk("in")}>
              등원 처리
            </Button>
            <Button disabled={chosen.length === 0} onClick={() => bulk("out")}>
              하원 처리
            </Button>
            <Button disabled={chosen.length === 0} onClick={() => bulk("absent")}>
              결석 처리
            </Button>
            {/* TODO(5단계): 선택한 학생에게 메시지 (MSG-01) */}
            <button
              type="button"
              onClick={() => {
                setSelecting(false);
                setSelected(new Set());
              }}
              className="ml-auto text-sm text-sub hover:text-ink"
            >
              선택 끝내기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type TileHandlers = {
  selecting: boolean;
  selected: Set<string>;
  focusId: string | null; // PC에서 오른쪽 칸에 보이는 학생 (칸 강조)
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAttendance: (id: string) => void;
  onCheckOut: (day: StudentDay) => void;
};

function TileSection({ title, items, empty, ...handlers }: { title: string; items: StudentDay[]; empty?: string } & TileHandlers) {
  // 비어 있으면 제목 한 줄로 줄인다: "오늘 등원 0 · 아직 없습니다"
  if (items.length === 0) {
    return (
      <p className="flex items-baseline gap-2 text-[15px]">
        <span className="font-bold text-ink">{title}</span>
        <span className="font-semibold text-sub tabular">0</span>
        {empty && <span className="text-sub">· {empty}</span>}
      </p>
    );
  }
  return (
    <section aria-label={title}>
      <SectionTitle count={items.length}>{title}</SectionTitle>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((d) => (
          <Tile key={d.student.id} day={d} {...handlers} />
        ))}
      </ul>
    </section>
  );
}

// 학생 한 칸 (흰 바탕): 이름 · 상태 / 수업 시간 · 등원·하원 · 버튼 하나
function Tile({ day, selecting, selected, focusId, onToggle, onOpen, onAttendance, onCheckOut }: { day: StudentDay } & TileHandlers) {
  const { student, slot, record, status } = day;
  const checked = selected.has(student.id);
  const focused = focusId === student.id;
  const meta = [student.school, student.grade].filter(Boolean).join(" ");
  return (
    <li
      className={cn(
        "rounded-[var(--radius-card)] px-4 py-3 transition-colors",
        checked || focused ? "bg-card shadow-[inset_0_0_0_1.5px_var(--color-ink)]" : "bg-bg hover:bg-line-soft",
      )}
    >
      <div className="flex items-center gap-2">
        {selecting && (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(student.id)}
            aria-label={`${student.name} 선택`}
            className="size-4 shrink-0 accent-[var(--color-brand)]"
          />
        )}
        <button type="button" onClick={() => onOpen(student.id)} className="flex min-w-0 flex-1 items-baseline gap-2 text-left">
          <span className="truncate text-base font-bold">{student.name}</span>
          <span className="truncate text-sm text-sub">{meta}</span>
        </button>
        {status !== "no_class" && (
          <span className={cn("flex shrink-0 items-center gap-1.5 text-sm font-semibold", STATUS_COLOR[status])}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {DAY_STATUS_LABEL[status]}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-sm tabular">
        {/* 등원한 학생은 등원·하원 시각, 아직이면 수업 시간 */}
        <span className="min-w-0 truncate text-sub">
          {record?.checkInAt
            ? `등원 ${record.checkInAt}${record.checkOutAt ? ` · 하원 ${record.checkOutAt}` : ""}`
            : slot
              ? `수업 ${slot.start} ~ ${addMinutes(slot.start, slot.durationMin)}`
              : "오늘 수업 없음"}
        </span>
        {/* 버튼은 지금 할 일 하나만: 등원한 학생은 [하원], 나머지는 [출결] */}
        {status === "checked_in" ? (
          <TileButton onClick={() => onCheckOut(day)}>하원</TileButton>
        ) : (
          <TileButton onClick={() => onAttendance(student.id)}>출결</TileButton>
        )}
      </div>

      {record?.memo && <p className="mt-1 truncate text-sm text-sub">비고 · {record.memo}</p>}
    </li>
  );
}

function TileButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 shrink-0 rounded-[var(--radius-control)] bg-card px-2.5 text-[13px] font-semibold text-ink/80 shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:text-ink"
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count?: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("h-8 rounded-[var(--radius-control)] px-3 text-sm transition-colors", active ? "bg-ink font-semibold text-white" : "text-ink/70 hover:bg-bg")}
    >
      {children}
      {count !== undefined && <span className={cn("ml-1 tabular", active ? "text-white/70" : "text-sub")}>({count})</span>}
    </button>
  );
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-8 place-items-center rounded-[var(--radius-control)] text-xl text-sub hover:bg-bg hover:text-ink"
    >
      {children}
    </button>
  );
}
