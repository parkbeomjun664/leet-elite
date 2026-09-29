import { DayStatusBadge, HomeworkList, MakeupList, MessageList, type HomeworkItem, type MakeupItem, type MessageItem } from "@/components/mobile/mobile-shell";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { studentDay } from "@/lib/attendance";
import { addMinutes, formatDateKo, nowTimeKST, todayKST, weekdayOf, WEEKDAY_KO } from "@/lib/date";
import { homeworkOfStudent, makeupsOf, messagesOf, submissionOf } from "@/lib/mock/activity";
import { classById, mockAttendanceFor, students, teacherById } from "@/lib/mock/data";

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

// TODO(2단계): 로그인한 학생으로 교체. 지금은 숙제가 있는 첫 재원생 (layout.tsx와 같은 규칙)
const demoStudent = students.find((s) => s.status === "enrolled" && homeworkOfStudent(s.id).length > 0)!;

/** "2026-09-30" → "9/30 (수)" */
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))} (${WEEKDAY_KO[weekdayOf(date)]})`;

// 학생 첫 화면 (HOME-09): 오늘 수업·출결, 숙제, 보강, 학원 메시지
export default async function StudentHome({ searchParams }: PageProps<"/student">) {
  // 시연용: /student?at=17:30 처럼 시각을 지정하면 그 시각 기준으로 보여 준다 (가상 데이터 단계에서만)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;

  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const student = demoStudent;
  const day = studentDay(student, mockAttendanceFor(date, now), date, now);
  const className = student.classIds.map((id) => classById(id)?.name).filter(Boolean).join(" · ");

  const homeworkItems: HomeworkItem[] = homeworkOfStudent(student.id).map((hw) => {
    const sub = submissionOf(hw.id, student.id);
    return {
      id: hw.id,
      daily: hw.kind === "daily",
      title: hw.title,
      dateLabel: shortDate(hw.createdOn),
      submitted: sub !== null,
      hasTeacherComment: Boolean(sub?.teacherComment),
    };
  });
  const pending = homeworkItems.filter((h) => !h.submitted).length;

  // 예정된 보강만 (오늘 것은 끝나기 전까지 보여 준다)
  const makeupItems: MakeupItem[] = makeupsOf(student.id)
    .filter((m) => m.status === "scheduled" && (m.date > date || (m.date === date && addMinutes(m.start, m.durationMin) > now)))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .map((m) => ({
      id: m.id,
      dateLabel: shortDate(m.date),
      timeLabel: `${m.start}~${addMinutes(m.start, m.durationMin)}`,
      teacherNickname: teacherById(m.teacherId)?.nickname ?? null,
      reason: m.reason,
      isToday: m.date === date,
    }));

  // 학원(선생님·원장님)이 보낸 메시지 최근 2개 (MSG-05)
  const messageItems: MessageItem[] = messagesOf(student.id)
    .filter((m) => m.from !== "parent")
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, 2)
    .map((m) => ({
      id: m.id,
      senderName: m.from === "admin" ? "원장님" : `${m.senderName} 선생님`,
      fromMe: false,
      body: m.body,
      timeLabel: `${shortDate(m.sentAt.slice(0, 10)).split(" ")[0]} ${m.sentAt.slice(11)}`,
      unread: !m.read,
    }));

  return (
    <div className="space-y-6">
      {/* 인사 */}
      <section>
        <h1 className="text-xl leading-tight font-bold">{student.name} 학생</h1>
        <p className="mt-1 text-[15px] text-sub">{[student.school, student.grade, className].filter(Boolean).join(" · ")}</p>
        {student.programs.length > 0 && (
          <p className="mt-2 text-[15px]">
            <span className="text-sub">사용 프로그램:</span> <span className="font-semibold">{student.programs.join(" · ")}</span>
          </p>
        )}
      </section>

      {/* 오늘 수업·출결 (ATT-08) */}
      <Panel title="오늘" actions={<span className="text-[15px] text-sub">{formatDateKo(date).slice(6)}</span>}>
        {day.slot ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-sub">수업 시간</p>
              <p className="text-lg font-bold tabular">
                {day.slot.start}~{addMinutes(day.slot.start, day.slot.durationMin)}
              </p>
            </div>
            <DayStatusBadge status={day.status} className="h-8 px-3 text-[15px]" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] text-sub">오늘은 수업이 없습니다.</p>
            <DayStatusBadge status={day.status} />
          </div>
        )}
        {day.record?.status === "absent" && day.record.memo && (
          <p className="mt-3 border-t border-line-soft pt-3 text-[15px] text-sub">사유: {day.record.memo}</p>
        )}
        {day.record?.checkInAt && (
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line-soft pt-3 text-[15px]">
            <div>
              <dt className="text-[13px] text-sub">등원</dt>
              <dd className="font-semibold tabular">{day.record.checkInAt ?? "–"}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-sub">하원</dt>
              <dd className="font-semibold tabular">{day.record.checkOutAt ?? "–"}</dd>
            </div>
          </dl>
        )}
      </Panel>

      {/* 숙제 (HW-06, HW-10) */}
      <section>
        <SectionTitle count={homeworkItems.length} actions={pending > 0 && <span className="text-[15px] font-semibold text-warn">미제출 {pending}</span>}>
          숙제
        </SectionTitle>
        <HomeworkList items={homeworkItems} />
      </section>

      {/* 보강 일정 (MKP-04) */}
      <section>
        <SectionTitle>보강 일정</SectionTitle>
        <MakeupList items={makeupItems} />
      </section>

      {/* 학원 메시지 (MSG-05) */}
      <section>
        <SectionTitle>학원 메시지</SectionTitle>
        <MessageList items={messageItems} href="/student/messages" />
      </section>
    </div>
  );
}
