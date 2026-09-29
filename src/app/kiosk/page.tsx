import { KioskKeypad, type KioskStudent } from "@/components/kiosk/keypad";
import { students } from "@/lib/mock/data";

// 출결 키패드 (KIOSK-01~04). 지금은 화면 확인용 시제품이라 가상 데이터로 코드를 찾는다.
// TODO(3단계): 실제 버전은 학생 목록을 내려보내지 않는다. 키패드 계정은 어떤 테이블도 읽지 못하고
// 서버 함수 kiosk_check(code)만 호출한다. 이 함수가 코드로 학생을 찾아 등원·하원을 기록하고
// 학생 이름과 시각만 돌려준다 (docs/data-model.md, KIOSK-06)
export default function KioskPage() {
  // 재원생만, 코드·이름·ID만 넘긴다 (전화번호 등 다른 정보는 넘기지 않는다)
  const list: KioskStudent[] = students
    .filter((s) => s.status === "enrolled")
    .map((s) => ({ id: s.id, code: s.attendanceCode, name: s.name }));

  return <KioskKeypad students={list} />;
}
