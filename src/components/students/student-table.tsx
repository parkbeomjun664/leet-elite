"use client";

import { useMemo, useState } from "react";
import { AdminStudentSheet, type AdminStudent } from "@/components/students/admin-student-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/field";
import { EmptyLine } from "@/components/ui/panel";
import { FilterRow, Segment } from "@/components/ui/segment";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { WEEKDAY_KO } from "@/lib/date";
import type { ScheduleSlot } from "@/lib/mock/types";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(initialEditId ?? null);

  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "";

  // 재원생 화면: 재원 + 예정만 (휴·퇴원으로 바꿔 저장하면 목록에서 빠진다, STU-09)
  const active = useMemo(() => rows.filter((r) => r.status === "enrolled" || r.status === "pending"), [rows]);

  const visible = useMemo(() => {
    const q = query.trim();
    return active
      .filter((r) => classId === "all" || r.classIds.includes(classId))
      .filter((r) => !q || r.name.includes(q) || (r.school ?? "").includes(q) || (r.grade ?? "").includes(q));
  }, [active, classId, query]);

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
      {/* 필터 */}
      <div className="divide-y divide-line-soft rounded-[var(--radius-card)] bg-bg">
        <FilterRow label="반">
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
        </FilterRow>
        <FilterRow label="검색">
          <span className="text-body text-sub">
            <b className="font-bold text-ink tabular">{visible.length}</b>명
          </span>
          <label className="ml-auto min-w-0 flex-1 sm:w-56 sm:flex-none">
            <span className="sr-only">이름·학교 검색</span>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름·학교 검색" />
          </label>
        </FilterRow>
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
              <li key={r.id} className={cn("flex items-stretch rounded-[var(--radius-card)] bg-bg", checked && "ring-1 ring-ink/40")}>
                {/* 체크박스는 카드 높이만큼 누를 수 있게 (상자 16px만 누르기 어렵다) */}
                <Checkbox
                  label={<span className="sr-only">{r.name} 선택</span>}
                  checked={checked}
                  onChange={() => toggleOne(r.id)}
                  className="self-stretch pr-1 pl-3"
                />
                <button
                  type="button"
                  onClick={() => setEditId(r.id)}
                  aria-label={`${r.name} 상세 보기`}
                  className="press-card flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pr-3 pl-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-body font-bold">{r.name}</span>
                      {r.status === "pending" && <Badge tone="warn">예정</Badge>}
                      <span className="truncate text-caption text-sub">{[r.school, r.grade].filter(Boolean).join(" ")}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-caption text-sub tabular">
                      {[r.classIds.map(className).filter(Boolean).join(", "), scheduleLabel(r.schedule)].filter(Boolean).join(" · ") || "–"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-caption text-sub">출결</span>
                    <span className="block text-body font-semibold tabular">{r.attendanceCode}</span>
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
              <Th>이름</Th>
              <Th>학생 휴대폰</Th>
              <Th>학교·학년</Th>
              <Th>반</Th>
              <Th>수업 요일·시간</Th>
              <Th>출결 코드</Th>
              <Th>보호자</Th>
              <Th>입학일</Th>
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
                  className={cn("cursor-pointer", checked && "bg-bg")} // 선택한 줄: 옅은 회색 (분홍은 결석에만, 10/5)
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
                    <span className="font-bold">{r.name}</span>
                    {r.status === "pending" && (
                      <Badge tone="warn" className="ml-2">
                        예정
                      </Badge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap tabular">{r.phone ?? <span className="text-sub">없음</span>}</Td>
                  <Td className="whitespace-nowrap">{[r.school, r.grade].filter(Boolean).join(" ") || "–"}</Td>
                  <Td className="whitespace-nowrap">{r.classIds.map(className).filter(Boolean).join(", ") || "–"}</Td>
                  <Td className="whitespace-nowrap tabular">{scheduleLabel(r.schedule)}</Td>
                  <Td className="tabular">{r.attendanceCode}</Td>
                  <Td className="whitespace-nowrap">
                    {g ? (
                      <>
                        {g.name} <span className="ml-1 text-sub tabular">{g.phone1}</span>
                      </>
                    ) : (
                      <span className="text-sub">–</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap tabular">{r.enrolledOn}</Td>
                  <Td className="max-w-[220px] truncate text-sub" title={r.memo || undefined}>
                    {r.memo || "–"}
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
            {/* TODO: 반 일괄 변경 (CLS), 선택한 학생에게 메시지 (MSG-01) */}
            <Button variant="primary">반 변경</Button>
            <Button>메시지 보내기</Button>
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
