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
import { MCARD } from "@/components/mobile/styles";
import { Button } from "@/components/ui/button";
import { studentDay, type DayStatus } from "@/lib/attendance";
import { cn } from "@/lib/cn";
import { STATUS_CARD_CLASS, statusColor } from "@/lib/status-colors";
import { addMinutes, formatDateKo, nowTimeKST, todayKST, weekdayOf, WEEKDAY_KO } from "@/lib/date";
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

  // 오늘 타임라인 (10/9 학원 알림 앱 패턴): 오늘 일어난 일을 시간순으로 — 등원 → 숙제 제출 → 하원 → 선생님 메시지
  // 이미 화면에 있던 오늘 출결·숙제·메시지를 합쳐 시각 순서로만 늘어놓는다 (새 데이터 없음). 시각을 모르는 일은 넣지 않는다
  const nowKey = `${date} ${now}`;
  const timeline: TimelineItem[] = [];
  if (day.record?.checkInAt) timeline.push({ key: "in", time: day.record.checkInAt, tone: "ok", title: "등원했어요" });
  for (const hw of homeworkOfStudent(student.id)) {
    const sub = submissionOf(hw.id, student.id);
    if (sub && sub.submittedAt.startsWith(date) && sub.submittedAt <= nowKey) {
      timeline.push({ key: `hw-${hw.id}`, time: sub.submittedAt.slice(11, 16), tone: "ok", title: "숙제를 제출했어요", detail: hw.title, href: "/parent/homework" });
    }
  }
  if (day.record?.checkOutAt) timeline.push({ key: "out", time: day.record.checkOutAt, tone: "info", title: "하원했어요" });
  for (const m of allMessages) {
    if (m.from !== "parent" && m.sentAt.startsWith(date) && m.sentAt <= nowKey) {
      timeline.push({
        key: `msg-${m.id}`,
        time: m.sentAt.slice(11, 16),
        tone: "ink",
        title: `${m.from === "admin" ? "원장님" : `${m.senderName} 선생님`} 메시지`,
        detail: m.body.split("\n")[0],
        href: "/parent/messages",
      });
    }
  }
  timeline.sort((x, y) => x.time.localeCompare(y.time));

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

      <TodayTimeline items={timeline} />

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
      return { title: "아직 등원 전이에요", detail: classTime };
    default:
      return { title: "오늘은 수업이 없어요" };
  }
}

type TimelineItem = { key: string; time: string; tone: "ok" | "info" | "ink"; title: string; detail?: string; href?: string };

// 점 색은 상태 토큰만: 등원·제출 초록, 하원 파랑, 메시지 진한 회색
const DOT: Record<TimelineItem["tone"], string> = { ok: "bg-status-ok-fg", info: "bg-info", ink: "bg-ink" };

/** 오늘 타임라인: 왼쪽 시각 · 세로선 위 점 · 내용. 오래된 것부터 아래로 (오늘 하루를 위에서 아래로 읽는다) */
function TodayTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <MobileSection title="오늘">
      {items.length === 0 ? (
        <p className={cn(MCARD, "text-body text-sub")}>오늘은 아직 소식이 없어요.</p>
      ) : (
        <ol className={cn(MCARD, "py-4")} aria-label="오늘 타임라인">
          {items.map((it, i) => {
            const body = (
              <>
                <span className="w-12 shrink-0 pt-0.5 text-caption text-sub tabular">{it.time}</span>
                {/* 세로선 + 점 (마지막 항목은 선 없음) */}
                <span className="relative flex w-3 shrink-0 justify-center self-stretch" aria-hidden>
                  {i < items.length - 1 && <span className="absolute top-3 -bottom-4 w-px bg-line" />}
                  <span className={cn("relative mt-1.5 size-2.5 rounded-full ring-4 ring-card", DOT[it.tone])} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-ink">{it.title}</span>
                  {it.detail && <span className="block truncate text-caption text-sub">{it.detail}</span>}
                </span>
                {it.href && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-faint">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                )}
              </>
            );
            return (
              <li key={it.key} className="pb-4 last:pb-0">
                {it.href ? (
                  <Link href={it.href} className="-mx-2 flex items-start gap-3 rounded-[var(--radius-control)] px-2 py-1 active:bg-bg">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 py-1">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </MobileSection>
  );
}
