// 화면 개발용 데이터 모양. docs/data-model.md 의 테이블과 같은 구조를 따른다.
// DB 연결 후에는 Supabase에서 생성한 타입으로 교체한다.

export type Role = "admin" | "teacher" | "student" | "parent";

export type StudentStatus = "enrolled" | "on_leave" | "withdrawn" | "pending";
export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  enrolled: "재원",
  on_leave: "휴원",
  withdrawn: "퇴원",
  pending: "예정",
};

export type AttendanceStatus = "present" | "absent" | "not_arrived";
export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "정상",
  absent: "결석",
  not_arrived: "미등원",
};

export type Teacher = {
  id: string;
  realName: string; // 원장님만 조회
  nickname: string; // 학생·학부모에게 보이는 이름
  phone: string;
};

export type ClassRoom = {
  id: string;
  name: string;
  teacherId: string | null;
  weekdays: number[]; // 0=일 ~ 6=토
  sortOrder: number;
};

export type ScheduleSlot = {
  weekday: number; // 0=일 ~ 6=토
  start: string; // "HH:MM"
  durationMin: number;
};

export type Student = {
  id: string;
  name: string;
  school: string | null;
  grade: string | null; // "초6", "중3", "고1"
  phone: string | null; // 없을 수 있고, 형제가 같은 번호를 쓸 수 있다
  status: StudentStatus;
  enrolledOn: string; // YYYY-MM-DD
  leftOn: string | null;
  attendanceCode: string; // 출결 코드 4~6자리. 전화 뒷 4자리 기본, 재원생끼리 겹치지 않음 (KIOSK)
  programs: string[];
  memo: string;
  classIds: string[];
  schedule: ScheduleSlot[];
};

export type Guardian = {
  id: string;
  name: string; // "OO맘"처럼 자유 텍스트
  relation: "mother" | "father" | "other" | null;
  phone1: string;
  phone2: string | null;
  studentIds: string[];
};

export type Homework = {
  id: string;
  kind: "general" | "daily"; // 일반 · 매일
  title: string;
  body: string;
  createdOn: string; // YYYY-MM-DD
  createdBy: string; // teacher id
  studentIds: string[];
};

export type Submission = {
  homeworkId: string;
  studentId: string;
  submittedAt: string; // "YYYY-MM-DD HH:MM"
  comment: string;
  photoCount: number;
  teacherComment: string | null;
};

export type Message = {
  id: string;
  studentId: string; // 학생별 학부모 대화방
  from: "parent" | "teacher" | "admin";
  senderName: string;
  body: string;
  sentAt: string; // "YYYY-MM-DD HH:MM"
  read: boolean;
  scheduledAt?: string; // 예약 발송
};

export type Makeup = {
  id: string;
  studentId: string;
  teacherId: string;
  date: string;
  start: string;
  durationMin: number;
  reason: string;
  status: "scheduled" | "done" | "cancelled";
};

export type Attendance = {
  studentId: string;
  date: string; // 한국 날짜 YYYY-MM-DD
  checkInAt: string | null; // "HH:MM" (화면용 단순화)
  checkOutAt: string | null;
  status: AttendanceStatus;
  memo: string;
};
