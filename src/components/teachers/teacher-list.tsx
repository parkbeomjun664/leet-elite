"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { ChevronRight, Users } from "lucide-react";
import { createTeacher, issueTeacherAccount } from "@/app/admin/teachers/actions";
import { AccountIssuer } from "@/components/accounts/account-issuer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/panel";
import { Sheet } from "@/components/ui/sheet";
import type { AdminTeacher } from "@/lib/data/teachers";
import { toast } from "@/lib/toast";

/**
 * 원장님 선생님 화면 (10/13: 목록 + 선생님 추가 + 계정 발급). 담당 반·수정·퇴사는 10/26
 * 줄을 누르면 오른쪽(휴대폰은 아래) 창에서 계정을 발급한다. 선생님을 추가하면 바로 그 창으로 이어진다
 */
export function TeacherList({ teachers }: { teachers: AdminTeacher[] }) {
  const [rows, setRows] = useState(teachers);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const open = rows.find((t) => t.id === openId) ?? null;
  const withAccount = rows.filter((t) => t.account).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="선생님"
        description={`${rows.length}명 · 계정 발급 ${withAccount}명`}
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            선생님 추가
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="아직 등록한 선생님이 없어요" description="[선생님 추가]로 등록하고 로그인 계정을 발급해 주세요" />
      ) : (
        <ul aria-label="선생님" className="divide-y divide-line-soft border-y border-line-soft bg-card">
          {rows.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-label={`${t.realName} 계정 보기`}
                onClick={() => setOpenId(t.id)}
                className="flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-[var(--duration-fast)] hover:bg-bg/70"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-ink">
                    {t.realName} <span className="font-normal text-sub">· {t.nickname}</span>
                  </p>
                  <p className="mt-0.5 truncate text-caption text-sub">{t.classNames.length ? t.classNames.join(", ") : "담당 반 없음"}</p>
                </div>
                {t.account ? (
                  <span className="text-caption text-sub tabular">{t.account.loginId}</span>
                ) : (
                  <Badge tone="warn">계정 미발급</Badge>
                )}
                <ChevronRight size={18} aria-hidden className="shrink-0 text-faint" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Sheet key={open.id} open onClose={() => setOpenId(null)} title={`${open.realName} 선생님`} subtitle={`학생에게는 "${open.nickname}"(으)로 보여요`}>
          <section className="px-5 py-5">
            <h3 className="mb-3 text-heading font-bold">로그인 계정</h3>
            <AccountIssuer
              account={open.account}
              defaultLoginId=""
              idHint="선생님 휴대폰 번호(숫자만)를 권해요"
              issueAction={(id) => issueTeacherAccount(open.id, id)}
              onIssued={(account) => setRows((prev) => prev.map((r) => (r.id === open.id ? { ...r, account } : r)))}
            />
          </section>
        </Sheet>
      )}

      {adding && (
        <NewTeacherSheet
          onClose={() => setAdding(false)}
          onCreated={(t) => {
            setRows((prev) => [...prev, t]);
            setAdding(false);
            setOpenId(t.id); // 바로 계정 발급으로
          }}
        />
      )}
    </div>
  );
}

const FORM_ID = "new-teacher-form";

function NewTeacherSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (t: AdminTeacher) => void }) {
  const closeSheet = useRef<() => void>(null);
  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<{ field?: "realName" | "nickname"; error: string } | null>(null);
  const [saving, startSaving] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    startSaving(async () => {
      const res = await createTeacher({ realName, nickname });
      if (!res.ok) {
        setError(res);
        if (!res.field) toast.error(res.error);
        return;
      }
      toast.success(`${res.realName} 선생님을 추가했어요`);
      onCreated({ id: res.id, realName: res.realName, nickname: res.nickname, active: true, classNames: [], account: null });
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="선생님 추가"
      subtitle="추가한 뒤 바로 로그인 계정을 발급해요"
      closeRef={closeSheet}
      footer={
        <div className="flex gap-2 md:justify-end">
          <Button onClick={() => closeSheet.current?.()} className="max-md:h-12">
            취소
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} state={saving ? "loading" : "idle"} className="flex-1 max-md:h-12 md:flex-none">
            추가
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-4 px-5 py-5">
        <Field label="이름" htmlFor="nt-name" required hint="원장님만 봐요" error={error?.field === "realName" ? error.error : undefined}>
          <Input
            id="nt-name"
            value={realName}
            onChange={(e) => {
              setRealName(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field label="호칭" htmlFor="nt-nickname" required hint="학생·학부모에게 보이는 이름 (예: Jenny)" error={error?.field === "nickname" ? error.error : undefined}>
          <Input
            id="nt-nickname"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError(null);
            }}
          />
        </Field>
      </form>
    </Sheet>
  );
}
