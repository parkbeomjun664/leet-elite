// 선생님 출퇴근 가상 기록 (TCH-03, TCH-04). 원장님 홈의 "선생님 출근 현황" 카드용.
// 날짜마다 항상 같은 결과: 4명 중 3명이 13:00~14:30 사이에 출근, 1명은 출근 기록 없음(휴무·지각 흉내).

import { teachers } from "./data";
import { todayKST } from "../date";

export type WorkLog = {
  teacherId: string;
  date: string; // 한국 날짜 YYYY-MM-DD
  checkInAt: string | null; // "HH:MM", 출근 전이면 null
  checkOutAt: string | null;
};

// 출근 시각 (앞에서부터 차례로 배정)
const CHECK_IN_TIMES = ["13:00", "13:40", "14:30"];
// 퇴근 시각 (밤 수업이 끝난 뒤)
const CHECK_OUT_TIMES = ["21:30", "22:00", "22:40"];

/**
 * @param nowTime 오늘을 볼 때 지금 시각 "HH:MM". 이 시각 뒤의 출근·퇴근은 아직 일어나지 않았으므로 만들지 않는다.
 *                지난 날짜를 볼 때는 생략한다.
 */
export function workLogsFor(date: string = todayKST(), nowTime?: string): WorkLog[] {
  const happened = (time: string) => nowTime === undefined || time <= nowTime;
  // 날짜 숫자로 출근하지 않는 선생님 한 명을 정한다 (날짜마다 바뀌지만 새로고침해도 같음)
  const offIndex = Number(date.replaceAll("-", "")) % teachers.length;
  let order = 0;
  return teachers.map((t, i) => {
    if (i === offIndex) return { teacherId: t.id, date, checkInAt: null, checkOutAt: null };
    const checkIn = CHECK_IN_TIMES[order];
    const checkOut = CHECK_OUT_TIMES[order];
    order += 1;
    return {
      teacherId: t.id,
      date,
      checkInAt: happened(checkIn) ? checkIn : null,
      checkOutAt: happened(checkIn) && happened(checkOut) ? checkOut : null,
    };
  });
}
