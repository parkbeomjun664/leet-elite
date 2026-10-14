// 숙제 목록의 제출 현황 기준 (HW-04, 10/14)

/** 매일 숙제의 "제출 현황" 기준 날짜: 오늘이 기간 안이면 오늘, 지났으면 마지막 날, 아직 전이면 첫날 */
export function statusDate(startsOn: string, endsOn: string, today: string): string {
  if (today < startsOn) return startsOn;
  if (today > endsOn) return endsOn;
  return today;
}
