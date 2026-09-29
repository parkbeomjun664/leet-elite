"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { EmptyLine } from "@/components/ui/panel";
import { FilterRow, Segment } from "@/components/ui/segment";
import { Table, Td, Th, Tr } from "@/components/ui/table";

/** 서버에서 계산해 넘기는 한 줄 (직렬화 가능한 값만) */
export type StudentRow = {
  id: string;
  name: string;
  schoolGrade: string; // "한빛초 초4"
  classIds: string[];
  classNames: string; // "고등-코어, 고등-포커스"
  schedule: string; // "월·수 15:00"
  attendanceCode: string;
  guardianName: string | null;
  guardianPhone: string | null;
  enrolledOn: string;
  memo: string;
  pending: boolean; // 입학 예정
};

type ClassChip = { id: string; name: string };

export function StudentTable({ rows, classes }: { rows: StudentRow[]; classes: ClassChip[] }) {
  const [classId, setClassId] = useState("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim();
    return rows
      .filter((r) => classId === "all" || r.classIds.includes(classId))
      .filter((r) => !q || r.name.includes(q) || r.schoolGrade.includes(q));
  }, [rows, classId, query]);

  return (
    <div className="space-y-3">
      {/* 필터 */}
      <div className="divide-y divide-line-soft rounded-[var(--radius-card)] border border-line bg-card">
        <FilterRow label="반">
          <Segment active={classId === "all"} onClick={() => setClassId("all")} count={rows.length}>
            전체
          </Segment>
          {classes.map((c) => (
            <Segment
              key={c.id}
              active={classId === c.id}
              onClick={() => setClassId(c.id)}
              count={rows.filter((r) => r.classIds.includes(c.id)).length}
            >
              {c.name}
            </Segment>
          ))}
        </FilterRow>
        <FilterRow label="검색">
          <span className="text-[15px] text-sub">
            <b className="font-bold text-ink tabular">{visible.length}</b>명
          </span>
          <label className="ml-auto min-w-0 flex-1 sm:w-56 sm:flex-none">
            <span className="sr-only">이름·학교 검색</span>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름·학교 검색" className="h-9" />
          </label>
        </FilterRow>
      </div>

      {visible.length === 0 ? (
        <EmptyLine>조건에 맞는 학생이 없습니다.</EmptyLine>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>이름</Th>
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
            {visible.map((r) => (
              // TODO: 줄을 누르면 학생 상세 (STU-01)
              <Tr key={r.id}>
                <Td className="whitespace-nowrap">
                  <span className="text-base font-bold">{r.name}</span>
                  {r.pending && (
                    <Badge tone="warn" className="ml-2">
                      예정
                    </Badge>
                  )}
                </Td>
                <Td className="whitespace-nowrap">{r.schoolGrade}</Td>
                <Td className="whitespace-nowrap">{r.classNames}</Td>
                <Td className="whitespace-nowrap tabular">{r.schedule}</Td>
                <Td className="tabular">{r.attendanceCode}</Td>
                <Td className="whitespace-nowrap">
                  {r.guardianName ? (
                    <>
                      {r.guardianName} <span className="ml-1 text-sub tabular">{r.guardianPhone}</span>
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
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
