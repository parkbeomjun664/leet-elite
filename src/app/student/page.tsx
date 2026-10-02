import {
  DayStatusBadge,
  HomeworkList,
  MakeupList,
  MessageList,
  MobileSection,
  type HomeworkItem,
  type MakeupItem,
  type MessageItem,
} from "@/components/mobile/mobile-shell";
import { MCARD } from "@/components/mobile/styles";
import { Button } from "@/components/ui/button";
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
    // 지금(또는 시연 시각)보다 뒤에 낸 제출은 아직 없는 것으로 본다 (가상 데이터가 저녁 제출을 미리 만들어 둠)
    const found = submissionOf(hw.id, student.id);
    const sub = found && found.submittedAt <= `${date} ${now}` ? found : null;
    return {
      id: hw.id,
      daily: hw.kind === "daily",
      title: hw.title,
      dateLabel: shortDate(hw.createdOn),
      submitted: sub !== null,
      hasTeacherComment: Boolean(sub?.teacherComment),
    };
  });
  // 안 낸 숙제는 맨 위 "오늘 할 숙제"로, 낸 숙제는 아래 목록으로 나눈다
  const pendingItems = homeworkItems.filter((h) => !h.submitted);
  const submittedItems = homeworkItems.filter((h) => h.submitted);

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

  // 학생 대화방(학원 ↔ 학생)의 최근 2개. 학부모 대화방은 학생에게 보이지 않는다 (MSG-05, 9/30 결정)
  const messageItems: MessageItem[] = messagesOf(student.id, "student")
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, 2)
    .map((m) => ({
      id: m.id,
      senderName: m.from === "admin" ? "원장님" : `${m.senderName} 선생님`,
      fromMe: m.from === "student",
      body: m.body,
      timeLabel: `${shortDate(m.sentAt.slice(0, 10)).split(" ")[0]} ${m.sentAt.slice(11)}`,
      unread: m.from !== "student" && !m.read,
    }));

  const first = pendingItems[0];
  return (
    // 한 화면에 한 가지: 맨 위는 "오늘 할 숙제"와 [제출하기]만. 나머지는 아래로 (10/2 재디자인)
    <div className="space-y-7">
      {/* 오늘 할 숙제 (HW-06): 화면에서 유일한 강조 블록 */}
      <section aria-label="오늘 할 숙제" className="rounded-[12px] bg-wash p-5">
        {first ? (
          <>
            <p className="text-[13px] text-hint">
              오늘 할 숙제 <span className="font-medium text-brand tabular">{pendingItems.length}개</span>
            </p>
            <h1 className="mt-2 text-[22px] leading-snug font-bold text-ink">{first.title}</h1>
            <p className="mt-1 text-[13px] text-hint tabular">
              {first.daily ? "매일 숙제" : "일반 숙제"} · {first.dateLabel}에 받음
            </p>
            {/* TODO(HW-06): 사진·글을 올리는 제출 화면으로 이동 */}
            <Button variant="primary" size="lg" className="mt-5 h-[52px] w-full text-base">
              제출하기
            </Button>
            {pendingItems.length > 1 && (
              <ul className="mt-4 space-y-1">
                {pendingItems.slice(1).map((hw) => (
                  <li key={hw.id} className="flex min-h-12 items-center justify-between gap-3">
                    <span className="truncate text-[15px] font-medium text-ink">{hw.title}</span>
                    {/* TODO(HW-06): 제출 화면 */}
                    <button type="button" className="h-10 shrink-0 px-2 text-[15px] font-medium text-brand">
                      제출
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="text-[13px] text-hint">오늘 할 숙제</p>
            <h1 className="mt-2 text-[22px] leading-snug font-bold text-ink">
              {homeworkItems.length > 0 ? "모두 냈어요" : "받은 숙제가 없어요"}
            </h1>
          </>
        )}
      </section>

      {/* 오늘 수업 (ATT-08): 수업 시간이 핵심 정보 */}
      <MobileSection title={`오늘 · ${formatDateKo(date).slice(6)}`} actions={<DayStatusBadge status={day.status} />}>
        <div className={MCARD}>
        {day.slot ? (
          <p className="text-[22px] leading-tight font-bold text-ink tabular">
            {day.slot.start}~{addMinutes(day.slot.start, day.slot.durationMin)}
          </p>
        ) : (
          <p className="text-[15px] font-medium text-ink">오늘은 수업이 없어요</p>
        )}
        {day.record?.checkInAt && (
          <p className="mt-1.5 text-[13px] text-hint tabular">
            등원 {day.record.checkInAt} · 하원 {day.record.checkOutAt ?? "–"}
          </p>
        )}
        {day.record?.status === "absent" && (
          <p className="mt-1.5 text-[13px] text-hint">결석{day.record.memo ? ` · ${day.record.memo}` : ""}</p>
        )}
        </div>
        {/* 같은 묶음 안의 카드 사이는 12px */}
        {makeupItems.length > 0 && (
          <div className="mt-3">
            <MakeupList items={makeupItems} />
          </div>
        )}
      </MobileSection>

      {/* 제출한 숙제 (HW-10: 선생님 코멘트 확인) */}
      <MobileSection title={`제출한 숙제 ${submittedItems.length}`}>
        <HomeworkList items={submittedItems} />
      </MobileSection>

      {/* 학원 메시지 (MSG-05) */}
      <MobileSection title="학원 메시지">
        <MessageList items={messageItems} href="/student/messages" />
      </MobileSection>

      {/* 내 정보: 맨 아래 한 줄 */}
      <p className="px-1 pb-2 text-[13px] leading-relaxed text-hint">
        {student.name} · {[student.school, student.grade, className].filter(Boolean).join(" · ")}
        {student.programs.length > 0 && (
          <>
            <br />
            사용 프로그램 · {student.programs.join(", ")}
          </>
        )}
      </p>
    </div>
  );
}
