import { Users } from "lucide-react";
import { StudentTable } from "@/components/students/student-table";
import { ComingSoonButton } from "@/components/coming-soon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/panel";
import { loadAdminStudents } from "@/lib/data/students";

// 재원생 목록 (STU-06). 10/7부터 실제 DB에서 읽는다 (시험 모드에서만 가상 데이터, src/lib/data/source.ts)
// 매 요청마다 새로 읽는다 (원장님이 고친 내용이 바로 보이게)
export const dynamic = "force-dynamic";

export default async function AdminStudents({ searchParams }: PageProps<"/admin/students">) {
  // 바로 열기: /admin/students?edit=<학생 id> → 그 학생 수정 창을 연 채로 시작
  const { edit } = await searchParams;
  const { rows, classes } = await loadAdminStudents();

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
            {/* 열리기 전에는 누르면 날짜 안내 (일별 계획: 내보내기 10/22, 학생 등록 10/12) */}
            <ComingSoonButton variant="secondary" feature="엑셀 내보내기" opensOn="10/22">
              엑셀로 내보내기
            </ComingSoonButton>
            <ComingSoonButton variant="primary" feature="학생 등록" opensOn="10/12">
              학생 등록
            </ComingSoonButton>
          </>
        }
      />
      {rows.length === 0 ? (
        <div className="surface">
          <EmptyState icon={Users} title="아직 등록된 학생이 없어요" description="위의 [학생 등록]으로 첫 학생을 등록해 주세요" />
        </div>
      ) : (
        <StudentTable students={rows} classes={classes} initialEditId={initialEditId} />
      )}
    </div>
  );
}
