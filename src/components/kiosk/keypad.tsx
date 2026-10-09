"use client";

import { Delete } from "lucide-react";
import Image from "next/image";
import { useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore, type ComponentProps } from "react";
import { KioskDoneScreen, DONE_SCREEN_MS, type DoneResult } from "@/components/kiosk/result-overlay";
import { cn } from "@/lib/cn";
import { addMinutes, nowTimeKST, todayKST, weekdayOf } from "@/lib/date";
import { KIOSK_CODE_LEN, shouldSubmitNow } from "@/lib/kiosk";

/**
 * 키패드에 넘기는 학생 정보. 코드로 찾는 데 필요한 것과 등원 화면에 보일 요일별 수업 시각만 (전화번호 등은 넘기지 않는다)
 * TODO(3단계): kiosk_check(code)가 이름·시각·오늘 수업 시간만 돌려준다
 */
export type KioskStudent = { id: string; code: string; name: string; schedule?: { weekday: number; start: string; durationMin: number }[] };

const FILL_SHOW_MS = 180; // 4번째 숫자가 칸에 들어간 것을 잠깐 보여 준 뒤 처리
const IDLE_CLEAR_MS = 10000; // 누르다 만 번호를 지우기까지 시간
const REPEAT_BLOCK_MS = 60_000; // 같은 코드를 1분 안에 다시 누르면 기록하지 않음 (KIOSK-04)
const BYE_MESSAGE = "오늘도 수고했어요, 조심히 가요";

// 등원·하원은 전체 화면(DoneResult), 나머지는 입력 칸 자리에서 짧게 알린다 (10/5, 토스 참고)
type Result =
  | DoneResult
  | { kind: "done"; name: string }
  | { kind: "recent"; name: string; label: "등원" | "하원"; time: string }
  | { kind: "unknown"; code: string };

/** 결과를 보여 주는 시간 */
const RESULT_MS: Record<Result["kind"], number> = { in: DONE_SCREEN_MS, out: DONE_SCREEN_MS, recent: 2000, done: 3000, unknown: 1500 };

type Entry = { count: number; lastAt: number; time: string };

/** 오늘 수업 시간 "오늘 수업 15:00~16:30" (없으면 빈 글) */
function todayClassLabel(student: KioskStudent) {
  const wd = weekdayOf(todayKST());
  const slot = student.schedule?.find((s) => s.weekday === wd);
  return slot ? `오늘 수업 ${slot.start}~${addMinutes(slot.start, slot.durationMin)}` : "";
}

// ── 소리 (KIOSK-03 보조) ───────────────────────────────────
// 소리 파일 없이 Web Audio로 짧은 음을 만든다. 브라우저는 사용자가 누르기 전에는 소리를 막으므로
// 첫 키를 누를 때 AudioContext를 만든다.
type Sound = "ok" | "bye" | "notice" | "error";
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
    // 성공: 도-미-솔로 올라가는 밝은 차임 (마지막 음은 길게 울림)
    tone(0, 1046.5, 0.14);
    tone(0.11, 1318.5, 0.14);
    tone(0.22, 1568, 0.42);
  } else if (sound === "bye") {
    // 하원: 솔-미로 내려가는 부드러운 두 음
    tone(0, 1568, 0.16);
    tone(0.15, 1318.5, 0.36);
  } else if (sound === "notice") {
    // 이미 처리됨: 가운데 음 하나
    tone(0, 660, 0.22);
  } else {
    // 오류: 낮은 '삐-삐' 두 번
    tone(0, 180, 0.16, "square");
    tone(0.22, 180, 0.22, "square");
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

  const time = useSyncExternalStore(subscribeClock, () => nowTimeKST(), () => "");

  const [digits, setDigits] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  // 같은 결과가 연달아 나와도 효과가 다시 보이도록 결과마다 번호를 붙인다
  const [resultSeq, setResultSeq] = useState(0);
  // 오늘 누른 기록 (날짜:학생ID → 횟수·마지막 시각). 시제품이라 새로고침하면 사라진다
  // TODO(3단계): kiosk_check(code)가 DB의 오늘 출결 기록으로 등원·하원을 판단한다
  const log = useRef<Record<string, Entry>>({});

  // 빠르게 연달아 누를 때 화면이 다시 그려지기 전의 값을 읽지 않도록, 입력·결과 여부를 ref에도 같이 둔다
  const input = useRef("");
  const showing = useRef(false);
  // 4칸이 찬 뒤 처리하기까지 잠깐(0.18초) 다른 키를 받지 않는다
  const processing = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    setResultSeq((n) => n + 1);
    // 지원하는 태블릿(안드로이드)은 성공할 때 짧게 진동
    if (next.kind === "in" || next.kind === "out") {
      try {
        navigator.vibrate?.(40);
      } catch {
        // 진동이 안 되는 기기
      }
    }
    if (!soundOn || !audio.current) return;
    const sound: Sound = next.kind === "in" ? "ok" : next.kind === "out" ? "bye" : next.kind === "unknown" ? "error" : "notice";
    try {
      playSound(audio.current, sound);
    } catch {
      // 소리가 안 나도 출결 처리는 그대로
    }
  }

  // 결과는 몇 초 뒤 자동으로 처음 화면으로 (KIOSK-03). 등원·하원 2초(10/9), 없는 번호 1.5초
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => changeResult(null), RESULT_MS[result.kind]);
    return () => clearTimeout(t);
  }, [result, resultSeq]);

  // 누르다 만 번호는 잠시 뒤 지운다. 다음 학생 번호가 뒤에 붙지 않게
  useEffect(() => {
    if (!digits || result) return;
    const t = setTimeout(() => changeDigits(""), IDLE_CLEAR_MS);
    return () => clearTimeout(t);
  }, [digits, result]);

  useEffect(() => () => clearTimeout(processing.current ?? undefined), []);

  function pressDigit(d: string) {
    wakeAudio();
    if (processing.current) return;
    // 결과가 보이는 중에 다음 학생이 누르면 결과를 닫고 그 숫자부터 새로 입력
    const prev = showing.current ? "" : input.current;
    if (showing.current) changeResult(null);
    if (prev.length >= KIOSK_CODE_LEN) return;
    const next = prev + d;
    changeDigits(next);

    // 4칸이 다 차면 [확인] 없이 바로 처리 (10/5). 마지막 숫자가 칸에 들어간 것을 잠깐 보여 준 뒤
    if (shouldSubmitNow(next)) {
      processing.current = setTimeout(() => {
        processing.current = null;
        processCode(next);
      }, FILL_SHOW_MS);
    }
  }

  function erase() {
    wakeAudio();
    if (processing.current) return;
    changeResult(null);
    changeDigits(input.current.slice(0, -1));
  }

  function processCode(code: string) {
    changeDigits("");

    const student = byCode.get(code);
    if (!student) {
      // 없는 번호: 누른 번호를 빨간 칸에 남긴 채 흔들고 비운다
      show({ kind: "unknown", code });
      return;
    }

    const now = Date.now();
    const key = `${todayKST()}:${student.id}`;
    const prev = log.current[key];
    if (prev && now - prev.lastAt < REPEAT_BLOCK_MS) {
      show({ kind: "recent", name: student.name, label: prev.count === 1 ? "등원" : "하원", time: prev.time });
      return;
    }

    const count = (prev?.count ?? 0) + 1;
    const time = nowTimeKST();
    log.current[key] = { count, lastAt: now, time };
    if (count === 1) show({ kind: "in", name: student.name, time, detail: todayClassLabel(student) });
    else if (count === 2) show({ kind: "out", name: student.name, time, detail: BYE_MESSAGE });
    else show({ kind: "done", name: student.name });
  }

  // 태블릿에 키보드를 연결해도 쓸 수 있게: 숫자, Backspace, Esc(모두 지우기)
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    // 키를 누르고 있어 같은 숫자가 반복 입력되는 것은 무시
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (/^[0-9]$/.test(e.key)) pressDigit(e.key);
    else if (e.key === "Backspace") erase();
    else if (e.key === "Escape") {
      if (processing.current) return;
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


  return (
    <div className="flex min-h-dvh flex-col pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]">
      {/* 상단 줄: 로고와 현재 시각만 (10/9 출결 앱 패턴: 버튼 외 요소 최소화). 10/5: 버건디 바 → 흰 바탕
          소리 켜고 끄기는 태블릿마다 정하는 설정이라 작은 아이콘 버튼으로만 남긴다 */}
      <header className="border-b border-line-soft bg-card pt-[env(safe-area-inset-top,0px)] text-ink">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:h-[72px] md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* 원본 PNG가 흰 배경이라 흰 바탕 위에 그대로 둔다 */}
            <Image src="/brand/leet-mark.png" alt="" width={407} height={512} priority className="h-8 w-auto shrink-0 md:h-9" />
            <p className="flex items-baseline gap-1.5 truncate">
              <span className="text-[19px] font-extrabold tracking-tight text-brand md:text-[22px]">LEET</span>
              <span className="text-heading font-semibold text-ink md:text-title">영어학원</span>
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
                "press grid size-11 place-items-center rounded-[var(--radius-control)] hover:bg-bg",
                soundOn ? "text-ink" : "text-sub",
              )}
            >
              <SpeakerIcon on={soundOn} />
            </button>
            <span className="text-[24px] font-bold tabular md:text-[28px]">{time || " "}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1120px] flex-1 grid-rows-[auto_1fr] gap-4 p-4 md:gap-6 md:p-6 md:landscape:grid-cols-[1fr_minmax(0,1.05fr)] md:landscape:grid-rows-1 md:landscape:gap-8 md:landscape:py-8">
        {/* 왼쪽(세로 화면에서는 위): 입력한 번호 또는 결과 */}
        <section className="flex flex-col gap-3">
          {/* 입력 칸. 없는 번호·이미 처리는 이 자리에서 짧게 알린다 (등원·하원은 전체 화면, 아래 KioskDoneScreen) */}
          <div
            data-result={result && result.kind !== "in" && result.kind !== "out" ? result.kind : "none"}
            className="flex min-h-[232px] flex-1 flex-col items-center justify-center rounded-[var(--radius-card)] border border-line bg-card px-5 py-6 text-center md:min-h-[280px]"
          >
            <p className="text-[20px] font-semibold text-sub md:text-[24px]">출결 번호 4자리를 누르세요</p>
            {/* 없는 번호면 누른 번호를 빨간 칸에 남긴 채 좌우로 흔든다 */}
            <div
              key={result?.kind === "unknown" ? `shake-${resultSeq}` : "slots"}
              className={cn("mt-5 flex gap-2 md:gap-3", result?.kind === "unknown" && "animate-kiosk-shake")}
              role="group"
              aria-label={`입력한 번호 ${digits.length}자리`}
            >
              {Array.from({ length: KIOSK_CODE_LEN }, (_, i) => {
                const wrong = result?.kind === "unknown";
                const shown = wrong ? result.code[i] : digits[i];
                const next = !wrong && i === digits.length;
                return (
                  <span
                    key={i}
                    className={cn(
                      "grid h-[72px] w-14 place-items-center rounded-[var(--radius-control)] border-2 bg-card text-[48px] leading-none font-bold tabular transition-colors duration-[var(--duration-fast)] sm:w-16 md:h-[88px] md:w-[72px] md:text-[56px]",
                      wrong ? "border-brand bg-brand-tint text-brand" : shown ? "border-ink text-ink" : next ? "border-brand" : "border-line",
                    )}
                  >
                    {/* 숫자가 칸에 톡 들어가는 효과 */}
                    {shown && (
                      <span key={`${i}-${shown}`} className={wrong ? undefined : "animate-digit-in"}>
                        {shown}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            <p
              role="status"
              aria-live="polite"
              className={cn(
                "mt-5 min-h-[1.5em] text-body md:text-heading",
                result?.kind === "unknown" ? "font-semibold text-brand" : result?.kind === "recent" || result?.kind === "done" ? "font-semibold text-warn" : "text-sub",
              )}
            >
              {result?.kind === "unknown"
                ? "번호를 다시 확인해 주세요"
                : result?.kind === "recent"
                  ? `${result.name} 학생, 방금 ${result.label}했어요 (${result.time})`
                  : result?.kind === "done"
                    ? `${result.name} 학생은 이미 하원했어요. 잘못 눌렀다면 선생님께 말해 주세요`
                    : "4자리를 다 누르면 바로 처리돼요"}
            </p>
          </div>
        </section>

        {/* 오른쪽(세로 화면에서는 아래): 숫자 패드. [확인] 없이 4자리가 차면 처리 (10/5) → 맨 아래 줄은 0(두 칸)과 지우기 */}
        <section aria-label="숫자 패드" className="grid grid-cols-3 grid-rows-4 gap-2 md:gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <Key key={d} onClick={() => pressDigit(d)} className="press-key border border-line bg-card text-[48px] font-bold text-ink md:text-[56px]">
              {d}
            </Key>
          ))}
          <Key onClick={() => pressDigit("0")} className="press-key col-span-2 border border-line bg-card text-[48px] font-bold text-ink md:text-[56px]">
            0
          </Key>
          <Key onClick={erase} aria-label="한 자리 지우기" className="press-key flex items-center justify-center gap-2 border border-line bg-card text-[24px] font-semibold text-ink md:text-[28px]">
            <Delete aria-hidden className="size-7 text-sub md:size-8" />
            {/* 휴대폰 세로는 칸이 좁아 그림만 (화면 읽기는 aria-label) */}
            <span className="hidden sm:inline">지우기</span>
          </Key>
        </section>
      </main>

      {/* 등원·하원 완료: 숫자 패드까지 덮는 전체 화면 (토스 송금 완료 화면 참고, 10/5). 누르면 바로 닫힌다 */}
      {(result?.kind === "in" || result?.kind === "out") && <KioskDoneScreen key={resultSeq} result={result} onClose={() => changeResult(null)} />}
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

