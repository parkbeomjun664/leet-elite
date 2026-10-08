"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AdminStudentSheet, type AdminStudent } from "@/components/students/admin-student-sheet";
import { ComingSoonButton } from "@/components/coming-soon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { EmptyLine } from "@/components/ui/panel";
import { Segment } from "@/components/ui/segment";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { WEEKDAY_KO } from "@/lib/date";
import type { ScheduleSlot } from "@/lib/mock/types";
import { findRange, matchStudent, type SearchHit } from "@/lib/students/search";
import { DEFAULT_SORT, SORT_OPTIONS, nextSort, sortStudents, type Sort, type SortKey } from "@/lib/students/sort";

type ClassChip = { id: string; name: string };

// 월요일부터 순서대로 (0=일 → 맨 뒤)
const weekOrder = (w: number) => (w + 6) % 7;

/** 수업 시간표 → "월·수 15:00" (시간이 요일마다 다르면 "화 15:00 / 목 15:10") */
function scheduleLabel(slots: ScheduleSlot[]): string {
  if (slots.length === 0) return "–";
  const byStart = new Map<string, number[]>();
  for (const s of [...slots].sort((a, b) => weekOrder(a.weekday) - weekOrder(b.weekday))) {
    byStart.set(s.start, [...(byStart.get(s.start) ?? []), s.weekday]);
  }
  return [...byStart.entries()].map(([start, days]) => `${days.map((d) => WEEKDAY_KO[d]).join("·")} ${start}`).join(" / ");
}

/** 검색어가 있는 자리를 옅은 회색 바탕으로 (초성·하이픈 건너뛴 숫자도) */
function Mark({ text, query }: { text: string; query: string }) {
  const r = findRange(text, query);
  if (!r) return <>{text}</>;
  return (
    <>
      {text.slice(0, r[0])}
      <mark className="rounded-[2px] bg-line text-inherit">{text.slice(r[0], r[1])}</mark>
      {text.slice(r[1])}
    </>
  );
}

/** 누르면 정렬되는 머리글 (같은 열을 다시 누르면 방향 반대) */
function SortTh({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: Sort; onSort: (k: SortKey) => void }) {
  const on = sort.key === sortKey;
  return (
    <Th aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="p-0">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn("flex w-full items-center gap-1 px-3 py-2.5 text-left hover:text-ink", on && "text-ink")}
      >
        {label}
        <span aria-hidden className={cn("text-[10px]", !on && "invisible")}>
          {sort.dir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </Th>
  );
}

/**
 * 재원생 표 (STU-06). 줄을 누르면 원장님용 상세·수정 창
 * @param initialEditId 처음부터 열어 둘 학생 (/admin/students?edit=s003)
 */
export function StudentTable({
  students,
  classes,
  initialEditId,
}: {
  students: AdminStudent[];
  classes: ClassChip[];
  initialEditId?: string | null;
}) {
  // 저장하면 이 목록만 바뀐다 (TODO(DB 연결): 서버 저장 후 다시 불러오기)
  const [rows, setRows] = useState(students);
  const [classId, setClassId] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 휴대폰·태블릿 카드는 [여러 명 선택]을 눌렀을 때만 체크박스 (선생님 홈과 같은 규칙, 10/1). PC 표는 늘 보인다(에듀OK 방식)
  const [selecting, setSelecting] = useState(false);
  const [editId, setEditId] = useState<string | null>(initialEditId ?? null);

  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "";

  // 재원생 화면: 재원 + 예정만 (휴·퇴원으로 바꿔 저장하면 목록에서 빠진다, STU-09)
  const active = useMemo(() => rows.filter((r) => r.status === "enrolled" || r.status === "pending"), [rows]);

  // 검색: 이름(초성)·학교·학년·휴대폰·출결 번호·메모·보호자 (src/lib/students/search.ts). 맞은 칸은 hits에
  const { visible, hits } = useMemo(() => {
    const q = query.trim();
    const hits = new Map<string, SearchHit>();
    const filtered = active
      .filter((r) => classId === "all" || r.classIds.includes(classId))
      .filter((r) => {
        if (!q) return true;
        const hit = matchStudent(r, q);
        if (hit) hits.set(r.id, hit);
        return hit !== null;
      });
    return { visible: sortStudents(filtered, sort), hits };
  }, [active, classId, query, sort]);
  const q = query.trim();
  const mark = (text: string): ReactNode => (q ? <Mark text={text} query={q} /> : text);

  // 휴·퇴원으로 바뀌어 목록에서 빠진 학생은 선택에서도 뺀다
  const selectedCount = active.filter((r) => selected.has(r.id)).length;

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const someVisibleSelected = visible.some((r) => selected.has(r.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 머리줄 체크: 지금 보이는 학생 전체 선택 / 해제
  function toggleVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of visible) {
        if (allVisibleSelected) next.delete(r.id);
        else next.add(r.id);
      }
      return next;
    });
  }

  const editing = rows.find((r) => r.id === editId) ?? null;

  return (
    <div className={cn("space-y-3", selectedCount > 0 && "pb-20")}>
      {/* 거르기 한 줄: 반 알약(넘치면 옆으로 밀어 보기) + 검색. 인원 수는 알약에만 (10/7 다듬기) */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div role="group" aria-label="반으로 거르기" className="-mx-4 flex min-w-0 flex-1 gap-1 overflow-x-auto px-4 md:mx-0 md:px-0 [&>*]:shrink-0">
          <Segment active={classId === "all"} onClick={() => setClassId("all")} count={active.length}>
            전체
          </Segment>
          {classes.map((c) => (
            <Segment
              key={c.id}
              active={classId === c.id}
              onClick={() => setClassId(c.id)}
              count={active.filter((r) => r.classIds.includes(c.id)).length}
            >
              {c.name}
            </Segment>
          ))}
        </div>
        <label className="md:w-64 md:shrink-0">
          <span className="sr-only">학생 검색 (이름·초성·학교·전화·출결 번호·메모)</span>
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름·초성·전화·메모 검색" />
        </label>
      </div>
      {/* 걸렀을 때만 결과 수, 휴대폰·태블릿은 [여러 명 선택] */}
      {/* PC(1024~)에서는 [여러 명 선택]이 없으므로, 거르지 않을 때는 이 줄을 숨긴다 (빈칸이 생기지 않게) */}
      <div className={cn("flex min-h-11 items-center justify-between gap-3", classId === "all" && !query.trim() && "lg:hidden")}>
        <p className="text-caption text-sub" aria-live="polite">
          {classId !== "all" || query.trim() ? (
            <>
              {active.length}명 중 <b className="font-semibold text-ink tabular">{visible.length}</b>명
            </>
          ) : null}
        </p>
        <div className="flex shrink-0 items-center gap-1 lg:hidden">
        {/* PC는 표 머리글을 눌러 정렬, 휴대폰·태블릿은 선택칸 */}
        <label>
          <span className="sr-only">정렬</span>
          <Select
            value={`${sort.key}-${sort.dir}`}
            onChange={(e) => setSort(SORT_OPTIONS.find((o) => o.value === e.target.value)?.sort ?? DEFAULT_SORT)}
            className="h-9 border-transparent bg-transparent text-caption text-sub max-md:h-11"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 text-sub"
          aria-pressed={selecting}
          onClick={() => {
            setSelecting((v) => !v);
            setSelected(new Set());
          }}
        >
          {selecting ? "선택 끝내기" : "여러 명 선택"}
        </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyLine>조건에 맞는 학생이 없습니다.</EmptyLine>
      ) : (
        <>
        {/* 휴대폰·태블릿(1024 미만): 표 대신 카드 목록. 가로 스크롤 없이 (docs/design.md 8번) */}
        <ul aria-label="재원생" className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden">
          {visible.map((r) => {
            const checked = selected.has(r.id);
            return (
              <li key={r.id} className={cn("flex items-stretch rounded-[var(--radius-card)] bg-bg", checked && "bg-card ring-[1.5px] ring-ink")}>
                {/* [여러 명 선택]일 때는 카드 전체가 선택 버튼(체크 표시는 모양만), 아니면 누르면 수정 창 */}
                <button
                  type="button"
                  onClick={() => (selecting ? toggleOne(r.id) : setEditId(r.id))}
                  aria-label={selecting ? `${r.name} 선택` : `${r.name} 상세 보기`}
                  aria-pressed={selecting ? checked : undefined}
                  className="press-card flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pr-3 pl-4 text-left"
                >
                  {selecting && (
                    <input type="checkbox" readOnly checked={checked} tabIndex={-1} aria-hidden className="pointer-events-none size-4 shrink-0 accent-[var(--color-ink)]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-body font-bold">{mark(r.name)}</span>
                      {r.status === "pending" && <Badge tone="warn">예정</Badge>}
                      <span className="truncate text-caption text-sub">{mark([r.school, r.grade].filter(Boolean).join(" "))}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-sub tabular">
                      {[r.classIds.map(className).filter(Boolean).join(", "), scheduleLabel(r.schedule)].filter(Boolean).join(" · ") || "–"}
                    </span>
                    {/* 카드에 안 보이는 칸에서 찾았으면 어디서 찾았는지 한 줄 */}
                    {(() => {
                      const hit = hits.get(r.id);
                      if (!hit || !["phone", "memo", "guardian"].includes(hit.field)) return null;
                      return (
                        <span className="mt-0.5 block truncate text-caption text-sub">
                          {hit.label} <span className="text-ink">{mark(hit.text)}</span>
                        </span>
                      );
                    })()}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-caption text-sub">출결</span>
                    <span className="block text-body font-semibold tabular">{mark(r.attendanceCode)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="hidden lg:block">
        <Table>
          <thead>
            <tr>
              <Th className="w-10 pr-0">
                <Checkbox
                  label={<span className="sr-only">보이는 학생 전체 선택</span>}
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                  }}
                  onChange={toggleVisible}
                  className="align-middle"
                />
              </Th>
              <SortTh label="이름" sortKey="name" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
              <Th>학생 휴대폰</Th>
              <Th>학교·학년</Th>
              <Th>반</Th>
              <Th>수업 요일·시간</Th>
              <SortTh label="출결 코드" sortKey="attendanceCode" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
              <Th>보호자</Th>
              <SortTh label="입학일" sortKey="enrolledOn" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
              <Th>메모</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const g = r.guardians[0] ?? null;
              const checked = selected.has(r.id);
              return (
                <Tr
                  key={r.id}
                  tabIndex={0}
                  aria-label={`${r.name} 상세 보기`}
                  onClick={() => setEditId(r.id)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      setEditId(r.id);
                    }
                  }}
                  className={cn("press-card cursor-pointer", checked && "bg-bg")} // 선택한 줄: 옅은 회색 (분홍은 결석에만, 10/5)
                >
                  {/* 체크박스를 눌러도 상세 창은 열리지 않게 */}
                  <Td className="w-10 pr-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      label={<span className="sr-only">{r.name} 선택</span>}
                      checked={checked}
                      onChange={() => toggleOne(r.id)}
                      className="align-middle"
                    />
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className="font-bold">{mark(r.name)}</span>
                    {r.status === "pending" && (
                      <Badge tone="warn" className="ml-2">
                        예정
                      </Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap tabular">{r.phone ? mark(r.phone) : <span className="text-sub">없음</span>}</Td>
                  <Td className="whitespace-nowrap">{[r.school, r.grade].filter(Boolean).length ? mark([r.school, r.grade].filter(Boolean).join(" ")) : "–"}</Td>
                  <Td className="whitespace-nowrap">{r.classIds.map(className).filter(Boolean).join(", ") || "–"}</Td>
                  <Td className="whitespace-nowrap tabular">{scheduleLabel(r.schedule)}</Td>
                  <Td className="tabular">{mark(r.attendanceCode)}</Td>
                  <Td className="whitespace-nowrap">
                    {g ? (
                      <>
                        {mark(g.name)} <span className="ml-1 text-sub tabular">{g.phone1 ? mark(g.phone1) : null}</span>
                      </>
                    ) : (
                      <span className="text-sub">–</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap tabular">{r.enrolledOn}</Td>
                  <Td className="max-w-[220px] truncate text-sub" title={r.memo || undefined}>
                    {r.memo ? mark(r.memo) : "–"}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
        </div>
        </>
      )}

      {/* 선택한 학생 일괄 처리 (에듀OK 하단 버튼 줄) */}
      {selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 animate-sheet-up border-t border-line-soft bg-card/95 shadow-float backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <span className="mr-2 text-body">
              선택한 학생 <b className="tabular">{selectedCount}</b>명
            </span>
            {/* 열리기 전에는 날짜 안내: 반 일괄 변경(CLS-02, 10/14), 여러 명에게 메시지(MSG-01, 11/26) */}
            <ComingSoonButton variant="primary" feature="반 한꺼번에 바꾸기" opensOn="10/14">
              반 변경
            </ComingSoonButton>
            <ComingSoonButton feature="여러 명에게 메시지" opensOn="11/26">
              메시지 보내기
            </ComingSoonButton>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-caption text-sub hover:text-ink">
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* 원장님용 학생 상세·수정 */}
      {editing && (
        <AdminStudentSheet
          key={editing.id}
          student={editing}
          others={rows.filter((r) => r.id !== editing.id)}
          classes={classes}
          onClose={() => setEditId(null)}
          onSave={(next) => {
            setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)));
            // 창은 저장 뒤 닫힘 움직임을 거쳐 onClose로 닫힌다
          }}
        />
      )}
    </div>
  );
}
