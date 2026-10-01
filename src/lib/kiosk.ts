// 출결 키패드 "바로 처리" 규칙 (KIOSK, 10/1 결정). 화면과 테스트가 같은 규칙을 쓰도록 따로 둔다

export const KIOSK_MIN_LEN = 4;
export const KIOSK_MAX_LEN = 6;

/** 더 긴 번호의 앞자리인 번호들 (예: 10024가 있으면 1002). 이 번호에서는 바로 처리하지 않고 [확인]을 기다린다 */
export function longerPrefixesOf(codes: Iterable<string>): Set<string> {
  const set = new Set<string>();
  for (const code of codes) for (let i = KIOSK_MIN_LEN; i < code.length; i++) set.add(code.slice(0, i));
  return set;
}

/** 지금까지 누른 번호로 바로 처리할지: 학생이 한 명만 정해지고 더 긴 번호의 앞자리가 아니면, 또는 6자리가 차면 */
export function shouldSubmitNow(input: string, codes: { has(code: string): boolean }, longerPrefixes: Set<string>): boolean {
  if (input.length >= KIOSK_MAX_LEN) return true;
  return codes.has(input) && !longerPrefixes.has(input);
}
