import { useEffect, useRef, useState } from "react";

/** 처음엔 빠르고 끝에서 천천히 (ease-out cubic). 0~1 → 0~1 */
export function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

/** from → to 사이 progress(0~1) 지점의 정수 */
export function tweenValue(from: number, to: number, progress: number) {
  const p = Math.min(Math.max(progress, 0), 1);
  return Math.round(from + (to - from) * easeOutCubic(p));
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 숫자가 바뀌면 이전 숫자에서 새 숫자로 세어 간다 (기본 250ms, docs/design.md 6번)
 * 처음 그릴 때는 바로 새 숫자. 움직임 줄이기 설정이면 바로 바뀐다
 */
export function useAnimatedNumber(value: number, duration = 250) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    let raf = 0;
    if (prefersReducedMotion() || duration <= 0) {
      raf = requestAnimationFrame(() => {
        from.current = value;
        setShown(value);
      });
      return () => cancelAnimationFrame(raf);
    }
    const t0 = performance.now();
    const step = (t: number) => {
      const p = (t - t0) / duration;
      const v = tweenValue(start, value, p);
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return shown;
}
