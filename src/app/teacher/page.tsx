import { AttendanceBoard } from "@/components/attendance/attendance-board";
import { sortDays, studentDay } from "@/lib/attendance";
import { formatDateKo, nowTimeKST, todayKST } from "@/lib/date";
import { classes, mockAttendanceFor, studentsOfTeacher, teachers } from "@/lib/mock/data";

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

// TODO(2단계): 로그인한 선생님으로 교체
const demoTeacher = teachers[0];

export default async function TeacherHome({ searchParams }: PageProps<"/teacher">) {
  // 시연용: /teacher?at=18:00 처럼 시각을 지정하면 그 시각 기준으로 보여 준다 (가상 데이터 단계에서만)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;

  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const records = mockAttendanceFor(date, now);

  // 선생님은 담당 반 학생만 본다 (HOME-07). 재원생만
  const myStudents = studentsOfTeacher(demoTeacher.id).filter((s) => s.status === "enrolled");
  const days = myStudents.map((s) => studentDay(s, records, date, now)).sort(sortDays);
  const myClasses = classes
    .filter((c) => c.teacherId === demoTeacher.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ id: c.id, name: c.name }));

  return <AttendanceBoard dateLabel={formatDateKo(date)} classes={myClasses} days={days} />;
}
