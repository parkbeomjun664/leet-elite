"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCountUp } from "@/lib/use-count-up";

// 원장 홈의 움직이는 작은 부품 (10/12 v5): 나머지는 서버에서 그린다

/** 숫자가 바뀌면 250ms 동안 세어 올라간다 (움직임 줄이기면 바로) */
export function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value)}</>;
}

/** 1분마다 화면 데이터를 새로 불러온다 (숫자·기준 시각). 시연 시각(?at=)이면 멈춘다 */
export function AutoRefresh({ demo }: { demo: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (demo) return;
    const t = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(t);
  }, [demo, router]);
  return null;
}
