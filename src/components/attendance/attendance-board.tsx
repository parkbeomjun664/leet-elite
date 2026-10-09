"use client";

import { SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AttendanceForm } from "@/components/attendance/attendance-form";
import { StudentDetail, type StudentDetailData } from "@/components/students/student-detail";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { ScrollRow } from "@/components/ui/scroll-row";
import { Segment } from "@/components/ui/segment";
import { STATUS_CARD_CLASS, statusColor } from "@/lib/status-colors";
import { Sheet } from "@/components/ui/sheet";
import { attendanceSaveMessage, DAY_STATUS_LABEL, sortDays, studentDay, type DayStatus, type StudentDay } from "@/lib/attendance";
import { cn } from "@/lib/cn";
import { addMinutes, nowTimeKST } from "@/lib/date";
import { mockSave } from "@/lib/mock/save";
import type { Attendance } from "@/lib/mock/types";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { useMediaReady } from "@/lib/use-media";
import { useOptimisticSave } from "@/lib/use-optimistic-save";

/** 출결 저장 한 번 = 기록 여러 개(여러 명 처리) + 토스트 문장 */
type AttendanceSave = { records: Attendance[]; message: string };

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
  absent: "text-ink", // 결석 줄은 분홍 바탕으로 구분 (빨강 글씨는 선택 표시와 겹쳐 쓰지 않는다, 10/9 저녁)
  not_arrived: "text-warn",
  upcoming: "text-sub",
  no_class: "text-sub",
};

// 위쪽 숫자 = 상태 필터 (숫자를 누르면 그 학생들만)
// 10/8 UI 7: 고른 칸의 숫자만 검정 28px, 나머지는 회색 22px. 결석은 1 이상이면 어느 쪽이든 빨강
const STATUS_FILTERS: { key: "all" | DayStatus; label: string }[] = [
  { key: "all", label: "오늘 수업" },
  { key: "upcoming", label: "수업 전" },
  { key: "not_arrived", label: "미등원" },
  { key: "checked_in", label: "등원" },
  { key: "checked_out", label: "하원" },
  { key: "absent", label: "결석" },
];

export function AttendanceBoard({ date, dateLabel, nowTime, demo = false, classes, days: initialDays, details, homeworkHref, messagesHref, initialOpen = null }: Props) {
  // null = 아직 모름(첫 화면). 이때는 휴대폰용 창을 띄우지 않는다
  // 769 이상 = 목록 + 오른쪽 상세 나란히, 768 이하 = 목록 → 상세 화면 전환 (10/9)
  const media = useMediaReady("(min-width: 769px)");
  const isDesktop = media === true;
  const searchParams = useSearchParams();
  const [classId, setClassId] = useState<string>("all");
  const [status, setStatus] = useState<"all" | DayStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 여러 명 선택은 필요할 때만 켠다 (평소에는 체크박스를 숨겨 화면을 단순하게)
  const [selecting, setSelecting] = useState(false);
  const [showNoClass, setShowNoClass] = useState(false);
  // 화면에서 고친 출결 (시연용. 저장 연결 전까지는 새로고침하면 사라짐)
  const [savedEdits, setEdits] = useState<Record<string, Attendance>>({});
  // 누르는 즉시 화면에 반영하고 뒤에서 저장한다. 실패하면 되돌리고 알린다 (docs/design.md 7번)
  // TODO(3단계): mockSave → 서버 저장 (attendance)
  const { value: edits, run: saveAttendance } = useOptimisticSave<Record<string, Attendance>, AttendanceSave>({
    state: savedEdits,
    setState: setEdits,
    apply: (s, a) => ({ ...s, ...Object.fromEntries(a.records.map((r) => [r.studentId, r])) }),
    save: () => mockSave(),
    successMessage: (a) => a.message,
    errorMessage: (a) => `${a.message.replace(/했어요$/, "")}하지 못했어요. 다시 눌러 주세요`,
  });

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
  // 출결 입력 창
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

  const nameOf = (id: string) => days.find((d) => d.student.id === id)?.student.name ?? "";
  /** 기록 저장 (누르는 즉시 반영). kind는 토스트 문장용 */
  const saveRecords = (records: Attendance[], kind: "in" | "out" | "absent") => {
    if (records.length === 0) return;
    void saveAttendance({ records, message: attendanceSaveMessage(records.map((r) => nameOf(r.studentId)), kind) });
  };
  const kindOf = (rec: Attendance) => (rec.status === "absent" ? "absent" : rec.checkOutAt ? "out" : "in");

  // 여러 명 한 번에 처리 (ATT-04): 등원은 아직 안 온 학생만, 하원은 등원한 학생만 바뀐다
  const chosen = days.filter((d) => selected.has(d.student.id));
  const bulk = (kind: "in" | "out" | "absent") => {
    const t = now();
    const records: Attendance[] = [];
    for (const d of chosen) {
      const memo = d.record?.memo ?? "";
      if (kind === "in" && !d.record?.checkInAt) {
        records.push({ studentId: d.student.id, date, checkInAt: t, checkOutAt: null, status: "present", memo });
      } else if (kind === "out" && d.record?.checkInAt && !d.record.checkOutAt) {
        records.push({ studentId: d.student.id, date, checkInAt: d.record.checkInAt, checkOutAt: t, status: "present", memo });
      } else if (kind === "absent") {
        records.push({ studentId: d.student.id, date, checkInAt: null, checkOutAt: null, status: "absent", memo });
      }
    }
    saveRecords(records, kind);
    setSelected(new Set());
  };

  // 오른쪽 칸 학생: 고른 학생 → 없으면 지금 목록의 첫 학생 (빈 칸으로 두지 않는다)
  const focusDay = days.find((d) => d.student.id === focusId) ?? visible.find((d) => d.slot) ?? visible[0];
  const attendanceDay = days.find((d) => d.student.id === attendanceFor);

  // 768 이하 학생 상세 화면: 주소의 ?student= 로 연다 (휴대폰 뒤로 가기 = 목록). 서버를 다시 부르지 않게 history로만 바꾼다
  const spStudent = searchParams.get("student");
  const mobileDetailId = media === false && spStudent && searchParams.get("mode") !== "attendance" ? spStudent : null;
  const pushedDetail = useRef(false); // 이 화면에서 연 상세면 뒤로 가기로 닫는다
  useEffect(() => {
    if (!mobileDetailId) pushedDetail.current = false;
  }, [mobileDetailId]);
  const withParams = (edit: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(searchParams.toString());
    edit(p);
    const q = p.toString();
    return q ? `?${q}` : window.location.pathname;
  };
  const openMobileDetail = (id: string) => {
    window.history.pushState(null, "", withParams((p) => { p.set("student", id); p.delete("mode"); }));
    pushedDetail.current = true;
    window.scrollTo(0, 0);
  };
  const closeMobileDetail = () => {
    if (pushedDetail.current) window.history.back();
    else window.history.replaceState(null, "", withParams((p) => { p.delete("student"); p.delete("mode"); }));
  };

  const rowProps: RowHandlers = {
    selecting,
    selected,
    focusId: isDesktop ? (focusDay?.student.id ?? null) : null,
    onToggle: toggle,
    onOpen: (id) => {
      setFocusId(id);
      if (media === false) openMobileDetail(id);
    },
    onAttendance: openAttendance,
    // 등원한 학생을 지금 시각으로 바로 하원 처리 (키패드를 안 찍고 간 학생)
    onCheckOut: (d) =>
      saveRecords(
        [
          {
            studentId: d.student.id,
            date,
            checkInAt: d.record?.checkInAt ?? null,
            // 화면을 열어 둔 채 나중에 눌러도 "누른 시각"으로 기록한다
            checkOutAt: now(),
            status: "present",
            memo: d.record?.memo ?? "",
          },
        ],
        "out",
      ),
  };

  const detailSubtitle = (d: StudentDay) =>
    [d.student.school, d.student.grade, details[d.student.id]?.classNames.join(", ")].filter(Boolean).join(" · ");
  const mobileDetailDay = mobileDetailId ? days.find((d) => d.student.id === mobileDetailId) : undefined;

  const detailBody = (d: StudentDay) => (
    <StudentDetail
      key={d.student.id}
      day={d}
      data={details[d.student.id]}
      homeworkHref={homeworkHref}
      messagesHref={messagesHref}
      onOpenAttendance={() => openAttendance(d.student.id)}
    />
  );

  return (
    // 상담 데스크 패턴 (10/9 화면별 참고 패턴): 위 = 날짜·숫자·반 거르기, 아래 = 왼쪽 학생 목록(360px, 따로 스크롤) + 오른쪽 상세(머리 고정)
    // 768 이하: 목록만 보이고, 학생을 누르면 상세 화면으로 바뀐다(뒤로 버튼·휴대폰 뒤로 가기로 목록)
    // PC는 화면 높이에 맞춰 페이지는 움직이지 않고 목록·상세만 스크롤된다 (상단 메뉴: 1024 이상 65px, 그 아래 113px, 본문 위아래 여백 48px)
    <div className="flex flex-col gap-5 min-[769px]:h-[calc(100dvh-113px-48px)] lg:h-[calc(100dvh-65px-48px)]">
      {mobileDetailDay ? (
        // ── 768 이하: 학생 상세 화면 ──
        <div className="-mx-4 -mt-6">
          <div className="sticky top-[113px] z-10 flex h-16 items-center gap-1 border-b border-line-soft bg-card px-2">
            <button
              type="button"
              onClick={closeMobileDetail}
              aria-label="학생 목록으로"
              className="press grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-2xl text-sub hover:bg-bg hover:text-ink"
            >
              ‹
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-heading font-bold">{mobileDetailDay.student.name}</h2>
              <p className="truncate text-caption text-sub">{detailSubtitle(mobileDetailDay)}</p>
            </div>
          </div>
          <div className="animate-fade-in">{detailBody(mobileDetailDay)}</div>
        </div>
      ) : (
        <>
          {/* ── 위: 날짜 · 숫자(상태 거르기) · 반 · 이름 검색 ── */}
          <div className="shrink-0 space-y-5">
            <div className="flex items-center gap-1">
              {/* TODO: 날짜 이동 연결 (지난 날짜 출결 조회) */}
              <IconButton label="이전 날짜">‹</IconButton>
              {/* 휴대폰 폭에서는 연도를 숨겨 한 줄로 ("10월 5일 (월)") */}
              <h1 className="px-1 text-title leading-none font-bold tracking-tight whitespace-nowrap tabular">
                <span className="max-sm:sr-only">{dateLabel.slice(0, dateLabel.indexOf("년") + 2)}</span>
                {dateLabel.slice(dateLabel.indexOf("년") + 2)}
              </h1>
              <IconButton label="다음 날짜">›</IconButton>
              <Button size="sm" className="ml-2">
                오늘
              </Button>
            </div>

            {/* 오늘 숫자 = 상태 필터. 누른 숫자의 학생만 보여 준다 */}
            {/* 지금 보고 있는 칸은 검은 밑줄(누르면 미끄러져 옮겨 감). 한 번 더 누르면 "오늘 수업"(전체)으로 */}
            <div role="group" aria-label="상태로 보기" className="relative grid grid-cols-6 border-y border-line-soft">
              {STATUS_FILTERS.map((f) => {
                const active = status === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setStatus(active && f.key !== "all" ? "all" : f.key)}
                    className="press py-3 text-center hover:bg-bg/60"
                  >
                    <StatNumber value={count(f.key)} active={active} />
                    <span className={cn("text-caption whitespace-nowrap", active ? "font-semibold text-ink" : "text-sub")}>{f.label}</span>
                  </button>
                );
              })}
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-0.5 w-1/6 bg-brand transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)]"
                style={{ transform: `translateX(${STATUS_FILTERS.findIndex((f) => f.key === status) * 100}%)` }}
              />
            </div>

            {/* 반 · 이름 검색. 반 알약은 한 줄로 옆으로 밀어 본다(두 줄로 넘어가지 않게): 스크롤바 숨김 + 끝 페이드 (10/8 UI 6) */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <ScrollRow activeKey={classId} className="-mx-4 flex-1 sm:mx-0" scrollClassName="px-4 sm:px-0">
                {/* 반 이름 옆 숫자 = 그 반 학생 수 */}
                <div role="group" aria-label="반으로 거르기" className="flex w-max gap-1">
                  <Segment active={classId === "all"} onClick={() => setClassId("all")} count={days.length}>
                    전체 반
                  </Segment>
                  {classes.map((c) => (
                    <Segment key={c.id} active={classId === c.id} onClick={() => setClassId(c.id)} count={days.filter((d) => d.student.classIds.includes(c.id)).length}>
                      {c.name}
                    </Segment>
                  ))}
                </div>
              </ScrollRow>
              <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-sub"
                  onClick={() => {
                    setSelecting((v) => !v);
                    setSelected(new Set());
                  }}
                >
                  {selecting ? "선택 끝내기" : "여러 명 선택"}
                </Button>
                <label className="w-full sm:w-52">
                  <span className="sr-only">이름 검색</span>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 검색" />
                </label>
              </div>
            </div>
          </div>

          {/* ── 아래: 왼쪽 학생 목록 + 오른쪽 상세 ── */}
          <div className="min-h-0 flex-1 min-[769px]:grid min-[769px]:grid-cols-[360px_minmax(0,1fr)] min-[769px]:border-t min-[769px]:border-line-soft">
            <div
              role="region"
              aria-label="학생 목록"
              className={cn(
                // 목록은 옅은 회색 면, 오른쪽 상세는 흰 면으로 나눈다 (선만으로는 경계가 모호해서, 10/9 저녁)
                "min-h-0 bg-bg max-[768px]:-mx-4 min-[769px]:overflow-y-auto min-[769px]:border-r min-[769px]:border-line-soft min-[769px]:[scrollbar-gutter:stable]",
                selecting && "pb-24",
              )}
            >
              {filtering ? (
                // 상태·이름으로 거른 중: 해당하는 줄만 보여 준다
                <>
                  {arrived.length > 0 && <RowSection title="오늘 등원" items={arrived} {...rowProps} />}
                  {expected.length > 0 && <RowSection title="오늘 수업 · 등원 전" items={expected} {...rowProps} />}
                  {visible.length === 0 && (
                    <EmptyState icon={SearchX} title="조건에 맞는 학생이 없어요" description="반이나 상태를 바꾸거나 이름을 다시 확인해 주세요" className="py-8" />
                  )}
                </>
              ) : (
                // 원장님 원문 순서: 오늘 등원 → 등원 전 → 수업 없음. 비어 있는 묶음은 한 줄로 줄인다
                <>
                  <RowSection title="오늘 등원" items={arrived} empty="아직 없습니다" {...rowProps} />
                  <RowSection
                    title="오늘 수업 · 등원 전"
                    items={expected}
                    empty={arrived.length > 0 ? "모두 등원했습니다" : "오늘 수업이 있는 학생이 없습니다"}
                    {...rowProps}
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
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-line-soft/60"
                  >
                    <span className="text-caption font-semibold text-sub">
                      오늘 수업 없음 <span className="tabular">{others.length}명</span>
                    </span>
                    <span className="text-caption text-sub">{showNoClass ? "접기 ▴" : "펼치기 ▾"}</span>
                  </button>
                  {showNoClass && (
                    <ul>
                      {others.map((d) => (
                        <Row key={d.student.id} day={d} {...rowProps} />
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>

            {/* ── 오른쪽: 학생 상세 (769 이상). 머리(이름)는 위에 고정, 내용만 스크롤 ── */}
            <aside className="hidden min-h-0 min-[769px]:block min-[769px]:overflow-y-auto min-[769px]:[scrollbar-gutter:stable]">
              {focusDay ? (
                // 학생을 바꾸면 내용이 살짝 나타난다 (200ms)
                <div key={focusDay.student.id} className="animate-fade-in">
                  <header className="sticky top-0 z-[1] border-b border-line-soft bg-card px-5 py-4">
                    <h2 className="text-heading font-bold">{focusDay.student.name}</h2>
                    <p className="mt-0.5 text-caption text-sub">{detailSubtitle(focusDay)}</p>
                  </header>
                  {detailBody(focusDay)}
                </div>
              ) : (
                <EmptyState className="h-full justify-center" title="왼쪽에서 학생을 눌러 주세요" description="수업 정보·숙제·메시지가 여기에 보여요" />
              )}
            </aside>
          </div>
        </>
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
              // 저장하면 창은 바로 닫히고(닫힘 움직임은 창이 처리), 학생 줄은 그 순간 바뀐다
              onSave={(rec) => saveRecords([rec], kindOf(rec))}
            />
          </div>
        </Sheet>
      )}

      {/* 여러 명 선택 중: 아래 줄에서 한 번에 처리 (ATT-04) */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-20 animate-sheet-up border-t border-line-soft bg-card/95 shadow-float backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <span className="mr-1 text-body">
              {chosen.length > 0 ? (
                <>
                  <b className="tabular">{chosen.length}</b>명 선택
                </>
              ) : (
                <span className="text-sub">학생 줄의 체크를 눌러 고르세요</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set(visible.filter((d) => d.slot).map((d) => d.student.id)))}
              className="mr-2 text-caption text-sub underline underline-offset-2 hover:text-ink"
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
              className="ml-auto text-caption text-sub hover:text-ink"
            >
              선택 끝내기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type RowHandlers = {
  selecting: boolean;
  selected: Set<string>;
  focusId: string | null; // 769 이상에서 오른쪽 상세에 보이는 학생 (줄 강조)
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onAttendance: (id: string) => void;
  onCheckOut: (day: StudentDay) => void;
};

function RowSection({ title, items, empty, ...handlers }: { title: string; items: StudentDay[]; empty?: string } & RowHandlers) {
  // 비어 있으면 제목 한 줄로 줄인다: "오늘 등원 0 · 아직 없습니다"
  if (items.length === 0) {
    return (
      <p className="flex items-baseline gap-2 px-4 py-3 text-caption">
        <span className="font-semibold text-sub">{title}</span>
        <span className="font-semibold text-sub tabular">0</span>
        {empty && <span className="text-sub">· {empty}</span>}
      </p>
    );
  }
  return (
    <section aria-label={title}>
      {/* 묶음 이름: 목록을 스크롤해도 맨 위에 붙어 있다 */}
      <h2 className="sticky top-0 z-[1] flex items-baseline gap-2 bg-bg px-4 pt-3 pb-1.5 text-caption font-semibold text-sub">
        {title} <span className="tabular">{items.length}</span>
      </h2>
      <ul>
        {items.map((d) => (
          <Row key={d.student.id} day={d} {...handlers} />
        ))}
      </ul>
    </section>
  );
}

// 학생 한 줄 (상담 데스크 패턴, 10/9): 이름(굵게)·학교 / 시각 한 줄(회색) / 오른쪽 상태 + 지금 할 일 버튼 하나
// 고른 줄 = 흰 바탕 + 왼쪽 3px 버건디 선 (회색 목록 위에서 떠 보임). 결석 줄 = 결석 전용 분홍 (분홍은 결석에만, src/lib/status-colors.ts)
function Row({ day, selecting, selected, focusId, onToggle, onOpen, onAttendance, onCheckOut }: { day: StudentDay } & RowHandlers) {
  const { student, slot, record, status } = day;
  const checked = selected.has(student.id);
  const focused = focusId === student.id;
  const meta = [student.school, student.grade].filter(Boolean).join(" ");
  return (
    <li
      aria-current={focused ? "true" : undefined}
      className={cn(
        "border-b border-line-soft transition-[background-color,box-shadow] duration-[var(--duration-fast)]",
        "[&:has(>div>button:first-of-type:active)]:bg-black/[0.04]",
        focused || checked
          ? "bg-card shadow-[inset_3px_0_0_var(--color-brand)]"
          : statusColor(status) === "alert"
            ? STATUS_CARD_CLASS.alert
            : "hover:bg-line-soft/60",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        {selecting && (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(student.id)}
            aria-label={`${student.name} 선택`}
            className="size-4 shrink-0 accent-[var(--color-ink)]"
          />
        )}
        {/* 누르는 범위는 위아래로 넓혀 44px 이상 */}
        <button type="button" onClick={() => onOpen(student.id)} className="-my-2.5 min-w-0 flex-1 py-2.5 text-left">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-body font-bold">{student.name}</span>
            <span className="truncate text-caption text-sub">{meta}</span>
          </span>
          {/* 등원한 학생은 등원·하원 시각, 아직이면 수업 시간 */}
          <span className="block truncate text-caption text-sub tabular">
            {record?.checkInAt
              ? `등원 ${record.checkInAt}${record.checkOutAt ? ` · 하원 ${record.checkOutAt}` : ""}`
              : slot
                ? `수업 ${slot.start} ~ ${addMinutes(slot.start, slot.durationMin)}`
                : "오늘 수업 없음"}
            {record?.memo && ` · 비고 ${record.memo}`}
          </span>
        </button>
        {status !== "no_class" && (
          <span className={cn("flex shrink-0 items-center gap-1.5 text-caption font-semibold transition-colors duration-[var(--duration-fast)]", STATUS_COLOR[status])}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {DAY_STATUS_LABEL[status]}
          </span>
        )}
        {/* 버튼은 지금 할 일 하나만: 등원한 학생은 [하원], 나머지는 [출결] */}
        {status === "checked_in" ? (
          <RowButton onClick={() => onCheckOut(day)}>하원</RowButton>
        ) : (
          <RowButton onClick={() => onAttendance(student.id)}>출결</RowButton>
        )}
      </div>
    </li>
  );
}

/** 줄 안 작은 버튼: 테두리 있는 작은 보조 버튼 */
function RowButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press h-11 shrink-0 rounded-[var(--radius-control)] border border-line bg-card px-3 text-caption font-semibold text-ink hover:bg-bg active:bg-line-soft md:h-8"
    >
      {children}
    </button>
  );
}

/** 위쪽 숫자 하나: 바뀌면 세어 가며 바뀐다. 0이면 회색 (색은 확인할 숫자에만, 10/5) */
function StatNumber({ value, active }: { value: number; active: boolean }) {
  const shown = useAnimatedNumber(value);
  // 칸 높이는 큰 숫자(28px) 기준으로 고정해서 고른 칸이 바뀌어도 줄이 출렁이지 않게
  return (
    <span className="flex h-9 items-end justify-center">
      <span
        className={cn(
          "tabular transition-colors duration-[var(--duration-fast)]",
          active ? "text-figure-md font-bold" : "text-figure-sm font-semibold",
          active ? "text-ink" : "text-sub",
        )}
      >
        {shown}
      </span>
    </span>
  );
}

function IconButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="press grid size-11 place-items-center rounded-[var(--radius-control)] text-xl text-sub hover:bg-bg hover:text-ink md:size-8"
    >
      {children}
    </button>
  );
}
