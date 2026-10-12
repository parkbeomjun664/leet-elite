// 반 색 (10/12 원장 홈 v4): 반마다 한 쌍(연한 톤 / 진한 톤). 시간표 점과 처리할 일 아바타에서 같은 반은 같은 색
// 색 값은 globals.css 토큰 --color-class-N-*. Tailwind가 클래스를 찾을 수 있게 전체 이름을 적어 둔다
// 반 정렬 순서(sortOrder)로 6색을 돌려 쓴다 (반이 7개 이상이면 같은 색이 다시 나오지만, 같은 요일에 겹치지 않게 순서를 잡는다)

export type ClassTone = { bg: string; fg: string; text: string; dot: string };

const TONES: ClassTone[] = [
  { bg: "bg-class-1-bg", fg: "text-class-1-fg", text: "text-class-1-text", dot: "bg-class-1-fg" },
  { bg: "bg-class-2-bg", fg: "text-class-2-fg", text: "text-class-2-text", dot: "bg-class-2-fg" },
  { bg: "bg-class-3-bg", fg: "text-class-3-fg", text: "text-class-3-text", dot: "bg-class-3-fg" },
  { bg: "bg-class-4-bg", fg: "text-class-4-fg", text: "text-class-4-text", dot: "bg-class-4-fg" },
  { bg: "bg-class-5-bg", fg: "text-class-5-fg", text: "text-class-5-text", dot: "bg-class-5-fg" },
  { bg: "bg-class-6-bg", fg: "text-class-6-fg", text: "text-class-6-text", dot: "bg-class-6-fg" },
];

/** 반 정렬 순서(1부터) → 색. 없으면 첫 색 */
export function classTone(sortOrder: number | null | undefined): ClassTone {
  const i = sortOrder && sortOrder > 0 ? (sortOrder - 1) % TONES.length : 0;
  return TONES[i];
}

/** 반 약칭 (아바타 글자): "중등(브릿지)" → "브릿지", "OB-초중" → "초중", "고등-코어" → "코어", 나머지는 앞 3글자 */
export function classShort(name: string): string {
  const inParen = name.match(/\(([^)]+)\)/);
  if (inParen) return inParen[1].trim().slice(0, 3);
  const afterDash = name.split("-").pop()!.trim();
  return afterDash.slice(0, 3);
}
