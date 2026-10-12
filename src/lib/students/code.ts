// 출결 번호 추천 (STU-02, 10/12 학생 등록): 숫자 4자리, 재원·예정 학생끼리 겹치지 않게
// 1순위 = 학생 휴대폰 뒷 4자리(원장님 기존 방식, decisions 9/29), 겹치거나 없으면 1001부터 비어 있는 첫 번호

/** 휴대폰 뒷 4자리 ("010-5550-1234" → "1234"). 없으면 null */
export function phoneLast4(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 8 ? d.slice(-4) : null;
}

/**
 * 추천 출결 번호
 * @param used 이미 쓰는 번호 (재원·예정 학생)
 */
export function suggestCode(phone: string | null | undefined, used: ReadonlySet<string>): string {
  const last4 = phoneLast4(phone);
  if (last4 && !used.has(last4)) return last4;
  for (let n = 1001; n <= 9999; n++) {
    const c = String(n);
    if (!used.has(c)) return c;
  }
  // 9천 개가 다 찼을 일은 없지만, 그래도 빈 번호를 0으로 시작하는 쪽에서 찾는다
  for (let n = 0; n <= 1000; n++) {
    const c = String(n).padStart(4, "0");
    if (!used.has(c)) return c;
  }
  return "";
}
