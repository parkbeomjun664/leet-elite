"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useMemo, useState, useSyncExternalStore, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { formatDateKo, nowTimeKST, todayKST } from "@/lib/date";

/** 키패드에 넘기는 학생 정보. 코드로 찾는 데 필요한 것만 (전화번호 등은 넘기지 않는다) */
export type KioskStudent = { id: string; code: string; name: string };

const MIN_LEN = 4;
const MAX_LEN = 6;
const RESULT_MS = 4000; // 결과를 보여 주는 시간
const REPEAT_BLOCK_MS = 60_000; // 같은 코드를 1분 안에 다시 누르면 기록하지 않음 (KIOSK-04)

type Result =
  | { kind: "in" | "out"; name: string; time: string }
  | { kind: "done"; name: string }
  | { kind: "recent"; name: string }
  | { kind: "unknown" };

type Entry = { count: number; lastAt: number };

// 1초마다 시계를 다시 그린다. 서버에서는 빈 값이라 첫 화면에서 시간이 어긋나지 않는다
function subscribeClock(onChange: () => void) {
  const t = setInterval(onChange, 1000);
  return () => clearInterval(t);
}

export function KioskKeypad({ students }: { students: KioskStudent[] }) {
  const byCode = useMemo(() => new Map(students.map((s) => [s.code, s])), [students]);

  const time = useSyncExternalStore(subscribeClock, () => nowTimeKST(), () => "");
  const date = useSyncExternalStore(subscribeClock, () => todayKST(), () => "");

  const [digits, setDigits] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  // 오늘 누른 기록 (날짜:학생ID → 횟수·마지막 시각). 시제품이라 새로고침하면 사라진다
  // TODO(3단계): kiosk_check(code)가 DB의 오늘 출결 기록으로 등원·하원을 판단한다
  const [log, setLog] = useState<Record<string, Entry>>({});

  // 결과는 몇 초 뒤 자동으로 처음 화면으로 (KIOSK-03)
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), RESULT_MS);
    return () => clearTimeout(t);
  }, [result]);

  function pressDigit(d: string) {
    // 결과 화면에서 바로 다음 학생이 누르면 결과를 닫고 새로 입력
    if (result) {
      setResult(null);
      setDigits(d);
      return;
    }
    setDigits((prev) => (prev.length >= MAX_LEN ? prev : prev + d));
  }

  function erase() {
    setResult(null);
    setDigits((prev) => prev.slice(0, -1));
  }

  function submit() {
    if (digits.length < MIN_LEN) return;
    const code = digits;
    setDigits("");

    const student = byCode.get(code);
    if (!student) {
      setResult({ kind: "unknown" });
      return;
    }

    const now = Date.now();
    const key = `${todayKST()}:${student.id}`;
    const prev = log[key];
    if (prev && now - prev.lastAt < REPEAT_BLOCK_MS) {
      setResult({ kind: "recent", name: student.name });
      return;
    }

    const count = (prev?.count ?? 0) + 1;
    setLog((l) => ({ ...l, [key]: { count, lastAt: now } }));
    if (count === 1) setResult({ kind: "in", name: student.name, time: nowTimeKST() });
    else if (count === 2) setResult({ kind: "out", name: student.name, time: nowTimeKST() });
    else setResult({ kind: "done", name: student.name });
  }

  // 태블릿에 키보드를 연결해도 쓸 수 있게: 숫자, Backspace, Enter, Esc(모두 지우기)
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) pressDigit(e.key);
    else if (e.key === "Backspace") erase();
    else if (e.key === "Enter") submit();
    else if (e.key === "Escape") {
      setResult(null);
      setDigits("");
    } else return;
    // 초점이 있는 버튼이 Enter로 한 번 더 눌리지 않게
    e.preventDefault();
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const slots = Math.min(MAX_LEN, Math.max(MIN_LEN, digits.length + (digits.length < MAX_LEN ? 1 : 0)));

  return (
    <div className="flex min-h-dvh flex-col pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]">
      {/* 상단 줄: 로고 · 학원 이름 · 날짜와 시계 */}
      <header className="bg-brand-dark pt-[env(safe-area-inset-top,0px)] text-white">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:h-[72px] md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-control)] bg-card md:size-11">
              {/* 원본 PNG가 흰 배경이라 흰 네모 위에서 곱하기 합성 */}
              <Image src="/brand/leet-logo.png" alt="" width={1414} height={2000} priority className="h-9 w-auto mix-blend-multiply md:h-10" />
            </span>
            <p className="truncate text-lg font-bold md:text-xl">
              LEET영어학원 <span className="font-semibold text-white/80">출결</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end leading-tight sm:flex-row sm:items-baseline sm:gap-3">
            <span className="text-[13px] text-white/80 sm:text-[15px]">{date ? formatDateKo(date) : " "}</span>
            <span className="text-xl font-bold tabular md:text-[28px]">{time || " "}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1120px] flex-1 grid-rows-[auto_1fr] gap-4 p-4 md:gap-6 md:p-6 md:landscape:grid-cols-[1fr_minmax(0,1.05fr)] md:landscape:grid-rows-1 md:landscape:gap-8 md:landscape:py-8">
        {/* 왼쪽(세로 화면에서는 위): 입력한 번호 또는 결과 */}
        <section className="flex flex-col gap-3">
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "flex min-h-[232px] flex-1 flex-col items-center justify-center rounded-[var(--radius-card)] border px-5 py-6 text-center transition-colors md:min-h-[280px]",
              !result && "border-line bg-card",
              (result?.kind === "in" || result?.kind === "out") && "border-ok bg-ok-tint",
              result?.kind === "unknown" && "border-brand bg-brand-tint",
              (result?.kind === "recent" || result?.kind === "done") && "border-warn bg-warn-tint",
            )}
          >
            {result ? (
              <ResultView result={result} />
            ) : (
              <>
                <p className="text-lg font-semibold text-sub md:text-xl">출결 번호를 누르세요</p>
                <div className="mt-5 flex gap-2 md:gap-3" aria-label={`입력한 번호 ${digits.length}자리`}>
                  {Array.from({ length: slots }, (_, i) => {
                    const filled = i < digits.length;
                    const next = i === digits.length;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "grid h-16 w-12 place-items-center rounded-[var(--radius-control)] border-2 bg-card text-[36px] font-bold tabular sm:w-14 md:h-20 md:w-16 md:text-[44px]",
                          filled ? "border-ink text-ink" : next ? "border-brand" : "border-line",
                        )}
                      >
                        {filled ? digits[i] : ""}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-5 text-[15px] text-sub md:text-base">
                  번호 {MIN_LEN}~{MAX_LEN}자리를 누르고 <b className="font-bold text-ink">확인</b>을 눌러 주세요
                </p>
              </>
            )}
          </div>
          <p className="hidden text-center text-[15px] text-sub md:landscape:block">번호를 잊었으면 선생님께 말씀해 주세요.</p>
        </section>

        {/* 오른쪽(세로 화면에서는 아래): 숫자 패드 */}
        <section aria-label="숫자 패드" className="grid grid-cols-3 grid-rows-4 gap-2 md:gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onClick={() => pressDigit(d)} className="border border-line bg-card text-[34px] font-bold text-ink active:bg-line-soft md:text-[40px]">
              {d}
            </Key>
          ))}
          <Key onClick={erase} aria-label="한 자리 지우기" className="border border-line bg-line-soft text-xl font-semibold text-sub active:bg-line md:text-[22px]">
            지우기
          </Key>
          <Key onClick={() => pressDigit("0")} className="border border-line bg-card text-[34px] font-bold text-ink active:bg-line-soft md:text-[40px]">
            0
          </Key>
          <Key
            onClick={submit}
            disabled={digits.length < MIN_LEN}
            className="bg-brand text-2xl font-bold text-white active:bg-brand-dark disabled:bg-brand/35 md:text-[28px]"
          >
            확인
          </Key>
        </section>

        <p className="text-center text-[15px] text-sub md:landscape:hidden">번호를 잊었으면 선생님께 말씀해 주세요.</p>
      </main>
    </div>
  );
}

/** 숫자 패드 한 칸. 태블릿 80px, 휴대폰 64px 이상 */
function Key({ className, ...rest }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-16 touch-manipulation rounded-[var(--radius-card)] transition-colors select-none disabled:cursor-not-allowed md:min-h-20",
        className,
      )}
      {...rest}
    />
  );
}

function ResultView({ result }: { result: Result }) {
  if (result.kind === "unknown") {
    return (
      <>
        <p className="text-[28px] leading-snug font-bold text-brand md:text-[34px]">등록되지 않은 번호입니다.</p>
        <p className="mt-2 text-xl font-semibold text-ink md:text-2xl">다시 입력해 주세요.</p>
      </>
    );
  }

  const tone = result.kind === "in" || result.kind === "out" ? "text-ok" : "text-warn";
  const message =
    result.kind === "in" ? "등원했습니다" : result.kind === "out" ? "하원했습니다" : result.kind === "done" ? "이미 하원했습니다" : "방금 처리되었습니다";

  return (
    <>
      <p className="text-[32px] leading-tight font-bold text-ink md:text-[44px]">{result.name} 학생</p>
      <p className={cn("mt-2 text-[28px] leading-tight font-bold md:text-[38px]", tone)}>{message}</p>
      {"time" in result && <p className="mt-3 text-2xl font-semibold text-ink tabular md:text-[28px]">{result.time}</p>}
      {result.kind === "recent" && <p className="mt-3 text-base text-sub">같은 번호는 1분 뒤에 다시 누를 수 있습니다.</p>}
      {result.kind === "done" && <p className="mt-3 text-base text-sub">잘못 눌렀다면 선생님께 말씀해 주세요.</p>}
    </>
  );
}
