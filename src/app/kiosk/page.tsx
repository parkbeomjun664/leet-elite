import { KioskKeypad, type KioskStudent } from "@/components/kiosk/keypad";
import { students } from "@/lib/mock/data";

// 출결 키패드 (KIOSK-01~04). 지금은 화면 확인용 시제품이라 가상 데이터로 코드를 찾는다.
// TODO(3단계): 실제 버전은 학생 목록을 내려보내지 않는다. 키패드 계정은 어떤 테이블도 읽지 못하고
// 서버 함수 kiosk_check(code)만 호출한다. 이 함수가 코드로 학생을 찾아 등원·하원을 기록하고
// 학생 이름과 시각만 돌려준다 (docs/data-model.md, KIOSK-06)
export default function KioskPage() {
  // 재원생만, 코드·이름·ID와 요일별 수업 시각만 넘긴다 (전화번호 등 다른 정보는 넘기지 않는다)
  // 수업 시각은 등원 화면의 "오늘 수업 15:00~16:30"용. 오늘이 무슨 요일인지는 태블릿에서 계산한다 (이 화면은 미리 만들어 두는 정적 페이지)
  const list: KioskStudent[] = students
    .filter((s) => s.status === "enrolled")
    .map((s) => ({ id: s.id, code: s.attendanceCode, name: s.name, schedule: s.schedule }));

  return <KioskKeypad students={list} />;
}
