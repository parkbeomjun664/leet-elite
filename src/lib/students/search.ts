// 재원생 검색 (STU-06 이름·학교·전화·메모, 10/8): 초성("ㅈㄴㅇ" → 조나윤), 휴대폰 뒷자리, 출결 번호, 보호자까지

const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** 한글 글자를 초성으로 바꾼다. 다른 글자는 그대로 (글자 수가 같아서 찾은 위치를 원래 글자에 그대로 쓸 수 있다) */
export function toChoseong(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    out += code >= HANGUL_START && code <= HANGUL_END ? CHOSEONG[Math.floor((code - HANGUL_START) / 588)] : ch;
  }
  return out;
}

/** 초성만으로 된 검색어인지 ("ㅈㄴ" 예, "조ㄴ" 아니오) */
export const isChoseongQuery = (q: string) => /^[ㄱ-ㅎ]+$/.test(q);

const digitsOf = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export type SearchTarget = {
  name: string;
  school: string | null;
  grade: string | null;
  phone: string | null;
  attendanceCode: string;
  memo: string;
  guardians: { name: string; phone1: string | null }[];
};

/** 어느 칸에서 찾았는지. 카드에 안 보이는 칸(휴대폰·메모·보호자)이면 카드에 한 줄로 알려 준다 */
export type SearchHit = { field: "name" | "school" | "phone" | "code" | "memo" | "guardian"; label: string; text: string };

/**
 * 학생이 검색어에 맞는지. 맞으면 처음 맞은 칸을, 아니면 null
 * - 초성만 쓰면 이름 초성으로 ("ㅈㄴㅇ")
 * - 숫자(하이픈 섞여도)면 휴대폰·출결 번호·보호자 전화 ("1006", "5550-10")
 * - 그 밖에는 이름·학교·학년·메모·보호자 이름에 들어 있는지
 */
export function matchStudent(s: SearchTarget, rawQuery: string): SearchHit | null {
  const q = rawQuery.trim();
  if (!q) return null;

  if (isChoseongQuery(q)) {
    return toChoseong(s.name).includes(q) ? { field: "name", label: "이름", text: s.name } : null;
  }

  const qDigits = digitsOf(q);
  if (/^[\d\s-]+$/.test(q) && qDigits.length >= 2) {
    if (s.attendanceCode.includes(qDigits)) return { field: "code", label: "출결", text: s.attendanceCode };
    if (digitsOf(s.phone).includes(qDigits)) return { field: "phone", label: "휴대폰", text: s.phone! };
    const g = s.guardians.find((x) => digitsOf(x.phone1).includes(qDigits));
    if (g) return { field: "guardian", label: "보호자", text: `${g.name} ${g.phone1}` };
    return null;
  }

  if (s.name.includes(q)) return { field: "name", label: "이름", text: s.name };
  const schoolGrade = [s.school, s.grade].filter(Boolean).join(" ");
  if (schoolGrade.includes(q)) return { field: "school", label: "학교", text: schoolGrade };
  if (s.memo.includes(q)) return { field: "memo", label: "메모", text: s.memo };
  const g = s.guardians.find((x) => x.name.includes(q));
  if (g) return { field: "guardian", label: "보호자", text: `${g.name}${g.phone1 ? ` ${g.phone1}` : ""}` };
  return null;
}

/**
 * 글자 안에서 검색어가 있는 자리 [시작, 끝). 굵게 보여 줄 때 쓴다. 없으면 null
 * 초성 검색이면 초성으로 바꾼 글자에서 찾고(글자 수가 같다), 숫자 검색이면 하이픈을 건너뛰며 찾는다
 */
export function findRange(text: string, rawQuery: string): [number, number] | null {
  const q = rawQuery.trim();
  if (!q || !text) return null;
  if (isChoseongQuery(q)) {
    const i = toChoseong(text).indexOf(q);
    return i < 0 ? null : [i, i + q.length];
  }
  const direct = text.indexOf(q);
  if (direct >= 0) return [direct, direct + q.length];
  // "10061" → "010-5550-1006"처럼 하이픈을 사이에 둔 숫자
  const qDigits = digitsOf(q);
  if (!/^[\d\s-]+$/.test(q) || qDigits.length < 2) return null;
  const positions: number[] = []; // 숫자만 모은 글자의 각 자리 → 원래 글자의 자리
  for (let i = 0; i < text.length; i++) if (/\d/.test(text[i])) positions.push(i);
  const at = digitsOf(text).indexOf(qDigits);
  return at < 0 ? null : [positions[at], positions[at + qDigits.length - 1] + 1];
}
