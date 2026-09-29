/** 조건부 클래스 합치기: cn("a", ok && "b", null) → "a b" */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
