"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Radio, Textarea } from "@/components/ui/field";
import { EmptyLine, InfoList } from "@/components/ui/panel";
import { addMinutes, WEEKDAY_KO, weekdayOf } from "@/lib/date";
import { DAY_STATUS_LABEL, type DayStatus, type StudentDay } from "@/lib/attendance";
import { cn } from "@/lib/cn";

// 학생 상세 (HOME-06). 원장님 원문 순서대로 탭 없이 한 화면에 위에서 아래로:
// 오늘 출결 → 수업 정보(사용 프로그램 선생님 지정) → 최근 2주 출결 → 보강 → 최근 숙제 5개 → 숙제 등록 → 메시지(학부모/학생)
// PC에서는 선생님 홈 오른쪽 칸에 고정으로, 휴대폰에서는 전체 화면 창으로 보인다.

type ChatMessage = { id: string; from: "parent" | "student" | "teacher" | "admin"; senderName: string; body: string; sentAt: string };

export type StudentDetailData = {
  classNames: string[];
  guardians: { name: string; phone: string }[];
  homework: { id: string; kind: "general" | "daily"; title: string; createdOn: string; submitted: boolean; hasFeedback: boolean }[];
  // 학생마다 대화방 두 개: family(학부모) · student(학생). 선생님·원장님은 둘 다 본다 (MSG-04, MSG-05)
  messages: Record<"family" | "student", ChatMessage[]>;
  /** 최근 2주 중 수업이 있었던 날의 출결 (최근 날짜가 위) */
  recentAttendance: { date: string; status: DayStatus; checkInAt: string | null; checkOutAt: string | null }[];
  makeups: { id: string; date: string; start: string; durationMin: number; reason: string; teacher: string }[];
};

export const PROGRAMS = ["클래스카드", "클래스5", "오토보카"] as const;

const STATUS_TONE: Record<DayStatus, Tone> = {
  checked_in: "ok",
  checked_out: "info",
  absent: "brand",
  not_arrived: "warn",
  upcoming: "neutral",
  no_class: "neutral",
};

export function StudentDetail({
  day,
  data,
  homeworkHref,
  onOpenAttendance,
}: {
  day: StudentDay;
  data: StudentDetailData;
  homeworkHref: string;
  onOpenAttendance: () => void;
}) {
  return (
    <div className="divide-y divide-line-soft">
      <TodaySection day={day} onOpenAttendance={onOpenAttendance} />
      <InfoSection day={day} data={data} />
      <RecentAttendanceSection items={data.recentAttendance} />
      <MakeupSection items={data.makeups} />
      <HomeworkSection data={data} homeworkHref={homeworkHref} />
      <HomeworkFormSection key={day.student.id} />
      <MessageSection key={`msg-${day.student.id}`} data={data} />
    </div>
  );
}

/** 구역 하나: 제목 + (오른쪽 링크) + 내용 */
function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-5 py-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-bold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function TodaySection({ day, onOpenAttendance }: { day: StudentDay; onOpenAttendance: () => void }) {
  const { slot, record, status } = day;
  return (
    <section className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[15px] tabular">
          <p className="flex items-center gap-2 font-semibold">
            오늘 {slot ? `${slot.start} ~ ${addMinutes(slot.start, slot.durationMin)}` : "수업 없음"}
            <Badge tone={STATUS_TONE[status]}>{DAY_STATUS_LABEL[status]}</Badge>
          </p>
          <p className="mt-0.5 text-sub">
            등원 {record?.checkInAt ?? "–"} · 하원 {record?.checkOutAt ?? "–"}
            {record?.memo && ` · ${record.memo}`}
          </p>
        </div>
        <Button variant="primary" onClick={onOpenAttendance}>
          출결 입력
        </Button>
      </div>
    </section>
  );
}

function InfoSection({ day, data }: { day: StudentDay; data: StudentDetailData }) {
  const { student } = day;
  const schedule = [...student.schedule].sort((a, b) => a.weekday - b.weekday);
  return (
    <Section title="수업 정보">
      <InfoList
        items={[
          { label: "반", value: data.classNames.join(", ") || "–" },
          {
            label: "수업 시간",
            value: (
              <ul className="space-y-0.5 tabular">
                {schedule.map((s) => (
                  <li key={`${s.weekday}-${s.start}`}>
                    {WEEKDAY_KO[s.weekday]} {s.start} ~ {addMinutes(s.start, s.durationMin)}
                  </li>
                ))}
              </ul>
            ),
          },
          { label: "출결 코드", value: <span className="tabular">{student.attendanceCode}</span> },
          { label: "사용 프로그램", value: <ProgramEditor key={student.id} initial={student.programs} /> },
          {
            label: "보호자",
            value: data.guardians.length ? (
              <ul className="space-y-0.5">
                {data.guardians.map((g) => (
                  <li key={g.name + g.phone}>
                    {g.name} <span className="text-sub tabular">{g.phone}</span>
                  </li>
                ))}
              </ul>
            ) : (
              "–"
            ),
          },
          { label: "메모", value: student.memo || "–" },
        ]}
      />
    </Section>
  );
}

/** 사용 프로그램: 선생님이 체크해서 저장 (원장님 원문 "선생님이 지정") */
function ProgramEditor({ initial }: { initial: string[] }) {
  const [saved, setSaved] = useState<string[]>(initial);
  const [draft, setDraft] = useState<string[]>(initial);
  const [message, setMessage] = useState("");
  const dirty = draft.slice().sort().join() !== saved.slice().sort().join();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {PROGRAMS.map((p) => (
          <Checkbox
            key={p}
            label={p}
            checked={draft.includes(p)}
            onChange={(e) => {
              setMessage("");
              setDraft((prev) => (e.target.checked ? [...prev, p] : prev.filter((x) => x !== p)));
            }}
          />
        ))}
      </div>
      {(dirty || message) && (
        <div className="flex items-center gap-2">
          {dirty && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                // TODO(2단계): 서버 저장 (students.programs, 선생님은 이 필드만 수정 가능)
                setSaved(draft);
                setMessage("저장했습니다");
              }}
            >
              저장
            </Button>
          )}
          {message && <span className="text-sm text-ok">{message}</span>}
        </div>
      )}
    </div>
  );
}

function RecentAttendanceSection({ items }: { items: StudentDetailData["recentAttendance"] }) {
  const absent = items.filter((i) => i.status === "absent").length;
  const missing = items.filter((i) => i.status === "not_arrived").length;
  return (
    <Section
      title="최근 2주 출결"
      aside={
        <span className="text-sm text-sub tabular">
          수업 {items.length}회 · 결석 {absent} · 미등원 {missing}
        </span>
      }
    >
      {items.length === 0 ? (
        <EmptyLine>최근 2주 동안 수업이 없었습니다.</EmptyLine>
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.date} className="flex items-center justify-between gap-2 border-b border-line-soft py-2 text-[15px] tabular">
              <span>
                {Number(i.date.slice(5, 7))}/{Number(i.date.slice(8))} ({WEEKDAY_KO[weekdayOf(i.date)]})
              </span>
              <span className="text-sm text-sub">
                {i.checkInAt ?? "–"} ~ {i.checkOutAt ?? "–"}
              </span>
              <Badge tone={STATUS_TONE[i.status]}>{DAY_STATUS_LABEL[i.status]}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function MakeupSection({ items }: { items: StudentDetailData["makeups"] }) {
  return (
    <Section title="보강 일정">
      {items.length === 0 ? (
        <EmptyLine>예정된 보강이 없습니다.</EmptyLine>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 text-[15px] tabular">
              <span className="font-semibold">
                {Number(m.date.slice(5, 7))}/{Number(m.date.slice(8))} ({WEEKDAY_KO[weekdayOf(m.date)]}) {m.start} ~ {addMinutes(m.start, m.durationMin)}
              </span>
              <span className="truncate text-sm text-sub">
                {m.reason} · {m.teacher}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function HomeworkSection({ data, homeworkHref }: { data: StudentDetailData; homeworkHref: string }) {
  const recent = data.homework.slice(0, 5);
  return (
    <Section
      title="최근 숙제"
      aside={
        <Link href={homeworkHref} className="text-sm font-semibold text-brand hover:underline">
          더보기 →
        </Link>
      }
    >
      {recent.length === 0 ? (
        <EmptyLine>올린 숙제가 없습니다.</EmptyLine>
      ) : (
        <ul className="divide-y divide-line-soft border-y border-line-soft">
          {recent.map((h) => (
            <li key={h.id} className="flex items-center gap-2.5 py-2.5">
              <Badge tone={h.kind === "daily" ? "info" : "neutral"}>{h.kind === "daily" ? "매일" : "일반"}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{h.title}</p>
                <p className="text-sm text-sub tabular">
                  {h.createdOn}
                  {h.hasFeedback && " · 코멘트 남김"}
                </p>
              </div>
              <Badge tone={h.submitted ? "ok" : "warn"}>{h.submitted ? "제출" : "미제출"}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** 이 학생에게 바로 숙제 등록 (대상 선택 없음, HOME-06) */
function HomeworkFormSection() {
  const [useToday, setUseToday] = useState(true);
  const [sent, setSent] = useState(false);
  // 같은 화면에 상세가 두 번 그려질 수 있어서(PC 칸·휴대폰 창) 입력칸 id를 겹치지 않게 만든다
  const uid = useId();
  return (
    <Section title="이 학생에게 숙제 등록">
      {sent ? (
        <div className="space-y-3">
          <p className="text-[15px] text-ok">숙제를 등록했습니다. (시연용 · 저장되지 않음)</p>
          <Button size="sm" onClick={() => setSent(false)}>
            하나 더 등록
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            // TODO(4단계): 숙제 저장 (HW-01), 대상 = 이 학생
            setSent(true);
          }}
        >
          <div className="flex gap-5">
            <Radio name="hw-kind" label="일반 숙제" defaultChecked />
            <Radio name="hw-kind" label="매일 숙제" />
          </div>
          <Field label="제목" htmlFor={`${uid}-title`} hint={useToday ? "비워 두면 오늘 날짜가 제목이 됩니다" : undefined}>
            <Input id={`${uid}-title`} placeholder={useToday ? "예: 10/1 숙제" : "숙제 제목"} />
          </Field>
          <Checkbox label="오늘 날짜 사용" checked={useToday} onChange={(e) => setUseToday(e.target.checked)} />
          <Field label="내용" htmlFor={`${uid}-body`} required>
            <Textarea id={`${uid}-body`} rows={3} required placeholder="예: 워크북 p.24~27 풀고 채점까지 사진으로 올리기" />
          </Field>
          <Button type="submit" variant="primary" className="w-full">
            숙제 등록
          </Button>
        </form>
      )}
    </Section>
  );
}

function MessageSection({ data }: { data: StudentDetailData }) {
  const [scheduled, setScheduled] = useState(false);
  // 학부모 대화방과 학생 대화방은 따로다. 학생은 학부모 대화를 볼 수 없다
  const [room, setRoom] = useState<"family" | "student">("family");
  const list = data.messages[room];
  return (
    <Section title="메시지">
      <div className="space-y-4">
        <div className="flex gap-1 rounded-[var(--radius-control)] bg-line-soft p-1" role="group" aria-label="대화방 선택">
          {(
            [
              ["family", "학부모"],
              ["student", "학생"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={room === key}
              onClick={() => setRoom(key)}
              className={cn(
                "h-9 flex-1 rounded-[var(--radius-control)] text-[15px]",
                room === key ? "bg-card font-semibold text-ink shadow-[0_1px_2px_rgba(40,20,20,0.08)]" : "text-sub hover:text-ink",
              )}
            >
              {label} <span className="text-sm tabular opacity-70">{data.messages[key].length}</span>
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyLine>아직 주고받은 메시지가 없습니다.</EmptyLine>
        ) : (
          <ul className="space-y-3">
            {list.map((m) => {
              const mine = m.from === "teacher" || m.from === "admin";
              return (
                <li key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                  <span className="mb-1 text-sm text-sub">
                    {m.senderName} · <span className="tabular">{m.sentAt.slice(5)}</span>
                  </span>
                  <p
                    className={cn(
                      "max-w-[85%] rounded-[var(--radius-card)] px-3.5 py-2.5 text-[15px] leading-relaxed",
                      mine ? "bg-brand-tint text-ink" : "border border-line bg-card",
                    )}
                  >
                    {m.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="space-y-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            // TODO(5단계): 메시지 발송·예약 발송 (MSG-02, MSG-04, MSG-05)
          }}
        >
          <Textarea
            aria-label="메시지 내용"
            rows={3}
            placeholder={room === "family" ? "학부모님께 보낼 메시지를 입력하세요" : "학생에게 보낼 메시지를 입력하세요"}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox label="예약 발송" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
            {scheduled && <Input type="datetime-local" aria-label="보낼 시각" className="w-auto" />}
            <Button type="submit" variant="primary" className="ml-auto">
              {scheduled ? "예약하기" : "보내기"}
            </Button>
          </div>
        </form>
      </div>
    </Section>
  );
}
