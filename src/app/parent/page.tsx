import Link from "next/link";
import { ChildSwitcher } from "@/components/mobile/child-switcher";
import {
  DayStatusBadge,
  StatusBadge,
  HomeworkList,
  MakeupList,
  MessageList,
  MobileSection,
  MobileStickyAction,
  type HomeworkItem,
  type MakeupItem,
  type MessageItem,
} from "@/components/mobile/mobile-shell";
import { MCARD, MCARD_LIST, ROW_DIVIDER } from "@/components/mobile/styles";
import { Button } from "@/components/ui/button";
import { studentDay, type DayStatus } from "@/lib/attendance";
import { cn } from "@/lib/cn";
import { STATUS_CARD_CLASS, statusColor } from "@/lib/status-colors";
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

  const hero = attendanceHeadline(day.status, day.slot, day.record);

  return (
    // 한 화면에 한 가지: 맨 위는 "오늘 등원했는지"만 크게. 나머지는 아래로 (10/2 재디자인)
    <div className="space-y-7">
      <ChildSwitcher items={children.map((s) => ({ id: s.id, name: s.name }))} selectedId={student.id} />

      {/* 오늘 등원·하원 (ATT-08): 화면에서 유일한 강조 블록 */}
      {/* 상태별 바탕: 등원 → 초록, 결석 → 분홍, 그 밖에는 흰 카드 (status-colors.ts) */}
      <section aria-label="오늘 등원·하원" className={cn("rounded-[var(--radius-mcard)] p-5", STATUS_CARD_CLASS[statusColor(day.status)])}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption text-sub">
            {student.name} · 오늘 {formatDateKo(date).slice(6)}
          </p>
          <DayStatusBadge status={day.status} />
        </div>
        <h1 className="mt-2 text-title leading-snug font-bold text-ink tabular">{hero.title}</h1>
        {hero.detail && <p className="mt-1 text-caption text-sub tabular">{hero.detail}</p>}
      </section>

      <NewAlerts items={alerts.slice(0, 3)} />

      {/* 숙제·제출 상태 (HW-06, HW-10) */}
      <MobileSection
        title={`숙제 ${homeworkItems.length}`}
        actions={pending > 0 && <span className="text-caption font-medium text-warn">미제출 {pending}</span>}
      >
        <HomeworkList items={homeworkItems} />
      </MobileSection>

      {/* 이번 주 수업 + 보강 */}
      <MobileSection title={`이번 주 수업 · ${classLine}`}>
        <ol className={cn(MCARD, "grid grid-cols-6 px-3 py-3 text-center")}>
          {WEEK.map((wd) => {
            const slot = student.schedule.find((s) => s.weekday === wd);
            const isToday = wd === today;
            return (
              <li
                key={wd}
                aria-current={isToday ? "date" : undefined}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)]", isToday && "bg-bg")}
              >
                <span className={cn("text-caption", isToday ? "font-bold text-ink" : "text-sub")}>{WEEKDAY_KO[wd]}</span>
                <span className={cn("text-body tabular", slot ? "font-medium text-ink" : "text-faint")}>{slot ? slot.start : "–"}</span>
              </li>
            );
          })}
        </ol>
        {makeupItems.length > 0 && (
          <div className="mt-3">
            <MakeupList items={makeupItems} />
          </div>
        )}
      </MobileSection>

      {/* 메시지 (MSG-04) */}
      <MobileSection
        title="메시지"
        actions={
          <Link href="/parent/messages" className="-my-2 flex min-h-11 items-center gap-2 text-caption font-medium text-ink/70">
            {unread > 0 && <StatusBadge status="upcoming">새 메시지 {unread}</StatusBadge>}
            전체 보기
          </Link>
        }
      >
        <MessageList items={messageItems} href="/parent/messages" />
      </MobileSection>

      {/* 학부모의 주 행동: 결석 신청 (ATT-09). 아래 탭 위에 고정. 빨강은 쓰지 않는다(결석 분홍과 헷갈리지 않게)
          TODO: 날짜·사유 입력 하단 시트 → 원장님·담당 선생님 알림 */}
      <MobileStickyAction>
        <Button size="lg" className="w-full">
          {student.name} 결석 신청하기
        </Button>
      </MobileStickyAction>
    </div>
  );
}

/** 맨 위 큰 문장: 오늘 등원했는지 한 문장으로 */
function attendanceHeadline(
  status: DayStatus,
  slot: { start: string; durationMin: number } | null,
  record: { checkInAt: string | null; checkOutAt: string | null; memo: string } | null,
): { title: string; detail?: string } {
  const classTime = slot ? `수업 ${slot.start}~${addMinutes(slot.start, slot.durationMin)}` : undefined;
  switch (status) {
    case "checked_in":
      return { title: `${record?.checkInAt} 등원했어요`, detail: classTime };
    case "checked_out":
      return { title: `${record?.checkOutAt} 하원했어요`, detail: `등원 ${record?.checkInAt ?? "–"}` };
    case "absent":
      return { title: "오늘 결석이에요", detail: record?.memo || classTime };
    case "not_arrived":
      return { title: "아직 등원하지 않았어요", detail: classTime };
    case "upcoming":
      return { title: "아직 수업 전이에요", detail: classTime };
    default:
      return { title: "오늘은 수업이 없어요" };
  }
}

type AlertItem = { key: string; sortKey: string; tone: "ok" | "info" | "brand"; text: string; time?: string; href?: string };

const DOT: Record<AlertItem["tone"], string> = { ok: "bg-status-ok-fg", info: "bg-info", brand: "bg-ink" };

// 새 알림: 있을 때만 목록으로 (없으면 아무것도 안 보인다)
function NewAlerts({ items }: { items: AlertItem[] }) {
  if (items.length === 0) return null;
  return (
    <MobileSection title="새 알림">
      <ul className={MCARD_LIST}>
        {items.map((a) => {
          const body = (
            <>
              <span className={cn("size-2 shrink-0 rounded-full", DOT[a.tone])} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{a.text}</span>
              {a.time && <span className="shrink-0 text-caption text-sub tabular">{a.time}</span>}
              {a.href && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-faint">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              )}
            </>
          );
          return (
            <li key={a.key} className={ROW_DIVIDER}>
              {a.href ? (
                <Link href={a.href} className="flex min-h-14 items-center gap-3 px-5 py-4 active:bg-bg">
                  {body}
                </Link>
              ) : (
                <div className="flex min-h-14 items-center gap-3 px-5 py-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </MobileSection>
  );
}
