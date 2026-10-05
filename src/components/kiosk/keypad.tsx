"use client";

import { Check, Delete } from "lucide-react";
import Image from "next/image";
import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { formatDateKo, nowTimeKST, todayKST } from "@/lib/date";
import { longerPrefixesOf, shouldSubmitNow } from "@/lib/kiosk";

/** 키패드에 넘기는 학생 정보. 코드로 찾는 데 필요한 것만 (전화번호 등은 넘기지 않는다) */
export type KioskStudent = { id: string; code: string; name: string };

const MIN_LEN = 4;
const MAX_LEN = 6;
const RESULT_MS = 4000; // 결과를 보여 주는 시간
const IDLE_CLEAR_MS = 10000; // 누르다 만 번호를 지우기까지 시간
const REPEAT_BLOCK_MS = 60_000; // 같은 코드를 1분 안에 다시 누르면 기록하지 않음 (KIOSK-04)

type Result =
  | { kind: "in" | "out"; name: string; time: string }
  | { kind: "done"; name: string }
  | { kind: "recent"; name: string }
  | { kind: "unknown" };

type Entry = { count: number; lastAt: number };

// ── 소리 (KIOSK-03 보조) ───────────────────────────────────
// 소리 파일 없이 Web Audio로 짧은 음을 만든다. 브라우저는 사용자가 누르기 전에는 소리를 막으므로
// 첫 키를 누를 때 AudioContext를 만든다.
type Sound = "ok" | "notice" | "error";
const VOLUME = 0.12; // 너무 크지 않게

function playSound(ctx: AudioContext, sound: Sound) {
  // 음 하나: 시작(초 뒤), 높이(Hz), 길이(초), 파형
  const tone = (at: number, freq: number, dur: number, type: OscillatorType = "sine") => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime + at;
    osc.type = type;
    osc.frequency.value = freq;
    // 딸깍 소리가 나지 않게 짧게 커졌다가 줄어든다
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(type === "square" ? VOLUME / 2 : VOLUME, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };
  if (sound === "ok") {
    // 성공: 올라가는 두 음
    tone(0, 880, 0.13);
    tone(0.14, 1320, 0.18);
  } else if (sound === "notice") {
    // 이미 처리됨: 가운데 음 하나
    tone(0, 660, 0.22);
  } else {
    // 오류: 낮은 '삐-'
    tone(0, 150, 0.4, "square");
  }
}

// 소리 켜짐/꺼짐은 이 태블릿에만 기억한다 (localStorage, 기본 켜짐)
const SOUND_KEY = "kiosk-sound";
const soundListeners = new Set<() => void>();
function readSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}
function writeSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // 저장이 막힌 브라우저에서는 바뀌지 않는다
  }
  soundListeners.forEach((l) => l());
}
function subscribeSound(onChange: () => void) {
  soundListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    soundListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// 1초마다 시계를 다시 그린다. 서버에서는 빈 값이라 첫 화면에서 시간이 어긋나지 않는다
function subscribeClock(onChange: () => void) {
  const t = setInterval(onChange, 1000);
  return () => clearInterval(t);
}

export function KioskKeypad({ students }: { students: KioskStudent[] }) {
  const byCode = useMemo(() => new Map(students.map((s) => [s.code, s])), [students]);
  // 더 긴 번호의 앞자리인 번호들 (예: 10024가 있으면 1002). 이 번호에서는 바로 처리하지 않고 확인을 기다린다
  const longerPrefixes = useMemo(() => longerPrefixesOf(students.map((s) => s.code)), [students]);

  const time = useSyncExternalStore(subscribeClock, () => nowTimeKST(), () => "");
  const date = useSyncExternalStore(subscribeClock, () => todayKST(), () => "");

  const [digits, setDigits] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  // 오늘 누른 기록 (날짜:학생ID → 횟수·마지막 시각). 시제품이라 새로고침하면 사라진다
  // TODO(3단계): kiosk_check(code)가 DB의 오늘 출결 기록으로 등원·하원을 판단한다
  const log = useRef<Record<string, Entry>>({});

  // 빠르게 연달아 누를 때 화면이 다시 그려지기 전의 값을 읽지 않도록, 입력·결과 여부를 ref에도 같이 둔다
  const input = useRef("");
  const showing = useRef(false);
  function changeDigits(v: string) {
    input.current = v;
    setDigits(v);
  }
  function changeResult(r: Result | null) {
    showing.current = r !== null;
    setResult(r);
  }

  const soundOn = useSyncExternalStore(subscribeSound, readSoundOn, () => true);
  const audio = useRef<AudioContext | null>(null);

  // 키를 누를 때마다 부른다 (처음 한 번 AudioContext 생성, 태블릿이 멈춰 둔 경우 다시 켜기)
  function wakeAudio() {
    // 옛 아이패드(사파리)는 webkitAudioContext라는 이름을 쓴다
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    try {
      audio.current ??= new Ctx();
      if (audio.current.state === "suspended") void audio.current.resume();
    } catch {
      audio.current = null;
    }
  }

  function show(next: Result) {
    changeResult(next);
    if (!soundOn || !audio.current) return;
    const sound: Sound = next.kind === "in" || next.kind === "out" ? "ok" : next.kind === "unknown" ? "error" : "notice";
    try {
      playSound(audio.current, sound);
    } catch {
      // 소리가 안 나도 출결 처리는 그대로
    }
  }

  // 결과는 몇 초 뒤 자동으로 처음 화면으로 (KIOSK-03)
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => changeResult(null), RESULT_MS);
    return () => clearTimeout(t);
  }, [result]);

  // 누르다 만 번호는 잠시 뒤 지운다. 다음 학생 번호가 뒤에 붙지 않게
  useEffect(() => {
    if (!digits || result) return;
    const t = setTimeout(() => changeDigits(""), IDLE_CLEAR_MS);
    return () => clearTimeout(t);
  }, [digits, result]);

  function pressDigit(d: string) {
    wakeAudio();
    // 결과 화면에서 바로 다음 학생이 누르면 결과를 닫고 새로 입력
    const prev = showing.current ? "" : input.current;
    if (showing.current) changeResult(null);
    if (prev.length >= MAX_LEN) return;
    const next = prev + d;

    // 바로 처리: 번호로 학생이 한 명만 정해지면(더 긴 번호의 앞자리가 아니면) 확인 없이 처리. 6자리가 차도 처리
    if (shouldSubmitNow(next, byCode, longerPrefixes)) {
      processCode(next);
      return;
    }
    changeDigits(next);
  }

  function erase() {
    wakeAudio();
    changeResult(null);
    changeDigits(input.current.slice(0, -1));
  }

  function submit() {
    wakeAudio();
    if (input.current.length < MIN_LEN) return;
    processCode(input.current);
  }

  function processCode(code: string) {
    changeDigits("");

    const student = byCode.get(code);
    if (!student) {
      show({ kind: "unknown" });
      return;
    }

    const now = Date.now();
    const key = `${todayKST()}:${student.id}`;
    const prev = log.current[key];
    if (prev && now - prev.lastAt < REPEAT_BLOCK_MS) {
      show({ kind: "recent", name: student.name });
      return;
    }

    const count = (prev?.count ?? 0) + 1;
    log.current[key] = { count, lastAt: now };
    if (count === 1) show({ kind: "in", name: student.name, time: nowTimeKST() });
    else if (count === 2) show({ kind: "out", name: student.name, time: nowTimeKST() });
    else show({ kind: "done", name: student.name });
  }

  // 태블릿에 키보드를 연결해도 쓸 수 있게: 숫자, Backspace, Enter, Esc(모두 지우기)
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    // 키를 누르고 있어 같은 숫자가 반복 입력되는 것은 무시
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (/^[0-9]$/.test(e.key)) pressDigit(e.key);
    else if (e.key === "Backspace") erase();
    else if (e.key === "Enter") submit();
    else if (e.key === "Escape") {
      changeResult(null);
      changeDigits("");
    } else return;
    // 초점이 있는 버튼이 Enter로 한 번 더 눌리지 않게
    e.preventDefault();
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 다른 번호의 앞자리라서 기다리는 중 (예: 1002를 눌렀는데 10024도 있음)
  const waiting = byCode.has(digits) && longerPrefixes.has(digits);

  const slots = Math.min(MAX_LEN, Math.max(MIN_LEN, digits.length + (digits.length < MAX_LEN ? 1 : 0)));

  return (
    <div className="flex min-h-dvh flex-col pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]">
      {/* 상단 줄: 로고 · 학원 이름 · 날짜와 시계. 10/5: 버건디 바 → 흰 바탕 (다른 화면의 흰 메뉴와 통일)
          휴대폰 세로(아이폰 시험)에서는 학원 이름을 빼고 "출결"만 보여 잘리지 않게 */}
      <header className="border-b border-line-soft bg-card pt-[env(safe-area-inset-top,0px)] text-ink">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:h-[72px] md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* 원본 PNG가 흰 배경이라 흰 바탕 위에 그대로 둔다 */}
            <Image src="/brand/leet-mark.png" alt="" width={407} height={512} priority className="h-8 w-auto shrink-0 md:h-9" />
            <p className="truncate text-heading font-bold md:text-title">
              <span className="hidden text-brand sm:inline">LEET영어학원 </span>출결
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 md:gap-5">
            {/* 소리 켜짐/꺼짐. 태블릿 음량도 켜 두어야 들린다 */}
            <button
              type="button"
              onClick={() => {
                wakeAudio();
                writeSoundOn(!soundOn);
              }}
              aria-pressed={soundOn}
              aria-label={soundOn ? "소리 켜짐 (누르면 끄기)" : "소리 꺼짐 (누르면 켜기)"}
              title="태블릿 음량도 켜 두세요"
              className={cn(
                "press flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-line px-3 text-body font-semibold hover:bg-bg",
                soundOn ? "text-ink" : "text-sub",
              )}
            >
              <SpeakerIcon on={soundOn} />
              <span className="hidden sm:inline">{soundOn ? "소리 켜짐" : "소리 꺼짐"}</span>
            </button>
            <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-baseline sm:gap-3">
              <span className="text-caption text-sub sm:text-body">{date ? formatDateKo(date) : " "}</span>
              <span className="text-[24px] font-bold tabular md:text-[28px]">{time || " "}</span>
            </div>
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
              "flex min-h-[232px] flex-1 flex-col items-center justify-center rounded-[var(--radius-card)] border px-5 py-6 text-center transition-colors duration-[var(--duration-fast)] md:min-h-[280px]",
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
                <p className="text-[20px] font-semibold text-sub md:text-[24px]">출결 번호를 누르세요</p>
                <div className="mt-5 flex gap-2 md:gap-3" aria-label={`입력한 번호 ${digits.length}자리`}>
                  {Array.from({ length: slots }, (_, i) => {
                    const filled = i < digits.length;
                    const next = i === digits.length;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "grid h-[72px] w-12 place-items-center rounded-[var(--radius-control)] border-2 bg-card text-[48px] leading-none font-bold tabular sm:w-14 md:h-[88px] md:w-16 md:text-[56px]",
                          filled ? "border-ink text-ink" : next ? "border-brand" : "border-line",
                        )}
                      >
                        {filled ? digits[i] : ""}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-5 text-body text-sub md:text-heading">
                  {waiting ? (
                    <>
                      번호가 더 있으면 이어서 누르고, 끝났으면 <b className="font-bold text-ink">확인</b>을 눌러 주세요
                    </>
                  ) : digits.length >= MIN_LEN ? (
                    <>
                      번호를 다 눌렀으면 <b className="font-bold text-ink">확인</b>을 눌러 주세요
                    </>
                  ) : (
                    <>번호를 누르면 바로 처리됩니다</>
                  )}
                </p>
              </>
            )}
          </div>
          <p className="hidden text-center text-body text-sub md:landscape:block">번호를 잊었으면 선생님께 말씀해 주세요.</p>
        </section>

        {/* 오른쪽(세로 화면에서는 아래): 숫자 패드 */}
        <section aria-label="숫자 패드" className="grid grid-cols-3 grid-rows-4 gap-2 md:gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onClick={() => pressDigit(d)} className="press-key border border-line bg-card text-[48px] font-bold text-ink md:text-[56px]">
              {d}
            </Key>
          ))}
          <Key onClick={erase} aria-label="한 자리 지우기" className="press-key flex items-center justify-center gap-2 border border-line bg-card text-[24px] font-semibold text-ink md:text-[28px]">
            <Delete aria-hidden className="size-7 text-sub md:size-8" />
            {/* 휴대폰 세로는 칸이 좁아 그림만 (화면 읽기는 aria-label) */}
            <span className="hidden sm:inline">지우기</span>
          </Key>
          <Key onClick={() => pressDigit("0")} className="press-key border border-line bg-card text-[48px] font-bold text-ink md:text-[56px]">
            0
          </Key>
          <Key
            onClick={submit}
            disabled={digits.length < MIN_LEN}
            className="press bg-brand text-[24px] font-bold text-white active:bg-brand-dark disabled:bg-line-soft disabled:text-sub md:text-[28px]"
          >
            확인
          </Key>
        </section>

        <p className="text-center text-body text-sub md:landscape:hidden">번호를 잊었으면 선생님께 말씀해 주세요.</p>
      </main>
    </div>
  );
}

/** 스피커 그림 (꺼짐이면 X 표시) */
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5m0-5-5 5" />}
    </svg>
  );
}

/** 숫자 패드 한 칸. 휴대폰 72px, 태블릿 88px 이상 (docs/design.md 2번 키패드) */
function Key({ className, ...rest }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "min-h-[72px] touch-manipulation rounded-[var(--radius-card)] leading-none select-none disabled:cursor-not-allowed md:min-h-[88px]",
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
        <p className="text-[40px] leading-tight font-bold text-brand md:text-[48px]">등록되지 않은 번호입니다.</p>
        <p className="mt-2 text-[20px] font-semibold text-ink md:text-[24px]">다시 입력해 주세요.</p>
      </>
    );
  }

  const tone = result.kind === "in" || result.kind === "out" ? "text-ok" : "text-warn";
  const message =
    result.kind === "in" ? "등원했습니다" : result.kind === "out" ? "하원했습니다" : result.kind === "done" ? "이미 하원했습니다" : "방금 처리되었습니다";

  return (
    <>
      {(result.kind === "in" || result.kind === "out") && <Check aria-hidden className="mb-1 size-9 text-ok" strokeWidth={2.5} />}
      <p className="text-[40px] leading-tight font-bold text-ink md:text-[48px]">{result.name} 학생</p>
      <p className={cn("mt-1 text-[40px] leading-tight font-bold md:text-[48px]", tone)}>{message}</p>
      {"time" in result && <p className="mt-3 text-[24px] font-semibold text-ink tabular md:text-[28px]">{result.time}</p>}
      {result.kind === "recent" && <p className="mt-3 text-[20px] text-sub md:text-[24px]">같은 번호는 1분 뒤에 다시 누를 수 있습니다.</p>}
      {result.kind === "done" && <p className="mt-3 text-[20px] text-sub md:text-[24px]">잘못 눌렀다면 선생님께 말씀해 주세요.</p>}
    </>
  );
}
