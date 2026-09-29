import { AttendanceBoard } from "@/components/attendance/attendance-board";
import type { StudentDetailData } from "@/components/students/student-detail";
import { sortDays, studentDay } from "@/lib/attendance";
import { formatDateKo, nowTimeKST, todayKST } from "@/lib/date";
import { homeworkOfStudent, messagesOf, submissionOf } from "@/lib/mock/activity";
import { classById, classes, guardiansOf, mockAttendanceFor, studentsOfTeacher, teachers } from "@/lib/mock/data";

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

// TODO(2단계): 로그인한 선생님으로 교체
const demoTeacher = teachers[0];

export default async function TeacherHome({ searchParams }: PageProps<"/teacher">) {
  // 시연용: /teacher?at=18:00 처럼 시각을 지정하면 그 시각 기준으로 보여 준다 (가상 데이터 단계에서만)
  const { at, student, mode } = await searchParams;
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

  // 학생 상세 패널에 필요한 정보만 골라서 넘긴다
  const details: Record<string, StudentDetailData> = Object.fromEntries(
    myStudents.map((s) => [
      s.id,
      {
        classNames: s.classIds.map((id) => classById(id)?.name).filter((n): n is string => !!n),
        guardians: guardiansOf(s.id).map((g) => ({ name: g.name, phone: g.phone1 })),
        homework: homeworkOfStudent(s.id).map((h) => {
          const sub = submissionOf(h.id, s.id);
          return { id: h.id, kind: h.kind, title: h.title, createdOn: h.createdOn, submitted: !!sub, hasFeedback: !!sub?.teacherComment };
        }),
        messages: messagesOf(s.id).map((m) => ({ id: m.id, from: m.from, senderName: m.senderName, body: m.body, sentAt: m.sentAt })),
      },
    ]),
  );

  return (
    <AttendanceBoard
      date={date}
      dateLabel={formatDateKo(date)}
      nowTime={now}
      classes={myClasses}
      days={days}
      details={details}
      homeworkHref="/teacher/homework"
      // 알림 등에서 특정 학생으로 바로 들어올 때: /teacher?student=s010 (&mode=attendance)
      initialOpen={
        typeof student === "string" && details[student]
          ? { studentId: student, mode: mode === "attendance" ? "attendance" : "detail" }
          : null
      }
    />
  );
}
