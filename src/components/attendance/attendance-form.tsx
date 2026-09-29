"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Radio, Select } from "@/components/ui/field";
import type { Attendance, AttendanceStatus } from "@/lib/mock/types";

// 출결 입력 폼 (ATT-02, ATT-03). 키패드 기록을 고치거나, 결석·비고를 적거나, 코드를 잊은 학생을 직접 등록할 때 쓴다.

const HOURS = Array.from({ length: 15 }, (_, i) => String(i + 8).padStart(2, "0")); // 08~22시
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

type Draft = { on: boolean; h: string; m: string };

function toDraft(time: string | null, fallback: string): Draft {
  const [h, m] = (time ?? fallback).split(":");
  // 5분 단위로 맞춘다
  return { on: time !== null, h, m: String(Math.floor(Number(m) / 5) * 5).padStart(2, "0") };
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
  nowTime: string;
  record: Attendance | null;
  onSave: (next: Attendance) => void;
  onCancel: () => void;
}) {
  const [checkIn, setCheckIn] = useState<Draft>(toDraft(record?.checkInAt ?? null, nowTime));
  const [checkOut, setCheckOut] = useState<Draft>(toDraft(record?.checkOutAt ?? null, nowTime));
  const [status, setStatus] = useState<AttendanceStatus>(record?.status ?? "present");
  const [memo, setMemo] = useState(record?.memo ?? "");

  const setNow = (set: (d: Draft) => void) => set(toDraft(nowTime, nowTime));
  const absent = status === "absent";

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        // TODO(3단계): 서버에 저장 (attendance, method = manual)
        onSave({
          studentId,
          date,
          checkInAt: !absent && checkIn.on ? `${checkIn.h}:${checkIn.m}` : null,
          checkOutAt: !absent && checkOut.on ? `${checkOut.h}:${checkOut.m}` : null,
          status,
          memo: memo.trim(),
        });
      }}
    >
      <Field label="상태">
        <div className="flex gap-5 pt-1">
          <Radio name="status" label="정상" checked={status === "present"} onChange={() => setStatus("present")} />
          <Radio name="status" label="결석" checked={status === "absent"} onChange={() => setStatus("absent")} />
          <Radio name="status" label="미등원" checked={status === "not_arrived"} onChange={() => setStatus("not_arrived")} />
        </div>
      </Field>

      <TimeRow label="등원" draft={checkIn} onChange={setCheckIn} onNow={() => setNow(setCheckIn)} disabled={absent} />
      <TimeRow label="하원" draft={checkOut} onChange={setCheckOut} onNow={() => setNow(setCheckOut)} disabled={absent} />

      <Field label="비고" htmlFor="att-memo" hint="예: 병원 진료로 30분 늦음, 학교 행사로 결석">
        <Input id="att-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="필요할 때만 적어 주세요" />
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="primary" size="lg" className="flex-1">
          출결 등록
        </Button>
        <Button size="lg" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}

function TimeRow({
  label,
  draft,
  onChange,
  onNow,
  disabled,
}: {
  label: string;
  draft: Draft;
  onChange: (d: Draft) => void;
  onNow: () => void;
  disabled: boolean;
}) {
  const off = disabled || !draft.on;
  return (
    <div className="space-y-1.5">
      <Checkbox
        label={<span className="font-semibold">{label}</span>}
        checked={draft.on && !disabled}
        disabled={disabled}
        onChange={(e) => onChange({ ...draft, on: e.target.checked })}
      />
      <div className="flex items-center gap-2">
        <Select aria-label={`${label} 시`} value={draft.h} disabled={off} onChange={(e) => onChange({ ...draft, h: e.target.value })} className="w-24 tabular">
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}시
            </option>
          ))}
        </Select>
        <Select aria-label={`${label} 분`} value={draft.m} disabled={off} onChange={(e) => onChange({ ...draft, m: e.target.value })} className="w-24 tabular">
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}분
            </option>
          ))}
        </Select>
        <Button onClick={onNow} disabled={disabled} className="ml-auto">
          현재시간
        </Button>
      </div>
    </div>
  );
}
