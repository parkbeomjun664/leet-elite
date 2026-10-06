// dev(시연) DB에 시험 계정과 가상 학원 명단을 넣는다. 실행할 때마다 명단을 처음 가상 상태로 되돌린다 (시험 뒤 원상 복구)
//
// 실행 (PowerShell, 저장소 폴더에서):
//   $env:SEED_PASSWORD="시연 비밀번호"; npx tsx --env-file=.env.local scripts/seed-dev.mts --ref=<dev 프로젝트 ref>
//   비밀번호를 바꾸지 않고 명단만 되돌릴 때: SEED_PASSWORD 없이 실행 (계정은 이미 있어야 한다)
//
// - 명단 원본은 화면 개발에 쓰는 가상 데이터(src/lib/mock/data.ts) 하나. 실제 명단 파일이 있어도 쓰지 않는다(LEET_REAL_DATA=0)
// - 비밀번호는 저장소·파일에 남기지 않는다. 환경변수로만 받는다 (카톡으로만 전달)
// - --ref는 실수로 운영 DB에 넣지 않게 하는 확인용. .env.local의 Supabase 주소와 같아야 실행된다
// - 이름·번호는 모두 가상 (010-5550·5559 대역)
import { createClient } from "@supabase/supabase-js";

process.env.LEET_REAL_DATA = "0"; // 가상 데이터를 불러오기 전에 정해야 한다
const mock = await import("../src/lib/mock/data");
if (mock.usingRealData) throw new Error("실제 명단이 섞였습니다. 중단합니다");

const DOMAIN = "login.leetenglish.kr"; // src/lib/auth/login-id.ts와 같게

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.SEED_PASSWORD;
const ref = process.argv.find((a) => a.startsWith("--ref="))?.slice(6);

if (!url || !secret) throw new Error(".env.local에 NEXT_PUBLIC_SUPABASE_URL·SUPABASE_SECRET_KEY가 필요합니다");
if (!ref || new URL(url).hostname.split(".")[0] !== ref) throw new Error("--ref=<프로젝트 ref>가 .env.local의 Supabase 주소와 다릅니다. 대상 DB를 확인하세요");
if (password !== undefined && password.length < 6) throw new Error("SEED_PASSWORD는 6자 이상");

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

// Supabase 응답이 실패면 멈추고, 성공이면 data를 돌려준다 (응답 타입이 "성공 | 실패" 묶음이라 성공 쪽만 남긴다)
function must<R extends { data: unknown; error: { message: string } | null }>(res: R, what: string): Extract<R, { error: null }>["data"] {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as Extract<R, { error: null }>["data"];
}

// 가상 데이터 id("s001", "c3", "g012", "t1") → 항상 같은 DB id(uuid). 다시 실행해도 같은 줄을 고친다
const KIND = { teacher: "1", class: "2", student: "3", guardian: "4" } as const;
const uid = (kind: keyof typeof KIND, mockId: string) => `${KIND[kind]}0000000-0000-4000-8000-${mockId.replace(/\D/g, "").padStart(12, "0")}`;
// 첫 로그인 시험용 학생 (가상 명단 밖)
const NEWBIE_STUDENT = "50000000-0000-4000-8000-000000000001";

// ── 1) 시험 계정 ─────────────────────────────────────────
const demoStudent = mock.students.find((s) => s.id === "s001")!; // 조나윤 (출결 번호 1234, 키패드 시연과 같게)
const demoTeacher = mock.teachers[0]; // Jenny
const demoGuardian = mock.guardians.find((g) => g.studentIds.length > 1)!; // 자녀 둘인 보호자

const ACCOUNTS = [
  { loginId: "admin", role: "admin", name: "원장님(시연)", phone: "010-5559-0001", mustChange: false },
  { loginId: "teacher", role: "teacher", name: demoTeacher.realName, phone: demoTeacher.phone, mustChange: false },
  { loginId: "student", role: "student", name: demoStudent.name, phone: demoStudent.phone, mustChange: false },
  { loginId: "parent", role: "parent", name: demoGuardian.name, phone: demoGuardian.phone1, mustChange: false },
  { loginId: "kiosk", role: "kiosk", name: "출결 키패드", phone: null, mustChange: false },
  // 첫 로그인 흐름 시험용: 실행할 때마다 다시 "비밀번호 바꿔야 함"으로
  { loginId: "newbie", role: "student", name: "새학생(시연)", phone: "010-5559-0005", mustChange: true },
] as const;

async function findUserByEmail(email: string) {
  for (let page = 1; page < 50; page++) {
    const { users } = must(await admin.auth.admin.listUsers({ page, perPage: 200 }), "계정 목록");
    const hit = users.find((u) => u.email === email);
    if (hit || users.length < 200) return hit ?? null;
  }
  return null;
}

const profileId: Record<string, string> = {};
for (const a of ACCOUNTS) {
  const email = `${a.loginId}@${DOMAIN}`;
  const app_metadata = { role: a.role, must_change_password: a.mustChange };
  const existing = await findUserByEmail(email);
  let id: string;
  if (existing) {
    const patch = password ? { password, app_metadata, ban_duration: "none" } : { app_metadata, ban_duration: "none" };
    id = must(await admin.auth.admin.updateUserById(existing.id, patch), `${a.loginId} 고치기`).user.id;
  } else {
    if (!password) throw new Error(`${a.loginId} 계정이 없습니다. 처음에는 SEED_PASSWORD를 주고 실행하세요`);
    id = must(await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata }), `${a.loginId} 만들기`).user.id;
  }
  profileId[a.loginId] = id;
  must(
    await admin.from("profiles").upsert({
      id,
      role: a.role,
      login_id: a.loginId,
      display_name: a.name,
      phone: a.phone,
      is_active: true,
      must_change_password: a.mustChange,
      updated_at: new Date().toISOString(),
    }),
    `${a.loginId} 계정 정보`,
  );
}
console.log(`계정 ${ACCOUNTS.length}개${password ? " (비밀번호 다시 정함)" : ""}`);

// ── 2) 예전 시연용 줄 지우기 (10/6 시드: 시연반·김시연·조나윤·새학생) ─────
const OLD_DEMO = { teacher: "a0000000-0000-4000-8000-000000000001", class: "a0000000-0000-4000-8000-000000000002", students: ["a0000000-0000-4000-8000-000000000003", "a0000000-0000-4000-8000-000000000005"], guardian: "a0000000-0000-4000-8000-000000000004" };
must(await admin.from("students").delete().in("id", OLD_DEMO.students), "예전 시연 학생 지우기");
must(await admin.from("guardians").delete().eq("id", OLD_DEMO.guardian), "예전 시연 보호자 지우기");
must(await admin.from("classes").delete().eq("id", OLD_DEMO.class), "예전 시연반 지우기");
must(await admin.from("teachers").delete().eq("id", OLD_DEMO.teacher), "예전 시연 선생님 지우기");

// ── 3) 가상 명단 ─────────────────────────────────────────
// 선생님: 첫 번째(Jenny)는 teacher 계정과 연결
must(
  await admin.from("teachers").upsert(
    mock.teachers.map((t) => ({
      id: uid("teacher", t.id),
      profile_id: t.id === demoTeacher.id ? profileId.teacher : null,
      real_name: t.realName,
      nickname: t.nickname,
      is_active: true,
    })),
  ),
  "선생님",
);
must(
  await admin.from("classes").upsert(
    mock.classes.map((c) => ({
      id: uid("class", c.id),
      name: c.name,
      teacher_id: c.teacherId ? uid("teacher", c.teacherId) : null,
      weekdays: c.weekdays,
      is_active: true,
      sort_order: c.sortOrder,
    })),
  ),
  "반",
);

// 학생: 출결 번호는 재원생끼리 겹치면 안 되므로, 시험 중 바뀐 번호와 부딪히지 않게 먼저 비워 둔 뒤 넣는다
const studentIds = [...mock.students.map((s) => uid("student", s.id)), NEWBIE_STUDENT];
must(await admin.from("students").update({ status: "withdrawn" }).in("id", studentIds), "학생 상태 초기화");
must(
  await admin.from("students").upsert([
    ...mock.students.map((s) => ({
      id: uid("student", s.id),
      profile_id: s.id === demoStudent.id ? profileId.student : null,
      name: s.name,
      school: s.school,
      grade: s.grade,
      phone: s.phone,
      status: s.status,
      enrolled_on: s.enrolledOn,
      left_on: s.leftOn,
      attendance_code: s.attendanceCode,
      programs: s.programs,
      memo: s.memo,
      updated_at: new Date().toISOString(),
    })),
    {
      id: NEWBIE_STUDENT,
      profile_id: profileId.newbie,
      name: "새학생",
      school: null,
      grade: null,
      phone: "010-5559-0005",
      status: "enrolled",
      enrolled_on: demoStudent.enrolledOn,
      left_on: null,
      attendance_code: "8888",
      programs: [],
      memo: "첫 로그인 시험용",
      updated_at: new Date().toISOString(),
    },
  ]),
  "학생",
);

// 시간표·반 소속·보호자 연결은 지우고 다시 넣는다 (시험 중 바뀐 것까지 원래대로)
must(await admin.from("student_schedules").delete().in("student_id", studentIds), "시간표 비우기");
must(
  await admin.from("student_schedules").insert(
    mock.students.flatMap((s) => s.schedule.map((x) => ({ student_id: uid("student", s.id), weekday: x.weekday, start_time: x.start, duration_min: x.durationMin }))),
  ),
  "시간표",
);
must(await admin.from("class_members").delete().in("student_id", studentIds), "반 소속 비우기");
must(
  await admin.from("class_members").insert([
    ...mock.students.flatMap((s) =>
      s.classIds.map((c) => ({ class_id: uid("class", c), student_id: uid("student", s.id), joined_on: s.enrolledOn, left_on: s.leftOn })),
    ),
    { class_id: uid("class", demoStudent.classIds[0]), student_id: NEWBIE_STUDENT, joined_on: demoStudent.enrolledOn, left_on: null },
  ]),
  "반 소속",
);

// 보호자: 자녀 둘인 첫 보호자는 parent 계정과 연결
must(
  await admin.from("guardians").upsert(
    mock.guardians.map((g) => ({
      id: uid("guardian", g.id),
      profile_id: g.id === demoGuardian.id ? profileId.parent : null,
      name: g.name,
      relation: g.relation,
      phone1: g.phone1,
      phone2: g.phone2,
    })),
  ),
  "보호자",
);
must(await admin.from("guardian_students").delete().in("student_id", studentIds), "보호자 연결 비우기");
must(
  await admin.from("guardian_students").insert(
    mock.guardians.flatMap((g) => g.studentIds.map((sid, i) => ({ guardian_id: uid("guardian", g.id), student_id: uid("student", sid), is_primary: i === 0 }))),
  ),
  "보호자 연결",
);

const count = (rows: unknown[] | null) => rows?.length ?? 0;
const n = {
  students: count(must(await admin.from("students").select("id").in("id", studentIds), "확인")),
  classes: count(must(await admin.from("classes").select("id"), "확인")),
  guardians: count(must(await admin.from("guardians").select("id"), "확인")),
};
console.log(`완료: 선생님 ${mock.teachers.length} · 반 ${n.classes} · 학생 ${n.students} · 보호자 ${n.guardians}`);
