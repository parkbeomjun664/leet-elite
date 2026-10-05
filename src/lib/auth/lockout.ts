// 로그인 시도 제한 (AUTH-10). 학생 비밀번호가 단순할 수 있어 무작정 대입을 막는다
// - 같은 아이디: 5번 연속 틀리면 10분 잠금, 성공하면 초기화
// - 같은 기기(IP): 10분 안에 20번 틀리면 10분 잠금 (여러 아이디를 돌려 가며 시도하는 경우)

export type Attempt = { fail_count: number; locked_until: string | null; updated_at: string };
export type Rule = { limit: number; windowMs: number; lockMs: number };

const MIN = 60 * 1000;
export const ID_RULE: Rule = { limit: 5, windowMs: Number.POSITIVE_INFINITY, lockMs: 10 * MIN };
export const IP_RULE: Rule = { limit: 20, windowMs: 10 * MIN, lockMs: 10 * MIN };

export const isLocked = (a: Attempt | null | undefined, now: Date) =>
  !!a?.locked_until && new Date(a.locked_until).getTime() > now.getTime();

/** 한 번 더 틀렸을 때의 기록. 잠금이 끝났거나 기간이 지난 기록은 1부터 다시 센다 */
export function afterFailure(a: Attempt | null | undefined, now: Date, rule: Rule): Attempt {
  const t = now.getTime();
  const lockEnded = !!a?.locked_until && new Date(a.locked_until).getTime() <= t;
  const stale = !!a && t - new Date(a.updated_at).getTime() > rule.windowMs;
  const count = !a || lockEnded || stale ? 1 : a.fail_count + 1;
  return {
    fail_count: count,
    locked_until: count >= rule.limit ? new Date(t + rule.lockMs).toISOString() : null,
    updated_at: now.toISOString(),
  };
}
