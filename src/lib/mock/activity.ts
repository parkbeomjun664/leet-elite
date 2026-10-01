// 숙제·제출·메시지·보강 가상 데이터 (화면 설계용). 날짜는 오늘 기준으로 계산한다.

import type { Homework, Makeup, Message, Submission } from "./types";
import { addDays, todayKST } from "../date";
import { classes, students, studentsOfTeacher, teachers } from "./data";

const today = todayKST();
const d = (n: number) => addDays(today, n);

function studentsOfClass(classId: string) {
  return students.filter((s) => s.status === "enrolled" && s.classIds.includes(classId)).map((s) => s.id);
}

// 반마다 최근 숙제 몇 개 (일반 + 매일)
const HW_TEMPLATES = [
  { kind: "daily" as const, title: "단어 암기 30개", body: "클래스카드 Day 12 단어 30개 암기 후 테스트 캡처 올리기" },
  { kind: "general" as const, title: "리딩 워크북 p.24~27", body: "문제 풀고 채점까지 한 페이지 사진으로 올리기" },
  { kind: "general" as const, title: "문법 복습: 현재완료", body: "교재 3과 연습문제 A, B. 틀린 문제 오답 정리" },
  { kind: "daily" as const, title: "영어 일기 3문장", body: "오늘 있었던 일을 영어 3문장으로 쓰기" },
  { kind: "general" as const, title: "듣기 받아쓰기 Unit 5", body: "음원 2번 듣고 받아쓰기, 틀린 부분 빨간 펜" },
];

export const homework: Homework[] = classes.flatMap((c, ci) =>
  HW_TEMPLATES.slice(0, 3 + (ci % 3)).map((t, i) => ({
    id: `hw-${c.id}-${i}`,
    kind: t.kind,
    title: t.kind === "daily" ? `${d(-i).slice(5).replace("-", "/")} ${t.title}` : t.title,
    body: t.body,
    createdOn: d(-i * 2),
    createdBy: c.teacherId ?? teachers[0].id,
    studentIds: studentsOfClass(c.id),
  })),
);

// 숙제마다 대상 학생의 약 90%가 제출. 제출 시각은 13~22시에 퍼지게 (오후 시연에서도 제출이 보이도록)
export const submissions: Submission[] = homework.flatMap((hw, hi) =>
  hw.studentIds
    .filter((_, si) => (si * 7 + hi * 3) % 10 < 9)
    .map((studentId, si) => ({
      homeworkId: hw.id,
      studentId,
      submittedAt: `${hw.createdOn} ${String(13 + ((si * 3) % 10)).padStart(2, "0")}:${String((si * 13) % 60).padStart(2, "0")}`,
      comment: si % 3 === 0 ? "어려운 단어 표시해 뒀어요!" : "",
      photoCount: 1 + (si % 4),
      teacherComment: si % 2 === 0 ? "잘했어요. 틀린 문제 다시 확인해 보세요." : null,
    })),
);

export const submissionOf = (homeworkId: string, studentId: string) =>
  submissions.find((s) => s.homeworkId === homeworkId && s.studentId === studentId) ?? null;

export const homeworkOfStudent = (studentId: string) =>
  homework.filter((h) => h.studentIds.includes(studentId)).sort((a, b) => b.createdOn.localeCompare(a.createdOn));

// 학생의 담당 선생님 (첫 번째 반 기준). 메시지는 담당 선생님 이름(닉네임)으로 보낸다
const teacherOf = (studentId: string) => {
  const s = students.find((x) => x.id === studentId);
  const cls = classes.find((c) => c.id === s?.classIds[0]);
  return teachers.find((t) => t.id === cls?.teacherId) ?? teachers[0];
};

// 학부모가 보내는 연락 문구 (학생마다 조금씩 다르게)
const PARENT_NOTES = [
  "선생님, 이번 주 목요일은 학교 행사가 있어서 30분 늦을 것 같아요.",
  "오늘 병원 예약이 있어서 수업 끝나기 20분 전에 데리러 가겠습니다.",
  "숙제 사진이 잘 안 올라간다고 하는데 확인 부탁드려요.",
];

// 학생별 학부모 대화 (앞쪽 학생 일부). read = 받는 쪽이 읽었는지
// 시연용 학생·학부모(s001, 쌍둥이 s003·s004)는 학원에서 온 안 읽은 메시지가 보이도록 넣는다
const DEMO_IDS = new Set(["s001", "s003", "s004"]);
export const messages: Message[] = students.slice(0, 40).flatMap((s, i) => {
  if (i % 3 !== 0 && !DEMO_IDS.has(s.id)) return [];
  const teacher = teacherOf(s.id);
  const list: Message[] = [
    { id: `m-${s.id}-1`, studentId: s.id, room: "family", from: "teacher", senderName: teacher.nickname, body: `${s.name} 학생 오늘 단어 테스트 만점이었어요. 칭찬 많이 해 주세요.`, sentAt: `${d(-2)} 18:20`, read: true },
    { id: `m-${s.id}-2`, studentId: s.id, room: "family", from: "parent", senderName: `${s.name} 어머님`, body: "감사합니다! 집에서도 칭찬해 줄게요.", sentAt: `${d(-2)} 19:05`, read: true },
  ];
  if (i % 2 === 0) {
    list.push({ id: `m-${s.id}-3`, studentId: s.id, room: "family", from: "parent", senderName: `${s.name} 어머님`, body: PARENT_NOTES[i % PARENT_NOTES.length], sentAt: `${today} 09:12`, read: false });
  }
  if (DEMO_IDS.has(s.id)) {
    list.push({ id: `m-${s.id}-4`, studentId: s.id, room: "family", from: "teacher", senderName: teacher.nickname, body: "이번 주 금요일에 단원 평가가 있어요. 3과 단어를 복습해 오세요.", sentAt: `${today} 13:40`, read: false });
  }
  return list;
});

// 학생 대화방 (학원 ↔ 학생, MSG-05). 시연용 학생과 앞쪽 학생 몇 명
for (const [i, s] of students.slice(0, 12).entries()) {
  if (i % 4 !== 0 && !DEMO_IDS.has(s.id)) continue;
  const teacher = teacherOf(s.id);
  messages.push(
    { id: `ms-${s.id}-1`, studentId: s.id, room: "student", from: "teacher", senderName: teacher.nickname, body: "오늘 숙제 사진이 흐려서 잘 안 보여요. 밝은 곳에서 다시 찍어 올려 줄래요?", sentAt: `${d(-1)} 20:10`, read: true },
    { id: `ms-${s.id}-2`, studentId: s.id, room: "student", from: "student", senderName: s.name, body: "네! 다시 올렸어요.", sentAt: `${d(-1)} 20:25`, read: true },
    { id: `ms-${s.id}-3`, studentId: s.id, room: "student", from: "teacher", senderName: teacher.nickname, body: "확인했어요. 잘했어요. 내일 단어 시험 준비해 오세요.", sentAt: `${today} 12:05`, read: false },
  );
}

/** room: family = 학부모 대화방(기본), student = 학생 대화방 */
export const messagesOf = (studentId: string, room: "family" | "student" = "family") =>
  messages.filter((m) => m.studentId === studentId && m.room === room);
/** 원장님 홈: 안 읽은 학부모·학생 메시지 */
export const unreadCount = () => messages.filter((m) => (m.from === "parent" || m.from === "student") && !m.read).length;

// 보강: 오늘 2건 + 이번 주 몇 건
export const makeups: Makeup[] = [
  { id: "mk1", studentId: "s010", teacherId: "t1", date: today, start: "17:00", durationMin: 60, reason: "지난주 결석 보강", status: "scheduled" },
  { id: "mk2", studentId: "s045", teacherId: "t3", date: today, start: "20:30", durationMin: 60, reason: "시험 대비", status: "scheduled" },
  { id: "mk3", studentId: "s020", teacherId: "t2", date: d(2), start: "16:00", durationMin: 90, reason: "진도 보충", status: "scheduled" },
  { id: "mk4", studentId: "s057", teacherId: "t4", date: d(-3), start: "18:00", durationMin: 60, reason: "결석 보강", status: "done" },
  // 시연용 학생·학부모 화면에 보이도록
  { id: "mk5", studentId: "s001", teacherId: "t1", date: d(3), start: "15:00", durationMin: 50, reason: "진도 보충", status: "scheduled" },
  { id: "mk6", studentId: "s003", teacherId: "t1", date: d(1), start: "16:00", durationMin: 60, reason: "지난주 결석 보강", status: "scheduled" },
];

export const makeupsOf = (studentId: string) => makeups.filter((m) => m.studentId === studentId);

export { studentsOfTeacher };
