import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Radio, Textarea } from "@/components/ui/field";
import { Segment } from "@/components/ui/segment";
import { addMinutes, nowTimeKST, todayKST, WEEKDAY_KO, weekdayOf } from "@/lib/date";
import { DAY_STATUS_LABEL, type DayStatus, type StudentDay } from "@/lib/attendance";
import { cn } from "@/lib/cn";
import { mockSave } from "@/lib/mock/save";
import { toast } from "@/lib/toast";
import { useOptimisticSave } from "@/lib/use-optimistic-save";

// 학생 상세 (HOME-06). 탭 없이 한 화면에 위에서 아래로:
// 오늘 출결 → 수업 정보(2열 표) → 메시지 미니 창 → 보강 → 최근 숙제 5개 → 숙제 등록
// 10/2 원장님 요청: 수업 정보는 2열 표로 짧게, 최근 2주 출결은 빼고 그 자리에 메시지 창
// PC에서는 선생님 홈 오른쪽 칸에 고정으로, 휴대폰에서는 전체 화면 창으로 보인다.
// "use client"는 붙이지 않는다. 클라이언트 부품(attendance-board) 안에서만 쓰여서 함수 props(onOpenAttendance)를 받을 수 있다

type ChatMessage = { id: string; from: "parent" | "student" | "teacher" | "admin"; senderName: string; body: string; sentAt: string };

export type StudentDetailData = {
  classNames: string[];
  guardians: { name: string; phone: string }[];
  homework: { id: string; kind: "general" | "daily"; title: string; createdOn: string; submitted: boolean; hasFeedback: boolean }[];
  // 학생마다 대화방 두 개: family(학부모) · student(학생). 선생님·원장님은 둘 다 본다 (MSG-04, MSG-05)
  messages: Record<"family" | "student", ChatMessage[]>;
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
  messagesHref,
  onOpenAttendance,
}: {
  day: StudentDay;
  data: StudentDetailData;
  homeworkHref: string;
  messagesHref: string;
  onOpenAttendance: () => void;
}) {
  return (
    // 흰 바탕, 구역 사이는 얇은 구분선만 (박스 없이, 10/2)
    <div className="divide-y divide-line-soft">
      <TodaySection day={day} onOpenAttendance={onOpenAttendance} />
      <InfoSection day={day} data={data} />
      <MessageSection key={`msg-${day.student.id}`} data={data} messagesHref={messagesHref} />
      <MakeupSection items={data.makeups} />
      <HomeworkSection data={data} homeworkHref={homeworkHref} />
      <HomeworkFormSection key={day.student.id} />
    </div>
  );
}

/** 구역 하나: 작은 회색 제목 + 내용. 구역 사이는 바깥의 구분선으로 나눈다 */
function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-5 py-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-caption font-semibold text-sub">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** 구역 안의 "없음" 한 줄 */
function Empty({ children }: { children: ReactNode }) {
  return <p className="text-body text-sub">{children}</p>;
}

function TodaySection({ day, onOpenAttendance }: { day: StudentDay; onOpenAttendance: () => void }) {
  const { slot, record, status } = day;
  return (
    <section className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-body tabular">
          <p className="flex items-center gap-2 font-semibold">
            오늘 {slot ? `${slot.start} ~ ${addMinutes(slot.start, slot.durationMin)}` : "수업 없음"}
            <Badge tone={STATUS_TONE[status]}>{DAY_STATUS_LABEL[status]}</Badge>
          </p>
          <p className="mt-0.5 text-sub">
            등원 {record?.checkInAt ?? "–"} · 하원 {record?.checkOutAt ?? "–"}
            {record?.memo && ` · ${record.memo}`}
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={onOpenAttendance}>
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
      <InfoGrid
        items={[
          { label: "반", value: data.classNames.join(", ") || "–" },
          {
            label: "수업 시간",
            value: (
              <ul className="space-y-0.5 tabular">
                {schedule.map((s) => (
                  <li key={`${s.weekday}-${s.start}`}>
                    {WEEKDAY_KO[s.weekday]} {s.start}~{addMinutes(s.start, s.durationMin)}
                  </li>
                ))}
              </ul>
            ),
          },
          { label: "출결 코드", value: <span className="text-heading font-semibold tracking-wider tabular">{student.attendanceCode}</span> },
          { label: "사용 프로그램", value: <ProgramEditor key={student.id} initial={student.programs} /> },
          {
            label: "보호자",
            value: data.guardians.length ? (
              <ul className="space-y-1">
                {data.guardians.map((g) => (
                  <li key={g.name + g.phone}>
                    {g.name}
                    <span className="block text-caption text-sub tabular">{g.phone}</span>
                  </li>
                ))}
              </ul>
            ) : (
              "–"
            ),
          },
          { label: "메모", value: student.memo || <span className="text-sub">–</span> },
        ]}
      />
    </Section>
  );
}

/** 2열 표: 칸 사이에 가는 선 (원장님 "테이블 줄", 10/2). 칸은 위에 라벨, 아래에 값 */
function InfoGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    // 칸 사이 1px 틈으로 선 색이 비쳐 선이 된다. 바깥 테두리는 없다(테두리 안 테두리 금지, 10/5)
    <dl className="-mx-3 grid grid-cols-2 gap-px overflow-hidden bg-line-soft">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 bg-card px-3 py-2.5">
          <dt className="text-caption text-sub">{it.label}</dt>
          <dd className="mt-1 text-body break-words">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 사용 프로그램: 선생님이 체크해서 저장 (원장님 원문 "선생님이 지정") */
function ProgramEditor({ initial }: { initial: string[] }) {
  const [saved, setSaved] = useState<string[]>(initial);
  const [draft, setDraft] = useState<string[]>(initial);
  const dirty = draft.slice().sort().join() !== saved.slice().sort().join();
  return (
    <div className="space-y-2">
      {/* 배지 모양 토글: 누르면 켜짐(진한 바탕) / 꺼짐(회색). 빨강은 쓰지 않는다 (10/5) */}
      <div className="flex flex-wrap gap-1.5">
        {PROGRAMS.map((p) => {
          const on = draft.includes(p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => setDraft((prev) => (on ? prev.filter((x) => x !== p) : [...prev, p]))}
              className={cn(
                "press h-[26px] rounded-[var(--radius-badge)] px-2 text-caption font-semibold",
                on ? "bg-ink text-white" : "bg-line-soft text-sub hover:text-ink",
              )}
            >
              {on ? "✓ " : ""}
              {p}
            </button>
          );
        })}
      </div>
      {dirty && (
        <Button
          size="sm"
          onClick={() => {
            // TODO(2단계): 서버 저장 (students.programs, 선생님은 이 필드만 수정 가능)
            setSaved(draft);
            toast.success("사용 프로그램을 저장했어요");
          }}
        >
          저장
        </Button>
      )}
    </div>
  );
}

function MakeupSection({ items }: { items: StudentDetailData["makeups"] }) {
  return (
    <Section title="보강 일정">
      {items.length === 0 ? (
        <Empty>예정된 보강이 없습니다.</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 text-body tabular">
              <span className="font-semibold">
                {Number(m.date.slice(5, 7))}/{Number(m.date.slice(8))} ({WEEKDAY_KO[weekdayOf(m.date)]}) {m.start} ~ {addMinutes(m.start, m.durationMin)}
              </span>
              <span className="truncate text-caption text-sub">
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
        <Link href={homeworkHref} className="text-caption font-semibold text-ink hover:underline">
          더보기
        </Link>
      }
    >
      {recent.length === 0 ? (
        <Empty>올린 숙제가 없습니다.</Empty>
      ) : (
        <ul className="-my-1 divide-y divide-line-soft">
          {recent.map((h) => (
            <li key={h.id} className="flex items-center gap-2.5 py-2.5">
              <Badge tone={h.kind === "daily" ? "info" : "neutral"}>{h.kind === "daily" ? "매일" : "일반"}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold">{h.title}</p>
                <p className="text-caption text-sub tabular">
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
          <p className="text-body text-ok">숙제를 등록했습니다. (시연용 · 저장되지 않음)</p>
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
          <Button type="submit" className="w-full">
            숙제 등록
          </Button>
        </form>
      )}
    </Section>
  );
}

/** 미니 창에 보이는 최근 메시지 수 (원장님 요청: 작은 창, 10/2) */
const MINI_MESSAGE_COUNT = 4;

/** 메시지 미니 창: 최근 4개 + 한 줄 입력. 예약 발송·이전 대화는 전체 대화방에서 */
function MessageSection({ data, messagesHref }: { data: StudentDetailData; messagesHref: string }) {
  // 학부모 대화방과 학생 대화방은 따로다. 학생은 학부모 대화를 볼 수 없다
  // 원장님 요청 문구가 "학생과"라서 학생 대화방을 먼저 연다 (학부모 전환은 유지, 원장님 확인 전)
  const [room, setRoom] = useState<"family" | "student">("student");
  const [draft, setDraft] = useState("");
  // 이 화면에서 보낸 메시지 (시연용. 저장 연결 전까지는 새로고침하면 사라짐)
  const [sentList, setSentList] = useState<SentMessage[]>([]);
  // 보내기를 누르면 바로 목록에 붙고(보내는 중), 저장이 끝나면 확정. 실패하면 빠지고 쓴 글은 입력칸에 돌아온다
  // TODO(5단계): mockSave → 메시지 발송 (MSG-04, MSG-05). 예약 발송(MSG-02)은 전체 대화방에서
  const { value: shownSent, run: send } = useOptimisticSave<SentMessage[], SentMessage>({
    state: sentList,
    setState: setSentList,
    apply: (s, m) => [...s, m],
    save: () => mockSave(),
    successMessage: () => "메시지를 보냈어요",
    errorMessage: () => "메시지를 보내지 못했어요. 다시 보내 주세요",
  });
  const confirmed = new Set(sentList.map((m) => m.id));
  const list = [...data.messages[room], ...shownSent.filter((m) => m.room === room)];
  const recent = list.slice(-MINI_MESSAGE_COUNT);
  const hidden = list.length - recent.length;
  return (
    <Section
      title="메시지"
      aside={
        <Link href={messagesHref} className="text-caption font-semibold text-ink hover:underline">
          전체 보기
        </Link>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-1" role="group" aria-label="대화방 선택">
          {(
            [
              ["student", "학생"],
              ["family", "학부모"],
            ] as const
          ).map(([key, label]) => (
            <Segment key={key} active={room === key} onClick={() => setRoom(key)} count={data.messages[key].length}>
              {label}
            </Segment>
          ))}
        </div>

        {recent.length === 0 ? (
          <Empty>아직 주고받은 메시지가 없어요. 아래에서 첫 메시지를 보내 보세요.</Empty>
        ) : (
          <>
            {hidden > 0 && <p className="text-caption text-sub">이전 메시지 {hidden}개는 전체 보기에서 볼 수 있어요.</p>}
            <ul className="space-y-2.5">
              {recent.map((m) => {
                const mine = m.from === "teacher" || m.from === "admin";
                const sending = "room" in m && !confirmed.has(m.id);
                return (
                  <li key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start", "room" in m && "animate-toast-in")}>
                    <span className="mb-0.5 text-caption text-sub">
                      {m.senderName} <span className="tabular">{sending ? "보내는 중" : shortDateTime(m.sentAt)}</span>
                    </span>
                    <p
                      className={cn(
                        "max-w-[88%] rounded-[var(--radius-card)] px-3 py-2 text-body leading-relaxed transition-opacity duration-[var(--duration-fast)]",
                        // 학원 쪽은 회색 한 단계 진하게. 분홍(brand-tint)은 결석 분홍과 헷갈려서 쓰지 않는다 (10/5)
                        mine ? "bg-line-soft text-ink" : "bg-bg",
                        sending && "opacity-60",
                      )}
                    >
                      {m.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <form
          className="flex gap-2 pt-1"
          onSubmit={async (e) => {
            e.preventDefault();
            const body = draft.trim();
            if (!body) return;
            setDraft("");
            const ok = await send({ id: `sent-${Date.now()}`, room, from: "teacher", senderName: "나", body, sentAt: nowStamp() });
            // 실패하면 쓴 글을 입력칸에 돌려놓는다 (다시 쓰지 않게)
            if (!ok) setDraft((cur) => cur || body);
          }}
        >
          <Input
            aria-label="메시지 내용"
            required
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={room === "family" ? "학부모님께 메시지" : "학생에게 메시지"}
            className="min-w-0 flex-1"
          />
          <Button type="submit">보내기</Button>
        </form>
      </div>
    </Section>
  );
}

type SentMessage = ChatMessage & { room: "family" | "student" };

/** 지금 한국 시각 "YYYY-MM-DD HH:MM" */
function nowStamp() {
  return `${todayKST()} ${nowTimeKST()}`;
}

/** "2026-10-05 12:05" → "10/5 12:05" */
function shortDateTime(sentAt: string) {
  const [date, time] = sentAt.split(" ");
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8))} ${time}`;
}
