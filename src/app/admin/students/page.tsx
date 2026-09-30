import type { AdminStudent } from "@/components/students/admin-student-sheet";
import { StudentTable } from "@/components/students/student-table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/panel";
import { classes, guardiansOf, studentById, students } from "@/lib/mock/data";

export default async function AdminStudents({ searchParams }: PageProps<"/admin/students">) {
  // 바로 열기: /admin/students?edit=s003 → 그 학생 수정 창을 연 채로 시작
  const { edit } = await searchParams;

  // 재원생 화면: 재원 + 예정만 (휴·퇴원생은 별도 화면, STU-09)
  const list = students.filter((s) => s.status === "enrolled" || s.status === "pending");

  // 화면에 필요한 값만 골라 넘긴다 (직렬화 가능한 값)
  const rows: AdminStudent[] = list.map((s) => ({
    id: s.id,
    name: s.name,
    school: s.school,
    grade: s.grade,
    phone: s.phone,
    status: s.status,
    enrolledOn: s.enrolledOn,
    leftOn: s.leftOn,
    classIds: [...s.classIds],
    schedule: s.schedule.map((x) => ({ ...x })),
    attendanceCode: s.attendanceCode,
    programs: [...s.programs],
    memo: s.memo,
    guardians: guardiansOf(s.id).map((g) => ({
      id: g.id,
      name: g.name,
      relation: g.relation,
      phone1: g.phone1,
      phone2: g.phone2,
      children: g.studentIds.map((id) => ({ id, name: studentById(id)?.name ?? "알 수 없음" })),
    })),
  }));

  const classChips = [...classes].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => ({ id: c.id, name: c.name }));
  const enrolledCount = rows.filter((r) => r.status === "enrolled").length;
  const pendingCount = rows.length - enrolledCount;
  const initialEditId = typeof edit === "string" && rows.some((r) => r.id === edit) ? edit : null;

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
      <StudentTable students={rows} classes={classChips} initialEditId={initialEditId} />
    </div>
  );
}
