"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/panel";
import { Segment, ToggleChip } from "@/components/ui/segment";
import type { HomeworkTargets } from "@/lib/data/homework";
import { createHomework } from "@/lib/homework/actions";
import { BODY_MAX, defaultPeriod, parseHomework, TITLE_MAX, todayTitle, type HomeworkField, type HomeworkKind } from "@/lib/homework/form";
import { toast } from "@/lib/toast";

/**
 * 숙제 등록 화면 (HW-01~03, 10/14). 원장님(/admin/homework/new)·선생님(/teacher/homework/new) 공통
 * 위에서 아래로: 종류(일반·매일, 매일은 오늘 하루 / 기간) → 대상(전체·반·학생) → 제목(오늘 날짜 사용) → 내용 → [등록]
 * 대상 목록은 서버가 권한대로 준 것만 (선생님은 담당 반 학생만)
 */
export function HomeworkForm({ targets, today, listHref }: { targets: HomeworkTargets; today: string; listHref: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<HomeworkKind>("general");
  const [period, setPeriod] = useState(false);
  const [{ startsOn, endsOn }, setRange] = useState(() => defaultPeriod(today));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [useToday, setUseToday] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<{ field?: HomeworkField; error: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const allIds = targets.students.map((s) => s.id);
  const allOn = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const errorOf = (f: HomeworkField) => (error?.field === f ? error.error : undefined);
  const clearError = (f: HomeworkField) => error?.field === f && setError(null);

  // 반 알약: 그 반 학생이 모두 골라져 있으면 켜진 것으로. 누르면 그 반 전체를 넣거나 뺀다
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

  const shown = useMemo(() => {
    const q = query.trim();
    return q ? targets.students.filter((s) => s.name.includes(q)) : targets.students;
  }, [query, targets.students]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const input = { kind, title, useToday, body, period, startsOn, endsOn, studentIds: [...selected] };
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
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-8">
      <PageHeader title="숙제 등록" description="학생 앱에 바로 보여요" />

      {/* 1. 종류 (HW-01·03) */}
      <section aria-labelledby="hw-kind" className="space-y-3">
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
        {kind === "daily" && (
          <div className="space-y-3 rounded-[var(--radius-block)] bg-block p-4">
            <Checkbox label="기간 설정 (기간 동안 날마다 제출)" checked={period} onChange={(e) => { setPeriod(e.target.checked); clearError("period"); }} />
            {period ? (
              <div className="flex flex-wrap items-end gap-3">
                <Field label="시작일" htmlFor="hw-start">
                  <Input id="hw-start" type="date" value={startsOn} min={today} onChange={(e) => { setRange((r) => ({ ...r, startsOn: e.target.value })); clearError("period"); }} />
                </Field>
                <span className="pb-2.5 text-sub">~</span>
                <Field label="종료일" htmlFor="hw-end">
                  <Input id="hw-end" type="date" value={endsOn} min={startsOn || today} onChange={(e) => { setRange((r) => ({ ...r, endsOn: e.target.value })); clearError("period"); }} />
                </Field>
              </div>
            ) : (
              <p className="text-caption text-sub">기간을 정하지 않으면 오늘({todayTitle(today).replace(" 숙제", "")}) 하루 숙제예요.</p>
            )}
            {errorOf("period") && <p className="text-caption text-brand">{errorOf("period")}</p>}
          </div>
        )}
      </section>

      {/* 2. 대상 (HW-01): 전체 · 반 · 학생 */}
      <section aria-labelledby="hw-targets" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="hw-targets" className="text-heading font-bold text-ink">
            대상 학생
          </h2>
          <p className="text-caption text-sub" aria-live="polite">
            <b className="font-semibold text-ink tabular" data-testid="selected-count">{selected.size}</b>명 선택
          </p>
        </div>
        {targets.students.length === 0 ? (
          <p className="text-body text-sub">숙제를 낼 수 있는 학생이 없어요. 반에 학생이 있는지 확인해 주세요.</p>
        ) : (
          <>
            <div role="group" aria-label="반으로 고르기" className="flex flex-wrap gap-2">
              <ToggleChip on={allOn} onToggle={() => toggleIds(allIds, !allOn)}>
                전체 {allIds.length}
              </ToggleChip>
              {targets.classes
                .filter((c) => c.studentIds.length > 0)
                .map((c) => {
                  const on = c.studentIds.every((id) => selected.has(id));
                  return (
                    <ToggleChip key={c.id} on={on} onToggle={() => toggleIds(c.studentIds, !on)}>
                      {c.name} {c.studentIds.length}
                    </ToggleChip>
                  );
                })}
            </div>
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
              <ul aria-label="학생" className="max-h-72 overflow-y-auto py-1">
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

      {/* 3. 제목 (HW-02 오늘 날짜 사용) · 4. 내용 */}
      <section className="space-y-4">
        <Field label="제목" htmlFor="hw-title" required error={errorOf("title")}>
          <Input
            id="hw-title"
            value={title}
            maxLength={TITLE_MAX}
            placeholder={useToday ? todayTitle(today) : "예: 3과 단어 외우기"}
            onChange={(e) => { setTitle(e.target.value); clearError("title"); }}
          />
        </Field>
        <Checkbox label="오늘 날짜 사용 (제목을 비우면 오늘 날짜가 제목)" checked={useToday} onChange={(e) => { setUseToday(e.target.checked); clearError("title"); }} />
        <Field label="내용" htmlFor="hw-body" hint={`${body.length} / ${BODY_MAX}자`} error={errorOf("body")}>
          <Textarea id="hw-body" rows={5} value={body} maxLength={BODY_MAX} placeholder="숙제 범위, 제출 방법 등" onChange={(e) => { setBody(e.target.value); clearError("body"); }} />
        </Field>
      </section>

      <div className="flex gap-2 border-t border-line-soft pt-5 md:justify-end">
        <ButtonLink href={listHref} className="max-md:h-12">
          취소
        </ButtonLink>
        <Button variant="primary" type="submit" state={saving ? "loading" : "idle"} className="flex-1 max-md:h-12 md:flex-none">
          숙제 내기
        </Button>
      </div>
    </form>
  );
}
