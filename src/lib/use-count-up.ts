"use client";

import { useEffect, useRef, useState } from "react";

// 숫자가 바뀔 때 이전 값에서 새 값까지 250ms 동안 세어 올라간다 (10/12 원장 홈 v3)
// 처음 그릴 때는 바로 그 값(서버와 같은 글자 → 하이드레이션 어긋남 없음). 움직임 줄이기 설정이면 바로 바뀐다

const DURATION = 250;

/** t(0~1)에서의 값. 끝으로 갈수록 느려지는 ease-out */
export function countUpAt(from: number, to: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return Math.round(from + (to - from) * (1 - (1 - k) ** 3));
}

export function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 움직임 줄이기면 세지 않고 바로 새 값 (브라우저 설정은 효과 안에서만 알 수 있음)
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = (now - start) / DURATION;
      setShown(countUpAt(from, value, t));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return shown;
}
