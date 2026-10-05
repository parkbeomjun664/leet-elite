// 학원 발급 아이디 ↔ Supabase 로그인 이메일 (decisions.md 9/29: 아이디를 내부 이메일로 바꿔 이메일+비밀번호 인증)
// 메일을 보내지 않는 형식상 주소. 학원 도메인 아래라 남의 주소와 겹치지 않는다
export const LOGIN_EMAIL_DOMAIN = "login.leetenglish.kr";

/**
 * 입력한 아이디를 한 모양으로: 앞뒤 공백 제거, 소문자, 휴대폰 번호의 하이픈·공백 제거 (010-5550-1234 → 01055501234)
 * 쓸 수 없는 글자가 있으면 null (영문 소문자·숫자·. _ - 만, 2~40자)
 */
export function normalizeLoginId(raw: string): string | null {
  let id = raw.trim().toLowerCase();
  if (/^[0-9\s-]+$/.test(id)) id = id.replace(/[\s-]/g, "");
  return /^[a-z0-9._-]{2,40}$/.test(id) ? id : null;
}

export const toLoginEmail = (id: string) => `${id}@${LOGIN_EMAIL_DOMAIN}`;
