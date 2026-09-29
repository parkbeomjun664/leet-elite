import { StudentTable, type StudentRow } from "@/components/students/student-table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/panel";
import { WEEKDAY_KO } from "@/lib/date";
import { classById, classes, guardiansOf, students } from "@/lib/mock/data";
import type { ScheduleSlot } from "@/lib/mock/types";

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

export default function AdminStudents() {
  // 재원생 화면: 재원 + 예정만 (휴·퇴원생은 별도 화면, STU-09)
  const list = students.filter((s) => s.status === "enrolled" || s.status === "pending");

  const rows: StudentRow[] = list.map((s) => {
    const g = guardiansOf(s.id)[0] ?? null;
    return {
      id: s.id,
      name: s.name,
      schoolGrade: [s.school, s.grade].filter(Boolean).join(" ") || "–",
      classIds: s.classIds,
      classNames: s.classIds.map((id) => classById(id)?.name ?? "").filter(Boolean).join(", "),
      schedule: scheduleLabel(s.schedule),
      attendanceCode: s.attendanceCode,
      guardianName: g?.name ?? null,
      guardianPhone: g?.phone1 ?? null,
      enrolledOn: s.enrolledOn,
      memo: s.memo,
      pending: s.status === "pending",
    };
  });

  const classChips = [...classes].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ id: c.id, name: c.name }));
  const enrolledCount = rows.filter((r) => !r.pending).length;
  const pendingCount = rows.length - enrolledCount;

  return (
    <div className="space-y-5">
      <PageHeader
        title="재원생"
        description={`재원 ${enrolledCount}명${pendingCount ? ` · 입학 예정 ${pendingCount}명` : ""} (휴·퇴원생은 따로 봅니다)`}
        actions={
          <>
            {/* TODO: 엑셀(CSV) 내보내기 */}
            <Button variant="secondary">엑셀로 내보내기</Button>
            {/* TODO: 학생 등록 화면 (STU-01) */}
            <Button variant="primary">학생 등록</Button>
          </>
        }
      />
      <StudentTable rows={rows} classes={classChips} />
    </div>
  );
}
