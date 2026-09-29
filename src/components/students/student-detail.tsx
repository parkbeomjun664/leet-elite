"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Radio, Textarea } from "@/components/ui/field";
import { EmptyLine, InfoList } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/segment";
import { addMinutes, WEEKDAY_KO } from "@/lib/date";
import { DAY_STATUS_LABEL, type StudentDay } from "@/lib/attendance";
import { cn } from "@/lib/cn";

// 학생 상세 패널 (HOME-06): 선생님 첫 화면에서 학생 이름을 누르면 오른쪽에 열린다.
// 수업 정보 · 숙제(최근 5개 + 이 학생에게 바로 숙제 등록) · 학부모 메시지(예약 발송)

export type StudentDetailData = {
  classNames: string[];
  guardians: { name: string; phone: string }[];
  homework: { id: string; kind: "general" | "daily"; title: string; createdOn: string; submitted: boolean; hasFeedback: boolean }[];
  messages: { id: string; from: "parent" | "teacher" | "admin"; senderName: string; body: string; sentAt: string }[];
};

type TabKey = "info" | "homework" | "message";

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
  const [tab, setTab] = useState<TabKey>("info");
  return (
    <div>
      <div className="sticky top-0 z-10 bg-card px-2">
        <Tabs<TabKey>
          value={tab}
          onChange={setTab}
          items={[
            { key: "info", label: "수업 정보" },
            { key: "homework", label: "숙제", count: data.homework.length },
            { key: "message", label: "학부모 메시지", count: data.messages.length },
          ]}
        />
      </div>
      <div className="px-5 py-5">
        {tab === "info" && <InfoTab day={day} data={data} onOpenAttendance={onOpenAttendance} />}
        {tab === "homework" && <HomeworkTab data={data} homeworkHref={homeworkHref} />}
        {tab === "message" && <MessageTab data={data} />}
      </div>
    </div>
  );
}

function InfoTab({ day, data, onOpenAttendance }: { day: StudentDay; data: StudentDetailData; onOpenAttendance: () => void }) {
  const { student, slot, record, status } = day;
  const schedule = [...student.schedule].sort((a, b) => a.weekday - b.weekday);
  return (
    <div className="space-y-6">
      {/* 오늘 출결 요약 */}
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-bg/60 px-4 py-3">
        <div className="text-[15px] tabular">
          <p className="font-semibold">
            오늘 {slot ? `${slot.start} ~ ${addMinutes(slot.start, slot.durationMin)}` : "수업 없음"}
          </p>
          <p className="mt-0.5 text-sub">
            등원 {record?.checkInAt ?? "–"} · 하원 {record?.checkOutAt ?? "–"} · {DAY_STATUS_LABEL[status]}
          </p>
        </div>
        <Button variant="primary" onClick={onOpenAttendance}>
          출결 입력
        </Button>
      </div>

      <InfoList
        items={[
          { label: "학교·학년", value: [student.school, student.grade].filter(Boolean).join(" ") || "–" },
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
          { label: "사용 프로그램", value: student.programs.length ? student.programs.join(" · ") : "–" },
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
    </div>
  );
}

function HomeworkTab({ data, homeworkHref }: { data: StudentDetailData; homeworkHref: string }) {
  const [useToday, setUseToday] = useState(true);
  const [sent, setSent] = useState(false);
  const recent = data.homework.slice(0, 5);
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-bold">최근 숙제</h3>
          <Link href={homeworkHref} className="text-sm font-semibold text-brand hover:underline">
            더보기 →
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyLine>올린 숙제가 없습니다.</EmptyLine>
        ) : (
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {recent.map((h) => (
              <li key={h.id} className="flex items-center gap-2.5 py-2.5">
                <Badge tone={h.kind === "daily" ? "info" : "neutral"}>{h.kind === "daily" ? "매일" : "일반"}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{h.title}</p>
                  <p className="text-sm text-sub tabular">{h.createdOn}</p>
                </div>
                <Badge tone={h.submitted ? "ok" : "warn"}>{h.submitted ? "제출" : "미제출"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 이 학생에게 바로 숙제 등록 (대상 선택 없음, HOME-06) */}
      <section className="rounded-[var(--radius-card)] border border-line p-4">
        <h3 className="mb-3 text-base font-bold">이 학생에게 숙제 등록</h3>
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
            <Field label="제목" htmlFor="hw-title" hint={useToday ? "비워 두면 오늘 날짜가 제목이 됩니다" : undefined}>
              <Input id="hw-title" placeholder={useToday ? "예: 9/30 숙제" : "숙제 제목"} />
            </Field>
            <Checkbox label="오늘 날짜 사용" checked={useToday} onChange={(e) => setUseToday(e.target.checked)} />
            <Field label="내용" htmlFor="hw-body" required>
              <Textarea id="hw-body" rows={3} required placeholder="예: 워크북 p.24~27 풀고 채점까지 사진으로 올리기" />
            </Field>
            <Button type="submit" variant="primary" className="w-full">
              숙제 등록
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

function MessageTab({ data }: { data: StudentDetailData }) {
  const [scheduled, setScheduled] = useState(false);
  return (
    <div className="flex min-h-full flex-col gap-4">
      {data.messages.length === 0 ? (
        <EmptyLine>아직 주고받은 메시지가 없습니다.</EmptyLine>
      ) : (
        <ul className="space-y-3">
          {data.messages.map((m) => {
            const mine = m.from !== "parent";
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
        className="mt-auto space-y-3 border-t border-line pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          // TODO(5단계): 메시지 발송·예약 발송 (MSG-02, MSG-04)
        }}
      >
        <Textarea aria-label="메시지 내용" rows={3} placeholder="학부모님께 보낼 메시지를 입력하세요" />
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox label="예약 발송" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
          {scheduled && <Input type="datetime-local" aria-label="보낼 시각" className="w-auto" />}
          <Button type="submit" variant="primary" className="ml-auto">
            {scheduled ? "예약하기" : "보내기"}
          </Button>
        </div>
      </form>
    </div>
  );
}
