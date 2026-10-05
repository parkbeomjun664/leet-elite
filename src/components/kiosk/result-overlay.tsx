import { cn } from "@/lib/cn";

// 출결 키패드 등원·하원 완료 화면 (10/5, 토스 송금 완료 화면 참고)
// - 숫자 패드까지 덮는 전체 화면. 체크 원이 튕기며 나오고 체크가 그려진 뒤, 글자가 한 줄씩 올라온다
// - 아래 진행 막대가 줄어드는 동안(2.5초) 보이고 자동으로 키패드로 돌아간다. 화면을 누르면 바로 닫힌다
// - 크기·위치·투명도·선 길이만 움직인다 (저가 태블릿). 움직임 줄이기 설정이면 완성된 화면만

export const DONE_SCREEN_MS = 2500;

export type DoneResult = {
  kind: "in" | "out";
  name: string;
  time: string; // "14:38"
  /** 등원: "오늘 수업 15:00~16:30" / 하원: 인사말 */
  detail: string;
};

const TONE = {
  in: { text: "text-ok", fill: "fill-ok", ring: "bg-ok/25", bar: "bg-ok", message: "등원했어요" },
  out: { text: "text-info", fill: "fill-info", ring: "bg-info/25", bar: "bg-info", message: "하원했어요" },
} as const;

/** 글자가 아래에서 올라오며 나타나는 순서 (ms) */
const rise = (delay: number) => ({ animation: `rise-in 250ms var(--ease-out) ${delay}ms both` });

export function KioskDoneScreen({
  result,
  onClose,
  contained = false,
}: {
  result: DoneResult;
  onClose: () => void;
  /** 미리보기용: 화면 전체 대신 감싼 상자 안에 그린다 */
  contained?: boolean;
}) {
  const tone = TONE[result.kind];
  return (
    <div
      role="status"
      aria-live="assertive"
      data-result={result.kind}
      onClick={onClose}
      className={cn(
        "z-40 flex animate-fade-in cursor-pointer flex-col items-center justify-center overflow-hidden bg-card px-6 text-center select-none",
        contained ? "absolute inset-0" : "fixed inset-0 pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
      )}
    >
      <SuccessMark fill={tone.fill} ring={tone.ring} />
      <p className="mt-6 text-[40px] leading-tight font-bold text-ink md:text-[48px]" style={rise(150)}>
        {result.name} 학생
      </p>
      <p className={cn("mt-1 text-[40px] leading-tight font-bold md:text-[48px]", tone.text)} style={rise(250)}>
        {tone.message}
      </p>
      <p className="mt-4 text-[24px] font-semibold text-ink tabular md:text-[28px]" style={rise(350)}>
        {result.time}
      </p>
      {result.detail && (
        <p className="mt-1 text-[20px] font-semibold text-sub text-balance md:text-[24px]" style={rise(420)}>
          {result.detail}
        </p>
      )}
      <p className="absolute bottom-8 text-body text-sub" style={rise(600)}>
        화면을 누르면 바로 닫혀요
      </p>
      {/* 돌아가기까지 남은 시간 */}
      <span
        aria-hidden
        className={cn("absolute inset-x-0 bottom-0 h-1.5 origin-left", tone.bar)}
        style={{ animation: `kiosk-progress ${DONE_SCREEN_MS}ms linear both` }}
      />
    </div>
  );
}

/** 체크 원: 0.85 → 1.08 → 1 튕기며 나오고(스프링), 체크 선이 그려지며 고리가 퍼진다 */
function SuccessMark({ fill, ring }: { fill: string; ring: string }) {
  return (
    <span className="relative grid size-24 animate-kiosk-badge place-items-center md:size-[120px]" aria-hidden>
      <span className={cn("absolute inset-0 animate-kiosk-ring rounded-full", ring)} />
      <svg viewBox="0 0 52 52" className="relative size-full">
        <circle cx="26" cy="26" r="25" className={fill} />
        <path d="M15 27l7 7 15-16" fill="none" className="animate-check-draw stroke-white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="36" />
      </svg>
    </span>
  );
}
