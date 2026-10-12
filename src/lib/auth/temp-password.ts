// 계정 발급·재설정 때 주는 임시 비밀번호 (AUTH-03·04, 10/13 범준님: 영문+숫자 8자)
// 카톡으로 불러 주거나 옮겨 적기 쉽게 헷갈리는 글자(0·o, 1·l·i)는 뺀다. 첫 로그인 때 바로 바꾸게 된다
export const TEMP_PASSWORD_LENGTH = 8;
const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALL = LETTERS + DIGITS;

/** 고르게 뽑은 0 ~ n-1 (crypto, 나머지 치우침 없이) */
function pick(n: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

/** 영문 소문자 + 숫자 8자. 영문과 숫자가 적어도 하나씩 들어간다 */
export function makeTempPassword(): string {
  for (;;) {
    const pw = Array.from({ length: TEMP_PASSWORD_LENGTH }, () => ALL[pick(ALL.length)]).join("");
    if (/[a-z]/.test(pw) && /[0-9]/.test(pw)) return pw;
  }
}
