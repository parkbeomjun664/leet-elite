/** 어제와 비교 한 줄 (원장님 홈 숫자 아래, 10/9): "어제보다 +1" / "어제보다 -2" / "어제와 같음". 어제 숫자가 없으면 null(보여 주지 않음) */
export function diffLabel(value: number, prev: number | undefined | null): string | null {
  if (prev === undefined || prev === null) return null;
  const d = value - prev;
  return d === 0 ? "어제와 같음" : `어제보다 ${d > 0 ? "+" : ""}${d}`;
}
