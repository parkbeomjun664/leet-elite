"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { saveStudentBasic } from "@/app/admin/students/actions";
import { Trash2 } from "lucide-react";
import { ComingSoonButton } from "@/components/coming-soon-button";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, TimeSelect } from "@/components/ui/field";
import { InfoList } from "@/components/ui/panel";
import { ToggleChip } from "@/components/ui/segment";
import { Sheet } from "@/components/ui/sheet";
import { WEEKDAY_KO } from "@/lib/date";
import { isKioskCode } from "@/lib/kiosk";
import { toast } from "@/lib/toast";
import { STUDENT_STATUS_LABEL, type ScheduleSlot, type StudentStatus } from "@/lib/mock/types";
import { PROGRAMS, type StudentBasicField } from "@/lib/students/basic";

/** 보호자 (읽기 전용, STU-07) */
export type GuardianInfo = {
  id: string;
  name: string;
  relation: "mother" | "father" | "other" | null;
  phone1: string;
  phone2: string | null;
  children: { id: string; name: string }[];
};

/** 원장님용 학생 상세·수정에 필요한 값 (서버 → 화면, 직렬화 가능한 값만) */
export type AdminStudent = {
  id: string;
  name: string;
  school: string | null;
  grade: string | null;
  phone: string | null;
  status: StudentStatus;
  enrolledOn: string;
  leftOn: string | null;
  classIds: string[];
  schedule: ScheduleSlot[];
  attendanceCode: string;
  programs: string[];
  memo: string;
  guardians: GuardianInfo[];
};

type ClassOption = { id: string; name: string };

// 사용 프로그램 목록 (STU-03). TODO: 원장님이 목록을 추가·수정
const RELATION_LABEL = { mother: "모", father: "부", other: "기타" } as const;
// 요일 선택은 월요일부터
const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0];
const FORM_ID = "admin-student-form";

/** "010-5550-1000" → "01055501000" (학생 로그인 아이디 기본값) */
const digits = (phone: string) => phone.replace(/\D/g, "");

/**
 * 원장님용 학생 상세·수정 창 (STU-01~09)
 * @param others 같은 목록의 다른 학생들 (출결 코드 중복, 같은 번호 사용 확인용)
 */
export function AdminStudentSheet({
  student,
  others,
  classes,
  onClose,
  onSave,
}: {
  student: AdminStudent;
  others: AdminStudent[];
  classes: ClassOption[];
  onClose: () => void;
  onSave: (next: AdminStudent) => void;
}) {
  // 저장·취소도 창의 닫힘 움직임을 거쳐 닫는다
  const closeSheet = useRef<() => void>(null);
  const [form, setForm] = useState<AdminStudent>(student);
  const [tried, setTried] = useState(false); // 저장을 한 번 눌렀는지 (그 뒤부터 필수 항목 오류 표시)
  // 서버가 돌려준 안내 (출결 번호 중복 등). 그 칸을 다시 고치면 지운다
  const [serverError, setServerError] = useState<{ field?: StudentBasicField; error: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const set = <K extends keyof AdminStudent>(key: K, value: AdminStudent[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (serverError?.field === key) setServerError(null);
  };
  const serverErrorOf = (field: StudentBasicField) => (serverError?.field === field ? serverError.error : undefined);

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const setSlot = (i: number, patch: Partial<ScheduleSlot>) =>
    set("schedule", form.schedule.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const showLeftOn = form.status === "on_leave" || form.status === "withdrawn";

  // 출결 코드 확인 (STU-02): 숫자 4자리 고정(10/5, 키패드가 4자리에서 바로 처리), 재원·예정 학생끼리 겹치지 않게
  const code = form.attendanceCode.trim();
  // 휴·퇴원으로 바꾸는 학생은 코드를 쓰지 않으므로 겹쳐도 괜찮다
  const codeOwner = showLeftOn ? undefined : others.find(
    (o) => (o.status === "enrolled" || o.status === "pending") && o.attendanceCode === code,
  );
  const codeError = serverErrorOf("attendanceCode") ?? (!isKioskCode(code)
    ? tried || code.length > 0
      ? "숫자 4자리로 입력해 주세요"
      : undefined
    : codeOwner
      ? `${code}번은 ${codeOwner.name} 학생이 쓰고 있어요`
      : undefined);
  // 요일별 수업 시간: 시작 시각과 수업 시간(분)이 모두 있어야 한다
  const scheduleError = form.schedule.some((s) => !s.start || !(s.durationMin > 0)) ? "시작 시각과 수업 시간(분)을 모두 입력해 주세요" : undefined;
  const nameError = serverErrorOf("name") ?? (tried && !form.name.trim() ? "이름을 입력해 주세요" : undefined);
  const phoneError = serverErrorOf("phone");
  const leftOnError = tried && showLeftOn && !form.leftOn ? "날짜를 입력해 주세요" : undefined;

  // 로그인 아이디: 학생 휴대폰 번호. 같은 번호를 쓰는 학생(쌍둥이 등)이 있으면 따로 정해야 한다
  const phone = form.phone?.trim() || null;
  const loginId = phone ? digits(phone) : null;
  const samePhone = phone ? others.filter((o) => o.phone && digits(o.phone) === digits(phone)) : [];

  // 기본 정보만 서버에 저장한다 (10/8). 반·수업 시간·보호자는 10/9, 상태(휴원·퇴원)는 10/13에 열린다 → 그 칸들은 잠가 둔다
  // 저장은 서버 응답을 기다린다(버튼에 처리 중 표시): 출결 번호 중복처럼 서버에서 막힐 수 있어 창을 연 채로 고치게 한다
  function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setTried(true);
    setServerError(null);
    if (!form.name.trim() || !isKioskCode(code) || codeOwner) return;
    startSaving(async () => {
      const res = await saveStudentBasic({
        id: form.id,
        name: form.name,
        phone: form.phone ?? "",
        school: form.school ?? "",
        grade: form.grade ?? "",
        enrolledOn: form.enrolledOn,
        attendanceCode: code,
        programs: form.programs,
        memo: form.memo,
      });
      if (!res.ok) {
        setServerError({ field: res.field, error: res.error });
        toast.error(res.field ? "고칠 곳이 있어요. 빨간 안내를 확인해 주세요" : res.error);
        return;
      }
      // 서버가 다듬은 값(공백 제거, 휴대폰 하이픈)으로 목록을 바꾼다
      const v = res.student;
      onSave({ ...student, name: v.name, phone: v.phone, school: v.school, grade: v.grade, enrolledOn: v.enrolledOn, attendanceCode: v.attendanceCode, programs: [...v.programs], memo: v.memo });
      toast.success(`${v.name} 정보를 저장했어요`);
      closeSheet.current?.();
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${student.name} 정보 수정`}
      subtitle={[student.school, student.grade, STUDENT_STATUS_LABEL[student.status]].filter(Boolean).join(" · ")}
      width="md:w-[560px]"
      closeRef={closeSheet}
      footer={
        // 휴대폰: [취소] [저장 ────] 저장을 넓게(엄지 자리) / 768 이상: 오른쪽에 나란히
        <div className="flex gap-2 md:justify-end">
          <Button onClick={() => closeSheet.current?.()} className="max-md:h-12">
            취소
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} state={saving ? "loading" : "idle"} className="flex-1 max-md:h-12 md:flex-none">
            저장
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="divide-y divide-line-soft">
        {/* 기본 정보 */}
        <Section title="기본 정보">
          <div className="grid grid-cols-2 gap-3">
            <Field label="이름" htmlFor="as-name" required error={nameError} className="col-span-2 sm:col-span-1">
              <Input id="as-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="학생 휴대폰" htmlFor="as-phone" hint="없으면 비워 두세요" error={phoneError} className="col-span-2 sm:col-span-1">
              <Input
                id="as-phone"
                type="tel"
                inputMode="tel"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="휴대폰 번호"
                className="tabular"
              />
            </Field>
            <Field label="학교" htmlFor="as-school">
              <Input id="as-school" value={form.school ?? ""} onChange={(e) => set("school", e.target.value)} />
            </Field>
            <Field label="학년" htmlFor="as-grade">
              <Input id="as-grade" value={form.grade ?? ""} onChange={(e) => set("grade", e.target.value)} placeholder="예: 중2" />
            </Field>
            <Field label="상태" htmlFor="as-status" hint="휴원·퇴원 처리는 10/13에 열려요">
              <Select id="as-status" value={form.status} disabled onChange={(e) => set("status", e.target.value as StudentStatus)}>
                {(Object.keys(STUDENT_STATUS_LABEL) as StudentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STUDENT_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="입학일" htmlFor="as-enrolled">
              <Input id="as-enrolled" type="date" value={form.enrolledOn} onChange={(e) => set("enrolledOn", e.target.value)} className="tabular" />
            </Field>
            {showLeftOn && (
              <Field
                label={form.status === "on_leave" ? "휴원일" : "퇴원일"}
                htmlFor="as-left"
                required
                error={leftOnError}
                hint="저장하면 재원생 목록에서 빠집니다"
                className="col-span-2 sm:col-span-1"
              >
                <Input id="as-left" type="date" value={form.leftOn ?? ""} onChange={(e) => set("leftOn", e.target.value || null)} className="tabular" />
              </Field>
            )}
          </div>
        </Section>

        {/* 반 · 수업 시간 (STU-04) */}
        <Section title="반 · 수업 시간" note="반과 수업 시간 저장은 10/9에 열려요">
          <fieldset>
            <legend className="mb-1.5 text-caption font-semibold text-sub">반 (여러 개 선택 가능)</legend>
            <div className="flex flex-wrap gap-1.5">
              {classes.map((c) => (
                <ToggleChip key={c.id} disabled on={form.classIds.includes(c.id)} onToggle={() => set("classIds", toggle(form.classIds, c.id))}>
                  {c.name}
                </ToggleChip>
              ))}
            </div>
          </fieldset>

          <div className="mt-4">
            <p className="mb-1.5 text-caption font-semibold text-sub">요일별 수업 시간</p>
            {form.schedule.length === 0 ? (
              <p className="text-body text-sub">수업 시간이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {form.schedule.map((slot, i) => (
                  // 한 줄: [요일] [시]:[분]  [80]분  (삭제). 휴대폰은 두 줄이 되므로 옅은 바탕으로 한 덩어리로 묶는다
                  <li key={i} className="flex flex-wrap items-center gap-2 max-md:rounded-[var(--radius-control)] max-md:bg-bg max-md:p-2">
                    {/* 폭은 바깥 칸에서 (입력칸 부품의 w-full과 겹치지 않게, workflow.md 6번) */}
                    <div className="w-[76px] shrink-0">
                    <Select
                      disabled
                      aria-label="요일"
                      value={slot.weekday}
                      onChange={(e) => setSlot(i, { weekday: Number(e.target.value) })}
                      className="pr-2"
                    >
                      {WEEKDAY_OPTIONS.map((w) => (
                        <option key={w} value={w}>
                          {WEEKDAY_KO[w]}
                        </option>
                      ))}
                    </Select>
                    </div>
                    <TimeSelect label="시작 시간" disabled minuteStep={5} value={slot.start} onChange={(v) => setSlot(i, { start: v })} />
                    <span className="flex items-center gap-1.5">
                      <span className="w-[72px]">
                        <Input
                          disabled
                          aria-label="수업 시간(분)"
                          type="number"
                          min={10}
                          step={10}
                          value={slot.durationMin}
                          onChange={(e) => setSlot(i, { durationMin: Number(e.target.value) })}
                          className="tabular"
                        />
                      </span>
                      <span className="text-body text-sub">분</span>
                    </span>
                    <button
                      type="button"
                      disabled
                      onClick={() => set("schedule", form.schedule.filter((_, j) => j !== i))}
                      aria-label={`${WEEKDAY_KO[slot.weekday]}요일 수업 삭제`}
                      className="press ml-auto grid size-11 place-items-center rounded-[var(--radius-control)] text-sub hover:bg-line-soft hover:text-ink md:size-9"
                    >
                      <Trash2 aria-hidden className="size-[18px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {scheduleError && <p className="mt-2 text-caption text-brand">{scheduleError}</p>}
            <Button
              size="sm"
              className="mt-2"
              disabled
              onClick={() => {
                const last = form.schedule.at(-1);
                set("schedule", [...form.schedule, { weekday: 1, start: last?.start ?? "15:00", durationMin: last?.durationMin ?? 90 }]);
              }}
            >
              + 요일 추가
            </Button>
          </div>
        </Section>

        {/* 출결 코드 · 사용 프로그램 · 메모 */}
        <Section title="출결 · 프로그램 · 메모">
          <Field label="출결 코드" htmlFor="as-code" required error={codeError} hint="키패드에서 누르는 숫자 4자리. 새 학생은 휴대폰 뒷 4자리, 겹치면 다른 4자리">
            <div className="max-w-40">
              <Input
                id="as-code"
                inputMode="numeric"
                maxLength={4}
                value={form.attendanceCode}
                onChange={(e) => set("attendanceCode", e.target.value.replace(/\D/g, ""))}
                className="tabular"
              />
            </div>
          </Field>
          <fieldset className="mt-4">
            <legend className="mb-1.5 text-caption font-semibold text-sub">사용 프로그램</legend>
            <div className="flex flex-wrap gap-1.5">
              {PROGRAMS.map((p) => (
                <ToggleChip key={p} on={form.programs.includes(p)} onToggle={() => set("programs", toggle(form.programs, p))}>
                  {p}
                </ToggleChip>
              ))}
            </div>
          </fieldset>
          <Field label="메모" htmlFor="as-memo" className="mt-4">
            <Textarea id="as-memo" value={form.memo} onChange={(e) => set("memo", e.target.value)} />
          </Field>
        </Section>

        {/* 보호자 (STU-07) */}
        <Section
          title="보호자"
          actions={
            // 보호자 추가·연결 화면 (STU-07, 일별 계획 10/20)
            <ComingSoonButton size="sm" feature="보호자 추가" opensOn="10/20">
              보호자 추가
            </ComingSoonButton>
          }
        >
          {form.guardians.length === 0 ? (
            <p className="text-body text-sub">연결된 보호자가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {form.guardians.map((g) => (
                <li key={g.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p>
                    <span className="text-heading font-bold">{g.name}</span>
                    {g.relation && <span className="ml-2 text-caption text-sub">{RELATION_LABEL[g.relation]}</span>}
                  </p>
                  <p className="text-body tabular">
                    {g.phone1}
                    {g.phone2 && <span className="text-sub"> · {g.phone2}</span>}
                  </p>
                  <p className="text-caption text-sub">연결된 자녀: {g.children.map((c) => c.name).join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 로그인 계정 (STU-08, AUTH-02) */}
        <Section title="로그인 계정">
          <InfoList
            items={[
              {
                label: "아이디",
                value: loginId ? <span className="tabular">{loginId}</span> : <span className="text-sub">미발급</span>,
              },
            ]}
          />
          {samePhone.length > 0 && (
            <p className="mt-2 text-caption text-warn">
              {samePhone.map((o) => o.name).join(", ")} 학생과 같은 번호입니다. 아이디를 따로 정해야 합니다.
            </p>
          )}
          {/* 계정 발급(STU-08, 10/16)·비밀번호 재설정·사용 중지(AUTH-04·05, 10/19). 열리기 전에는 날짜 안내 */}
          <div className="mt-3 flex flex-wrap gap-2">
            <ComingSoonButton size="sm" feature="계정 발급" opensOn="10/16">
              계정 발급
            </ComingSoonButton>
            <ComingSoonButton size="sm" feature="비밀번호 재설정" opensOn="10/19">
              비밀번호 재설정
            </ComingSoonButton>
            <ComingSoonButton size="sm" variant="danger" feature="사용 중지" opensOn="10/19">
              사용 중지
            </ComingSoonButton>
          </div>
        </Section>
      </form>
    </Sheet>
  );
}

/** 창 안의 구역: 제목 + 내용 */
function Section({ title, note, actions, children }: { title: string; note?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-5 py-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-heading font-bold">{title}</h3>
          {/* 아직 저장되지 않는 구역 안내 (열리는 날짜) */}
          {note && <p className="mt-0.5 text-caption text-sub">{note}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
