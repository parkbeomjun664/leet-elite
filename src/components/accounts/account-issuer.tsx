"use client";

import { useId, useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { ComingSoonButton } from "@/components/coming-soon-button";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { InfoList } from "@/components/ui/panel";
import type { IssueAccountResult } from "@/lib/accounts/issue";
import { toast } from "@/lib/toast";

/** 이미 있는 로그인 계정 (profiles) */
export type AccountInfo = { loginId: string; active: boolean };

/**
 * 로그인 계정 발급 (STU-08, AUTH-02·03, 10/13). 학생 수정 창·선생님 화면에서 같이 쓴다
 * - 계정이 없으면: 아이디 칸(기본값 = 휴대폰 번호, 직접 고칠 수 있음) + [계정 발급]
 * - 발급하면: 아이디·임시 비밀번호를 이 자리에 한 번만 보여 준다(저장하지 않음). [복사]로 카톡에 붙여 넣기
 * - 계정이 있으면: 아이디·상태 + 비밀번호 재설정·사용 중지(10/19에 열림)
 * form 안에 들어가므로 버튼은 모두 type="button", 아이디 칸에서 Enter는 바깥 [저장] 대신 발급을 누른 것으로
 */
export function AccountIssuer({
  account,
  defaultLoginId,
  issueAction,
  onIssued,
  idHint,
}: {
  account: AccountInfo | null;
  defaultLoginId: string;
  issueAction: (loginId: string) => Promise<IssueAccountResult>;
  onIssued?: (account: AccountInfo) => void;
  /** 아이디 칸 아래 안내 (같은 번호를 쓰는 형제가 있을 때 등) */
  idHint?: string;
}) {
  const inputId = useId();
  const [loginId, setLoginId] = useState(defaultLoginId);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ loginId: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startIssue] = useTransition();

  function submit() {
    if (pending) return;
    setError(null);
    if (!loginId.trim()) {
      setError("아이디를 입력해 주세요");
      return;
    }
    startIssue(async () => {
      const res = await issueAction(loginId);
      if (!res.ok) {
        if (res.field) setError(res.error);
        else toast.error(res.error);
        return;
      }
      setIssued({ loginId: res.loginId, tempPassword: res.tempPassword });
      onIssued?.({ loginId: res.loginId, active: true });
      toast.success("계정을 발급했어요");
    });
  }

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(`아이디: ${issued.loginId}\n임시 비밀번호: ${issued.tempPassword}`);
      setCopied(true);
      toast.success("복사했어요");
    } catch {
      toast.error("복사하지 못했어요. 직접 적어 주세요");
    }
  }

  // 방금 발급: 임시 비밀번호를 보여 줄 수 있는 유일한 때
  if (issued) {
    return (
      <div role="status" className="rounded-[var(--radius-block)] bg-block p-4">
        <p className="text-body font-semibold text-ink">계정을 발급했어요</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body">
          <dt className="text-sub">아이디</dt>
          <dd className="font-semibold text-ink tabular" data-testid="issued-login-id">
            {issued.loginId}
          </dd>
          <dt className="text-sub">임시 비밀번호</dt>
          <dd className="font-mono text-heading font-bold tracking-wider text-ink" data-testid="issued-temp-password">
            {issued.tempPassword}
          </dd>
        </dl>
        <p className="mt-3 text-caption text-sub">
          이 창을 닫으면 임시 비밀번호를 다시 볼 수 없어요. 처음 로그인하면 새 비밀번호로 바꾸게 돼요.
        </p>
        <Button size="sm" className="mt-3" onClick={copy}>
          {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          아이디·비밀번호 복사
        </Button>
      </div>
    );
  }

  if (account) {
    return (
      <>
        <InfoList
          items={[
            { label: "아이디", value: <span className="tabular">{account.loginId}</span> },
            { label: "상태", value: account.active ? "사용 중" : <span className="text-sub">사용 중지</span> },
          ]}
        />
        {/* 비밀번호 재설정·사용 중지 (AUTH-04·05, 10/19) */}
        <div className="mt-3 flex flex-wrap gap-2">
          <ComingSoonButton size="sm" feature="비밀번호 재설정" opensOn="10/19">
            비밀번호 재설정
          </ComingSoonButton>
          <ComingSoonButton size="sm" variant="danger" feature="사용 중지" opensOn="10/19">
            사용 중지
          </ComingSoonButton>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <Field label="로그인 아이디" htmlFor={inputId} hint={idHint ?? "보통 휴대폰 번호(숫자만)"} error={error ?? undefined} className="min-w-0 flex-1">
        <Input
          id={inputId}
          value={loginId}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          onChange={(e) => {
            setLoginId(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </Field>
      {/* 칸 이름(라벨) 높이만큼 내려 입력칸과 줄을 맞춘다 */}
      <Button variant="primary" className="mt-[26px]" state={pending ? "loading" : "idle"} onClick={submit}>
        계정 발급
      </Button>
    </div>
  );
}
