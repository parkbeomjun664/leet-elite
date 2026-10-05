"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, TimeSelect } from "@/components/ui/field";
import { useSheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import type { Attendance } from "@/lib/mock/types";

// 출결 입력 창 (ATT-02, ATT-03). 키패드를 안 찍은 학생을 직접 처리하거나, 기록을 고치거나, 결석을 적을 때 쓴다.
// 맨 위에서 [등원] [하원] [결석] 중 하나만 고르면 된다. 시각은 창을 연 시각이 미리 들어가고, 바꿀 수 있다.

type Choice = "in" | "out" | "absent";

const CHOICES: { key: Choice; label: string; hint: string }[] = [
  { key: "in", label: "등원", hint: "지금 왔어요" },
  { key: "out", label: "하원", hint: "수업 끝나고 갔어요" },
  { key: "absent", label: "결석", hint: "오늘 안 와요" },
];

/** 지금 기록을 보고 처음에 고를 칸을 정한다: 결석 → 결석, 등원만 있음·하원까지 있음 → 하원, 기록 없음 → 등원 */
function initialChoice(record: Attendance | null): Choice {
  if (record?.status === "absent") return "absent";
  if (record?.checkInAt) return "out";
  return "in";
}

export function AttendanceForm({
  studentId,
  date,
  nowTime,
  record,
  onSave,
  onCancel,
}: {
  studentId: string;
  date: string;
  nowTime: string; // 창을 연 시각 (시연 중이면 시연 시각)
  record: Attendance | null;
  onSave: (next: Attendance) => void;
  /** 창(Sheet) 밖에서 쓸 때만. 창 안에서는 창의 닫힘 움직임으로 닫힌다 */
  onCancel?: () => void;
}) {
  const closeSheet = useSheetClose();
  const close = () => (onCancel ? onCancel() : closeSheet());
  const [choice, setChoice] = useState<Choice>(initialChoice(record));
  const [checkIn, setCheckIn] = useState(record?.checkInAt ?? nowTime);
  const [checkOut, setCheckOut] = useState(record?.checkOutAt ?? nowTime);
  const [memo, setMemo] = useState(record?.memo ?? "");

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        // TODO(3단계): 서버에 저장 (attendance, method = manual)
        onSave({
          studentId,
          date,
          checkInAt: choice === "absent" ? null : checkIn,
          checkOutAt: choice === "out" ? checkOut : null,
          status: choice === "absent" ? "absent" : "present",
          memo: memo.trim(),
        });
        // 저장은 누르는 즉시 화면에 반영되므로 창은 바로 닫는다
        close();
      }}
    >
      {/* 하나만 고르는 큰 버튼 3개 */}
      <div role="radiogroup" aria-label="출결" className="grid grid-cols-3 gap-2">
        {CHOICES.map((c) => {
          const on = choice === c.key;
          return (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChoice(c.key)}
              className={cn(
                "press-card rounded-[var(--radius-card)] border px-2 py-3 text-center",
                on ? (c.key === "absent" ? "border-brand bg-brand-tint" : "border-ink bg-card shadow-[inset_0_0_0_0.5px_var(--color-ink)]") : "border-line hover:bg-bg",
              )}
            >
              <span className={cn("block text-heading font-bold", on && c.key === "absent" && "text-brand")}>{c.label}</span>
              <span className="text-caption text-sub">{c.hint}</span>
            </button>
          );
        })}
      </div>

      {choice !== "absent" && (
        <TimeField label="등원 시각" value={checkIn} onChange={setCheckIn} onNow={() => setCheckIn(nowTime)} />
      )}
      {choice === "out" && <TimeField label="하원 시각" value={checkOut} onChange={setCheckOut} onNow={() => setCheckOut(nowTime)} />}

      <Field
        label={choice === "absent" ? "결석 사유" : "비고"}
        htmlFor="att-memo"
        hint={choice === "absent" ? "예: 감기, 학교 행사" : "예: 병원 진료로 30분 늦음"}
      >
        <Input id="att-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="필요할 때만 적어 주세요" />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="lg" className="flex-1">
          {choice === "in" ? "등원 처리" : choice === "out" ? "하원 처리" : "결석 처리"}
        </Button>
        <Button size="lg" onClick={close}>
          취소
        </Button>
      </div>
    </form>
  );
}

/** 시각 입력: 미리 채워진 시각을 그대로 두거나 눌러서 바꾼다. [지금]은 창을 연 시각으로 */
function TimeField({ label, value, onChange, onNow }: { label: string; value: string; onChange: (v: string) => void; onNow: () => void }) {
  const id = `att-${label}`;
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        <TimeSelect id={id} label={label} value={value} onChange={onChange} size="lg" />
        <Button onClick={onNow}>지금</Button>
      </div>
    </Field>
  );
}
