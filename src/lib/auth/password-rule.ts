// 새 비밀번호 규칙 (AUTH-03). 학생도 쓰므로 너무 까다롭지 않게: 6자 이상, 아이디와 다르게, 같은 글자 반복 금지
export const PASSWORD_MIN = 6;

export function passwordProblem(pw: string, loginId: string): string | null {
  if (pw.length < PASSWORD_MIN) return `${PASSWORD_MIN}자 이상으로 정해 주세요.`;
  if (pw.length > 72) return "72자 이하로 정해 주세요.";
  if (/^(.)\1+$/.test(pw)) return "같은 글자만 반복할 수 없어요.";
  if (loginId && pw.toLowerCase() === loginId.toLowerCase()) return "아이디와 다르게 정해 주세요.";
  return null;
}
