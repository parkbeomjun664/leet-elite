import Link from "next/link";
import { ChildSwitcher } from "@/components/mobile/child-switcher";
import { DayStatusBadge, HomeworkList, MakeupList, MessageList, type HomeworkItem, type MakeupItem, type MessageItem } from "@/components/mobile/mobile-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { studentDay } from "@/lib/attendance";
import { cn } from "@/lib/cn";
import { addDays, addMinutes, formatDateKo, nowTimeKST, todayKST, weekdayOf, WEEKDAY_KO } from "@/lib/date";
import { homeworkOfStudent, makeupsOf, messagesOf, submissionOf } from "@/lib/mock/activity";
import { classById, guardians, mockAttendanceFor, studentById, teacherById } from "@/lib/mock/data";

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

// TODO(2단계): 로그인한 보호자로 교체. 지금은 자녀가 두 명 이상인 첫 보호자 (layout.tsx와 같은 규칙)
const demoGuardian = guardians.find((g) => g.studentIds.length > 1)!;

/** "2026-09-30" → "9/30 (수)" */
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))} (${WEEKDAY_KO[weekdayOf(date)]})`;

// 주간 시간표 칸: 월~토 (일요일 수업은 없다)
const WEEK = [1, 2, 3, 4, 5, 6];

// 학부모 첫 화면 (HOME-10): 자녀 선택, 오늘 등원·하원, 시간표, 숙제, 보강, 결석 신청, 메시지
export default async function ParentHome({ searchParams }: PageProps<"/parent">) {
  const { at, child } = await searchParams;
  // 시연용: /parent?at=17:30 처럼 시각을 지정하면 그 시각 기준으로 보여 준다 (가상 데이터 단계에서만)
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;

  // 연결된 자녀만 고를 수 있다 (다른 ID가 오면 첫 자녀). 실제 권한은 2단계에서 RLS로 검증
  const children = demoGuardian.studentIds.map((id) => studentById(id)).filter((s) => s !== null);
  const student = children.find((s) => s.id === child) ?? children[0];

  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const day = studentDay(student, mockAttendanceFor(date, now), date, now);
  const today = weekdayOf(date);

  // 반·담당 선생님 (학부모에게는 닉네임만 보인다)
  const classLine = student.classIds
    .map((id) => classById(id))
    .filter((c) => c !== null)
    .map((c) => {
      const nickname = teacherById(c.teacherId)?.nickname;
      return nickname ? `${c.name} · ${nickname} 선생님` : c.name;
    })
    .join(", ");

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

  // 학생별 대화방 최근 2개 + 학원이 보낸 것 중 안 읽은 수 (MSG-04)
  const allMessages = messagesOf(student.id).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const unread = allMessages.filter((m) => m.from !== "parent" && !m.read).length;
  const messageItems: MessageItem[] = allMessages.slice(0, 2).map((m) => ({
    id: m.id,
    senderName: m.from === "admin" ? "원장님" : `${m.senderName} 선생님`,
    fromMe: m.from === "parent",
    body: m.body,
    timeLabel: `${shortDate(m.sentAt.slice(0, 10)).split(" ")[0]} ${m.sentAt.slice(11)}`,
    unread: m.from !== "parent" && !m.read,
  }));

  // 새 알림 (맨 위 줄): 오늘 등원·하원, 안 읽은 학원 메시지, 새 선생님 코멘트. 최근 것부터 3개
  // TODO(NOTI): 읽음 기록이 생기면 "읽지 않은 알림"만 보여 준다. 지금 코멘트는 어제·오늘 제출분 기준
  const nowKey = `${date} ${now}`;
  const alerts: AlertItem[] = [];
  if (day.record?.checkOutAt) alerts.push({ key: "out", sortKey: `${date} ${day.record.checkOutAt}`, tone: "info", text: `${student.name} 학생 하원했습니다`, time: day.record.checkOutAt });
  if (day.record?.checkInAt) alerts.push({ key: "in", sortKey: `${date} ${day.record.checkInAt}`, tone: "ok", text: `${student.name} 학생 등원했습니다`, time: day.record.checkInAt });
  const unreadFromAcademy = allMessages.filter((m) => m.from !== "parent" && !m.read);
  if (unreadFromAcademy.length > 0) {
    alerts.push({ key: "msg", sortKey: unreadFromAcademy[0].sentAt, tone: "brand", text: `새 메시지 ${unreadFromAcademy.length}건`, href: "/parent/messages" });
  }
  const newComments = homeworkOfStudent(student.id)
    .map((hw) => submissionOf(hw.id, student.id))
    .filter((sub) => sub?.teacherComment && sub.submittedAt >= addDays(date, -1) && sub.submittedAt <= nowKey)
    .map((sub) => sub!.submittedAt)
    .sort()
    .reverse();
  if (newComments.length > 0) {
    alerts.push({ key: "comment", sortKey: newComments[0], tone: "info", text: `선생님 코멘트 ${newComments.length}건`, href: "/parent/homework" });
  }
  alerts.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  return (
    <div className="space-y-6">
      {/* 자녀 선택 + 자녀 정보 */}
      <section className="space-y-3">
        <ChildSwitcher items={children.map((s) => ({ id: s.id, name: s.name }))} selectedId={student.id} />
        <div>
          <h1 className="text-xl leading-tight font-bold">{student.name}</h1>
          <p className="mt-1 text-[15px] text-sub">{[student.school, student.grade, classLine].filter(Boolean).join(" · ")}</p>
        </div>
        <NewAlerts items={alerts.slice(0, 3)} />
      </section>

      {/* 오늘 등원·하원 (ATT-08) */}
      <Panel
        title="오늘 등원·하원"
        actions={<span className="text-[15px] text-sub">{formatDateKo(date).slice(6)}</span>}
      >
        {day.slot ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] text-sub tabular">
                수업 {day.slot.start}~{addMinutes(day.slot.start, day.slot.durationMin)}
              </p>
              <DayStatusBadge status={day.status} className="h-8 px-3 text-[15px]" />
            </div>
            {day.status === "absent" ? (
              <p className="mt-3 rounded-[var(--radius-control)] bg-brand-tint px-3 py-2.5 text-[15px] text-brand">
                오늘 결석{day.record?.memo ? ` · ${day.record.memo}` : ""}
              </p>
            ) : (
              <dl className="mt-3 grid grid-cols-2 gap-2">
                <TimeCell label="등원" time={day.record?.checkInAt ?? null} />
                <TimeCell label="하원" time={day.record?.checkOutAt ?? null} />
              </dl>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] text-sub">오늘은 수업이 없습니다.</p>
            <DayStatusBadge status={day.status} />
          </div>
        )}
      </Panel>

      {/* 결석 신청 (ATT-09) */}
      {/* TODO(ATT-09): 날짜·사유 입력 창 → 원장님·담당 선생님 알림, 해당 날짜 출결에 반영 */}
      <Button variant="secondary" size="lg" className="w-full">
        결석 신청
      </Button>

      {/* 이번 주 시간표 */}
      <section>
        <SectionTitle>이번 주 수업</SectionTitle>
        <ol className="grid grid-cols-6 overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
          {WEEK.map((wd) => {
            const slot = student.schedule.find((s) => s.weekday === wd);
            const isToday = wd === today;
            return (
              <li
                key={wd}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 border-l border-line-soft py-2 first:border-l-0",
                  isToday && "bg-brand-tint",
                )}
              >
                <span className={cn("text-[15px] font-bold", isToday ? "text-brand" : slot ? "text-ink" : "text-sub")}>{WEEKDAY_KO[wd]}</span>
                <span className={cn("text-[13px] tabular", slot ? "font-semibold text-ink" : "text-sub")}>{slot ? slot.start : "–"}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 숙제·제출 상태 (HW-06, HW-10) */}
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

      {/* 메시지 (MSG-04) */}
      <section>
        <SectionTitle
          actions={
            <Link href="/parent/messages" className="-my-3 flex min-h-11 items-center gap-2 px-1 text-[15px] font-semibold text-brand">
              {unread > 0 && <Badge tone="brand">새 메시지 {unread}</Badge>}
              전체 보기
            </Link>
          }
        >
          메시지
        </SectionTitle>
        <MessageList items={messageItems} href="/parent/messages" />
      </section>
    </div>
  );
}

// 등원·하원 시각 칸: 기록이 없으면 "–"
function TimeCell({ label, time }: { label: string; time: string | null }) {
  return (
    <div className={cn("rounded-[var(--radius-control)] border px-3 py-2.5", time ? "border-line bg-bg" : "border-line-soft")}>
      <dt className="text-[13px] text-sub">{label}</dt>
      <dd className={cn("text-[22px] leading-tight font-bold tabular", time ? "text-ink" : "text-sub")}>{time ?? "–"}</dd>
    </div>
  );
}

type AlertItem = { key: string; sortKey: string; tone: "ok" | "info" | "brand"; text: string; time?: string; href?: string };

const DOT: Record<AlertItem["tone"], string> = { ok: "bg-ok", info: "bg-info", brand: "bg-brand" };

// 새 알림 줄: 한 줄에 하나. 누를 곳이 있으면 오른쪽에 화살표
function NewAlerts({ items }: { items: AlertItem[] }) {
  if (items.length === 0) {
    return <p className="rounded-[var(--radius-card)] border border-line bg-card px-4 py-3 text-[15px] text-sub">새 알림이 없습니다</p>;
  }
  return (
    <section aria-label="새 알림" className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
      <h2 className="border-b border-line-soft px-4 py-2 text-sm font-semibold text-sub">새 알림</h2>
      <ul className="divide-y divide-line-soft">
        {items.map((a) => {
          const body = (
            <>
              <span className={cn("size-2 shrink-0 rounded-full", DOT[a.tone])} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{a.text}</span>
              {a.time && <span className="shrink-0 text-[15px] text-sub tabular">{a.time}</span>}
              {a.href && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-sub">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              )}
            </>
          );
          return (
            <li key={a.key}>
              {a.href ? (
                <Link href={a.href} className="flex min-h-12 items-center gap-3 px-4 py-2.5 hover:bg-bg/60 active:bg-line-soft">
                  {body}
                </Link>
              ) : (
                <div className="flex min-h-12 items-center gap-3 px-4 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
