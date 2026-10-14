"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/panel";
import { Segment, ToggleChip } from "@/components/ui/segment";
import type { HomeworkTargets } from "@/lib/data/homework";
import { WEEKDAY_KO } from "@/lib/date";
import { createHomework } from "@/lib/homework/actions";
import {
  autoDailyTitle,
  BODY_MAX,
  DEFAULT_WEEKDAYS,
  defaultDates,
  parseHomework,
  readyToSubmit,
  TITLE_MAX,
  WEEKDAY_ORDER,
  type HomeworkField,
  type HomeworkKind,
  type SubmitMode,
} from "@/lib/homework/form";
import { toast } from "@/lib/toast";

/**
 * 숙제 등록 화면 (HW-01~03). 원장님(/admin/homework/new)·선생님(/teacher/homework/new) 공통
 * 10/14 오후 범준님 개선: 일반 = 마감일(기본 오늘+2일) / 매일 = 기간 + 요일 칩(기본 월~금, 제목을 비우면 날짜가 제목) ·
 *   제출 방식(체크만/사진 첨부) · "오늘 날짜 사용" 체크 없앰 · 반 칩 "선택수/전체수" · [전체]는 맨 뒤에서 한 번 묻고 ·
 *   [n명에게 숙제 내기]는 필수값(제목·대상·마감)이 채워져야 켜진다
 * 1024 이상 2단: 왼쪽 종류·날짜·제출 방식·제목·내용 / 오른쪽 대상 학생. 좁으면 종류 → 대상 → 나머지
 */
export function HomeworkForm({ targets, today, listHref }: { targets: HomeworkTargets; today: string; listHref: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<HomeworkKind>("general");
  const [dates, setDates] = useState(() => defaultDates(today));
  const [weekdays, setWeekdays] = useState<number[]>(DEFAULT_WEEKDAYS);
  const [submitMode, setSubmitMode] = useState<SubmitMode>("photo");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAll, setConfirmAll] = useState(false);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<{ field?: HomeworkField; error: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const allIds = targets.students.map((s) => s.id);
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const errorOf = (f: HomeworkField) => (error?.field === f ? error.error : undefined);
  const clearError = (f: HomeworkField) => error?.field === f && setError(null);

  const input = { kind, title, body, submitMode, ...dates, weekdays, studentIds: [...selected] };
  const ready = readyToSubmit(input);

  // 반 칩·전체: 그 학생들을 한꺼번에 넣거나 뺀다
  const toggleIds = (ids: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    clearError("targets");
  };
  const toggleWeekday = (d: number) => {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    clearError("period");
  };
  const setDate = (key: keyof typeof dates, value: string) => {
    setDates((d) => ({ ...d, [key]: value }));
    clearError(key === "dueOn" ? "due" : "period");
  };

  const shown = useMemo(() => {
    const q = query.trim();
    return q ? targets.students.filter((s) => s.name.includes(q)) : targets.students;
  }, [query, targets.students]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !ready) return;
    // 서버와 같은 규칙으로 먼저 확인 (틀리면 그 칸 아래에 안내)
    const check = parseHomework(input, today);
    if (!check.ok) {
      setError(check);
      if (!check.field) toast.error(check.error);
      return;
    }
    startSaving(async () => {
      const res = await createHomework(input);
      if (!res.ok) {
        setError(res);
        toast.error(res.field ? "고칠 곳이 있어요. 빨간 안내를 확인해 주세요" : res.error);
        return;
      }
      toast.success(`"${res.title}" 숙제를 ${res.targetCount}명에게 냈어요`);
      router.push(listHref);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-6xl space-y-8">
      <PageHeader title="숙제 등록" description="학생 앱에 바로 보여요" />
      <div className="grid gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-12">
        {/* 1. 종류와 날짜 (HW-01·03) */}
        <section aria-labelledby="hw-kind" className="space-y-3 lg:col-start-1 lg:row-start-1">
          <h2 id="hw-kind" className="text-heading font-bold text-ink">
            종류
          </h2>
          <div role="group" aria-label="숙제 종류" className="flex gap-1">
            <Segment active={kind === "general"} onClick={() => setKind("general")}>
              일반 숙제
            </Segment>
            <Segment active={kind === "daily"} onClick={() => setKind("daily")}>
              매일 숙제
            </Segment>
          </div>
          {kind === "general" ? (
            <Field label="마감일" htmlFor="hw-due" required error={errorOf("due")} className="max-w-56">
              <Input id="hw-due" type="date" value={dates.dueOn} min={today} onChange={(e) => setDate("dueOn", e.target.value)} />
            </Field>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <Field label="시작일" htmlFor="hw-start" required>
                  <Input id="hw-start" type="date" value={dates.startsOn} min={today} onChange={(e) => setDate("startsOn", e.target.value)} />
                </Field>
                <span className="pb-2.5 text-sub">~</span>
                <Field label="종료일" htmlFor="hw-end" required>
                  <Input id="hw-end" type="date" value={dates.endsOn} min={dates.startsOn || today} onChange={(e) => setDate("endsOn", e.target.value)} />
                </Field>
              </div>
              <div role="group" aria-label="숙제 내는 요일" className="flex flex-wrap gap-1.5">
                {WEEKDAY_ORDER.map((d) => (
                  <ToggleChip key={d} on={weekdays.includes(d)} onToggle={() => toggleWeekday(d)}>
                    {WEEKDAY_KO[d]}
                  </ToggleChip>
                ))}
              </div>
              {errorOf("period") && <p className="text-caption text-brand">{errorOf("period")}</p>}
            </div>
          )}
        </section>

        {/* 2. 대상 (HW-01): 반 · 학생 · 전체(맨 뒤, 한 번 묻기) */}
        <section aria-labelledby="hw-targets" className="space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="hw-targets" className="text-heading font-bold text-ink">
              대상 학생
            </h2>
            <p className="text-caption text-sub" aria-live="polite">
              <b className="font-semibold text-ink tabular" data-testid="selected-count">
                {selected.size}
              </b>
              명 선택
            </p>
          </div>
          {targets.students.length === 0 ? (
            <p className="text-body text-sub">숙제를 낼 수 있는 학생이 없어요. 반에 학생이 있는지 확인해 주세요.</p>
          ) : (
            <>
              <div role="group" aria-label="반으로 고르기" className="flex flex-wrap gap-2">
                {targets.classes
                  .filter((c) => c.studentIds.length > 0)
                  .map((c) => {
                    const picked = c.studentIds.filter((id) => selected.has(id)).length;
                    const on = picked === c.studentIds.length;
                    return (
                      <ToggleChip key={c.id} on={on} onToggle={() => toggleIds(c.studentIds, !on)}>
                        {c.name}{" "}
                        <span className="tabular">
                          {picked}/{c.studentIds.length}
                        </span>
                      </ToggleChip>
                    );
                  })}
                <ToggleChip on={allOn} onToggle={() => (allOn ? toggleIds(allIds, false) : setConfirmAll(true))}>
                  전체 <span className="tabular">{allIds.length}</span>
                </ToggleChip>
              </div>
              {confirmAll && (
                <div role="group" aria-label="전체 선택 확인" className="flex flex-wrap items-center gap-2 rounded-[var(--radius-block)] bg-block px-4 py-3">
                  <span className="mr-auto text-body text-ink">
                    <b className="tabular">{allIds.length}</b>명 전체 선택할까요?
                  </span>
                  <Button size="sm" onClick={() => setConfirmAll(false)}>
                    취소
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      toggleIds(allIds, true);
                      setConfirmAll(false);
                    }}
                  >
                    전체 선택
                  </Button>
                </div>
              )}
              <div className="rounded-[var(--radius-block)] border border-line-soft">
                <label className="flex items-center gap-2 border-b border-line-soft px-3">
                  <Search aria-hidden className="size-4 text-faint" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="학생 이름 검색"
                    aria-label="학생 이름 검색"
                    className="h-11 min-w-0 flex-1 bg-transparent text-body outline-none md:h-10"
                  />
                </label>
                <ul aria-label="학생" className="max-h-72 overflow-y-auto py-1 lg:max-h-[26rem]">
                  {shown.map((s) => (
                    <li key={s.id}>
                      <Checkbox
                        className="flex min-h-11 w-full px-3 hover:bg-bg md:min-h-10"
                        checked={selected.has(s.id)}
                        onChange={(e) => toggleIds([s.id], e.target.checked)}
                        label={
                          <span>
                            <span className="font-medium text-ink">{s.name}</span>
                            {(s.school || s.grade) && <span className="ml-2 text-caption text-sub">{[s.school, s.grade].filter(Boolean).join(" ")}</span>}
                          </span>
                        }
                      />
                    </li>
                  ))}
                  {shown.length === 0 && <li className="px-3 py-3 text-caption text-sub">&quot;{query}&quot;에 맞는 학생이 없어요</li>}
                </ul>
              </div>
            </>
          )}
          {errorOf("targets") && <p className="text-caption text-brand">{errorOf("targets")}</p>}
        </section>

        {/* 3. 제출 방식 · 제목 · 내용 */}
        <section className="space-y-4 lg:col-start-1 lg:row-start-2">
          <div className="space-y-1.5">
            <p id="hw-mode" className="text-caption font-semibold text-sub">
              제출 방식
            </p>
            <div role="group" aria-labelledby="hw-mode" className="flex gap-1">
              <Segment active={submitMode === "check"} onClick={() => setSubmitMode("check")}>
                체크만
              </Segment>
              <Segment active={submitMode === "photo"} onClick={() => setSubmitMode("photo")}>
                사진 첨부
              </Segment>
            </div>
          </div>
          <Field label="제목" htmlFor="hw-title" required={kind === "general"} hint={kind === "daily" ? "비워 두면 날짜가 제목이 돼요" : undefined} error={errorOf("title")}>
            <Input
              id="hw-title"
              value={title}
              maxLength={TITLE_MAX}
              placeholder={kind === "daily" && dates.startsOn && dates.endsOn ? autoDailyTitle(dates.startsOn, dates.endsOn) : "예: 3과 단어 외우기"}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError("title");
              }}
            />
          </Field>
          <Field label="내용" htmlFor="hw-body" hint={`${body.length} / ${BODY_MAX}자`} error={errorOf("body")}>
            <Textarea
              id="hw-body"
              className="h-[140px] resize-none"
              value={body}
              maxLength={BODY_MAX}
              placeholder="숙제 범위, 제출 방법 등"
              onChange={(e) => {
                setBody(e.target.value);
                clearError("body");
              }}
            />
          </Field>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-5 md:justify-end">
        {!ready && (
          <p className="w-full text-caption text-sub md:mr-auto md:w-auto" data-testid="submit-hint">
            {kind === "general" ? "제목·대상·마감일을 채우면 낼 수 있어요" : "대상·기간·요일을 채우면 낼 수 있어요"}
          </p>
        )}
        <ButtonLink href={listHref} className="max-md:h-12">
          취소
        </ButtonLink>
        <Button
          variant="primary"
          type="submit"
          disabled={!ready}
          state={saving ? "loading" : "idle"}
          className="flex-1 disabled:cursor-not-allowed disabled:opacity-40 max-md:h-12 md:flex-none"
        >
          {selected.size > 0 ? `${selected.size}명에게 숙제 내기` : "숙제 내기"}
        </Button>
      </div>
    </form>
  );
}
