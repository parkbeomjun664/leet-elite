// 화면 개발·시연용 가상 학원 데이터. 실제 학생 정보는 쓰지 않는다.
// 이름·학교·전화번호는 모두 만들어 낸 값이며, 전화번호는 010-5550-xxxx 대역만 사용한다.
//
// 에듀OK 명단에서 확인한 실제 운영 패턴을 일부러 넣었다 (docs/reference-analysis.md):
// - 반 이름·구성은 에듀OK와 동일
// - 학생마다 수업 요일·시간이 다름
// - 형제가 보호자 번호를 공유 / 쌍둥이가 학생 번호를 공유
// - 휴대폰이 없는 학생, 전화 뒷 4자리(출결번호)가 겹치는 학생
// - 휴원·퇴원·예정 학생, OB 할인 메모

import type { Attendance, ClassRoom, Guardian, ScheduleSlot, Student, Teacher } from "./types";
import { addMinutes, todayKST, weekdayOf } from "../date";

// 같은 입력이면 항상 같은 결과를 내는 난수 (새로고침해도 데이터가 바뀌지 않도록)
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seeded(20260929);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const fakePhone = (n: number) => `010-5550-${String(n).padStart(4, "0")}`;
const last4 = (phone: string) => phone.slice(-4);

// ── 선생님 ────────────────────────────────────────────────
export const teachers: Teacher[] = [
  { id: "t1", realName: "김지현", nickname: "Jenny", phone: fakePhone(9001) },
  { id: "t2", realName: "이수민", nickname: "Sumin", phone: fakePhone(9002) },
  { id: "t3", realName: "박도윤", nickname: "Daniel", phone: fakePhone(9003) },
  { id: "t4", realName: "최하은", nickname: "Hannah", phone: fakePhone(9004) },
];

// ── 반 (에듀OK와 같은 이름) ────────────────────────────────
export const classes: ClassRoom[] = [
  { id: "c1", name: "OB-초저", teacherId: "t1", weekdays: [1, 3, 5], sortOrder: 1 },
  { id: "c2", name: "OB-초중", teacherId: "t1", weekdays: [1, 3, 5], sortOrder: 2 },
  { id: "c3", name: "OB-초고", teacherId: "t2", weekdays: [1, 3, 5], sortOrder: 3 },
  { id: "c4", name: "초중", teacherId: "t1", weekdays: [2, 4], sortOrder: 4 },
  { id: "c5", name: "초고", teacherId: "t2", weekdays: [2, 4], sortOrder: 5 },
  { id: "c6", name: "중등(브릿지)", teacherId: "t3", weekdays: [1, 2, 3, 4], sortOrder: 6 },
  { id: "c7", name: "고등-코어", teacherId: "t4", weekdays: [1, 3], sortOrder: 7 },
  { id: "c8", name: "고등-마스터", teacherId: "t4", weekdays: [2, 4], sortOrder: 8 },
  { id: "c9", name: "고등-포커스", teacherId: "t3", weekdays: [5, 6], sortOrder: 9 },
];

// 반별 학생 수, 학교, 학년, 기본 시간표 (에듀OK 반 인원 비율을 참고)
type ClassPlan = { classId: string; count: number; schools: string[]; grades: string[]; times: string[]; duration: number };
const plans: ClassPlan[] = [
  { classId: "c1", count: 2, schools: ["한빛초"], grades: ["초2"], times: ["14:00", "14:30"], duration: 60 },
  { classId: "c2", count: 8, schools: ["한빛초", "리트초"], grades: ["초3", "초4"], times: ["14:30", "15:00"], duration: 80 },
  { classId: "c3", count: 7, schools: ["한빛초", "리트초", "새봄초"], grades: ["초5", "초6"], times: ["15:30", "16:00"], duration: 80 },
  { classId: "c4", count: 4, schools: ["리트초"], grades: ["초3", "초4"], times: ["15:00"], duration: 90 },
  { classId: "c5", count: 12, schools: ["한빛초", "새봄초"], grades: ["초5", "초6"], times: ["15:40", "16:00", "16:30"], duration: 120 },
  { classId: "c6", count: 22, schools: ["푸른중", "새솔중", "누리중"], grades: ["중1", "중2", "중3"], times: ["17:00", "17:30", "18:00"], duration: 120 },
  { classId: "c7", count: 6, schools: ["해오름고", "청솔고"], grades: ["고1"], times: ["19:00", "19:30"], duration: 150 },
  { classId: "c8", count: 5, schools: ["해오름고", "청솔고"], grades: ["고1", "고2"], times: ["19:00"], duration: 150 },
  { classId: "c9", count: 2, schools: ["청솔고"], grades: ["고2"], times: ["10:00"], duration: 180 },
];

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"];
const GIVEN = ["서준", "하윤", "도윤", "서연", "시우", "지유", "하준", "수아", "지호", "하은", "예준", "윤서", "주원", "지우", "은우", "채원", "건우", "민서", "우진", "지안", "선우", "다은", "연우", "소율", "유준", "예린", "정우", "시아", "승현", "나윤", "지환", "가은", "현우", "수빈", "민재", "예나", "태윤", "서아", "지훈", "하린"];
const PROGRAMS = ["클래스카드", "클래스5", "오토보카"] as const;

// 반 요일 중 2~3개를 골라 학생 개인 시간표를 만든다 (학생마다 조금씩 다르게)
function makeSchedule(classRoom: ClassRoom, plan: ClassPlan): ScheduleSlot[] {
  const days = classRoom.weekdays.length > 2 ? classRoom.weekdays.filter(() => rand() > 0.3) : classRoom.weekdays;
  const chosen = days.length ? days : classRoom.weekdays.slice(0, 2);
  const start = pick(plan.times);
  return chosen.map((weekday) => ({
    weekday,
    // 요일마다 시작 시간이 10분 늦는 학생도 있다 (예: "화목 3~3:10에 시작")
    start: rand() > 0.85 ? addMinutes(start, 10) : start,
    durationMin: plan.duration,
  }));
}

function buildStudents(): Student[] {
  const list: Student[] = [];
  const usedNames = new Set<string>();
  let phoneSeq = 1000;
  let n = 0;
  for (const plan of plans) {
    const classRoom = classes.find((c) => c.id === plan.classId)!;
    for (let i = 0; i < plan.count; i++) {
      n += 1;
      let name = pick(SURNAMES) + pick(GIVEN);
      while (usedNames.has(name)) name = pick(SURNAMES) + pick(GIVEN);
      usedNames.add(name);
      const phone = fakePhone(phoneSeq++);
      list.push({
        id: `s${String(n).padStart(3, "0")}`,
        name,
        school: pick(plan.schools),
        grade: pick(plan.grades),
        phone,
        status: "enrolled",
        enrolledOn: `2026-0${3 + Math.floor(rand() * 6)}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
        leftOn: null,
        attendanceCode: last4(phone),
        programs: PROGRAMS.filter(() => rand() > 0.55),
        memo: "",
        classIds: [plan.classId],
        schedule: makeSchedule(classRoom, plan),
      });
    }
  }
  return list;
}

const students: Student[] = buildStudents();

// ── 에듀OK에서 본 까다로운 경우를 일부러 만든다 ─────────────
const byId = (id: string) => students.find((s) => s.id === id)!;

// 1) 휴대폰이 없는 학생 → 로그인 아이디를 따로 정해야 함
byId("s001").phone = null;
byId("s001").memo = "휴대폰 없음 (보호자 번호로 연락)";

// 2) 쌍둥이가 같은 학생 번호를 씀 → 전화번호를 로그인 아이디로 쓸 수 없음
//    출결 코드는 겹치면 안 되므로 동생은 다른 코드를 받는다
byId("s004").phone = byId("s003").phone;
// 쌍둥이 이름은 다른 학생과 겹치지 않게 드문 성으로 고정 (동명이인 예시는 따로 만들지 않는다)
byId("s003").name = "표승현";
byId("s004").name = "표준현";
byId("s003").memo = "쌍둥이 (같은 번호 사용)";
byId("s004").memo = "쌍둥이 (같은 번호 사용, 출결 코드 따로 지정)";

// 3) 전화 뒷 4자리가 다른 학생과 겹침 → 뒤에 등록한 학생은 원장님이 다른 코드를 지정
byId("s030").phone = "010-5551-1020";
byId("s020").phone = "010-5559-1020";

// 출결 코드: 전화 뒷 4자리가 기본, 이미 쓰는 코드면 5자리로 바꿔 겹치지 않게 (원장님이 수동으로 지정하는 상황을 흉내)
{
  const used = new Set<string>();
  for (const s of students) {
    let code = s.phone ? last4(s.phone) : String(1000 + Number(s.id.slice(1)));
    if (used.has(code)) code = `${code}${s.id.slice(-1)}`;
    s.attendanceCode = code;
    used.add(code);
  }
}

// 4) 여러 반에 속한 학생 (고등-코어 + 주말 고등-포커스)
byId("s057").classIds.push("c9");
byId("s057").schedule.push({ weekday: 6, start: "10:00", durationMin: 180 });

// 5) 휴원·퇴원·예정
byId("s012").status = "on_leave";
byId("s012").leftOn = "2026-09-10";
byId("s040").status = "withdrawn";
byId("s040").leftOn = "2026-07-13";
byId("s055").status = "withdrawn";
byId("s055").leftOn = "2026-08-31";
byId("s061").status = "pending";
byId("s061").enrolledOn = "2026-10-06";
byId("s061").memo = "10/6 시작";

// 6) OB 멤버 할인 메모
for (const s of students.filter((s) => s.classIds.some((c) => ["c1", "c2", "c3"].includes(c))).slice(0, 5)) {
  s.memo = s.memo || "OB 멤버: -2만원";
}

export { students };

// ── 보호자 (형제는 한 보호자에 연결) ────────────────────────
function buildGuardians(): Guardian[] {
  const list: Guardian[] = [];
  let g = 0;
  const siblingPairs: [string, string][] = [
    ["s003", "s004"], // 쌍둥이 (OB-초중)
    ["s010", "s031"], // OB-초중 + 초고
    ["s045", "s060"], // 중등(브릿지) + 고등-코어
  ];
  const paired = new Set(siblingPairs.flat());
  for (const [a, b] of siblingPairs) {
    g += 1;
    list.push({
      id: `g${String(g).padStart(3, "0")}`,
      name: `${byId(a).name}맘`,
      relation: "mother",
      phone1: fakePhone(7000 + g),
      phone2: null,
      studentIds: [a, b],
    });
    byId(b).memo = byId(b).memo || `${byId(a).name} 형제`;
  }
  for (const s of students) {
    if (paired.has(s.id)) continue;
    g += 1;
    const isFather = rand() > 0.85;
    list.push({
      id: `g${String(g).padStart(3, "0")}`,
      name: isFather ? `${s.name}(부)` : rand() > 0.5 ? "엄마" : `${s.name}맘`,
      relation: isFather ? "father" : "mother",
      phone1: fakePhone(7000 + g),
      phone2: rand() > 0.9 ? fakePhone(8000 + g) : null,
      studentIds: [s.id],
    });
  }
  return list;
}

export const guardians: Guardian[] = buildGuardians();

// ── 출결 기록 (날짜가 바뀌어도 그 날짜 기준으로 그럴듯하게 생성) ────
/**
 * @param nowTime 오늘을 볼 때 지금 시각 "HH:MM". 이 시각보다 뒤의 등원·하원은 아직 일어나지 않았으므로 만들지 않는다.
 *                지난 날짜를 볼 때는 생략한다.
 */
export function mockAttendanceFor(date: string = todayKST(), nowTime?: string): Attendance[] {
  const r = seeded(Number(date.replaceAll("-", ""))); // 날짜마다 항상 같은 결과
  const weekday = weekdayOf(date);
  const happened = (time: string) => nowTime === undefined || time <= nowTime;
  const records: Attendance[] = [];
  for (const s of students) {
    if (s.status !== "enrolled") continue;
    const slot = s.schedule.find((x) => x.weekday === weekday);
    if (!slot) continue;
    const roll = r();
    const checkIn = addMinutes(slot.start, Math.floor(r() * 15) - 5);
    const checkOut = r() > 0.5 ? addMinutes(slot.start, slot.durationMin + Math.floor(r() * 10)) : null;
    if (roll < 0.55 && happened(checkIn)) {
      records.push({
        studentId: s.id,
        date,
        checkInAt: checkIn,
        checkOutAt: checkOut && happened(checkOut) ? checkOut : null,
        status: "present",
        memo: "",
      });
    } else if (roll >= 0.55 && roll < 0.62) {
      const reasons = ["감기", "학교 행사", "가족 여행"];
      records.push({ studentId: s.id, date, checkInAt: null, checkOutAt: null, status: "absent", memo: reasons[Math.floor(r() * reasons.length)] });
    }
    // 나머지는 기록 없음 → 수업 시작이 지났으면 화면에서 "미등원"으로 계산
  }
  return records;
}

// ── 화면에서 자주 쓰는 조회 도우미 ─────────────────────────
export const teacherById = (id: string | null) => teachers.find((t) => t.id === id) ?? null;
export const classById = (id: string) => classes.find((c) => c.id === id) ?? null;
export const studentById = (id: string) => students.find((s) => s.id === id) ?? null;
export const guardiansOf = (studentId: string) => guardians.filter((g) => g.studentIds.includes(studentId));
/** 선생님의 담당 학생 = 담당 반에 속한 학생 */
export const studentsOfTeacher = (teacherId: string) => {
  const classIds = new Set(classes.filter((c) => c.teacherId === teacherId).map((c) => c.id));
  return students.filter((s) => s.classIds.some((c) => classIds.has(c)));
};
