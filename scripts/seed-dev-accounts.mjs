// dev(시연) DB에 가상 시험 계정을 만든다. 여러 번 실행해도 같은 결과 (있으면 비밀번호·역할만 다시 맞춤)
//
// 실행 (PowerShell, 저장소 폴더에서):
//   $env:SEED_PASSWORD="시연 비밀번호"; node --env-file=.env.local scripts/seed-dev-accounts.mjs --ref=<dev 프로젝트 ref>
//
// - 비밀번호는 저장소·파일에 남기지 않는다. 환경변수로만 받는다 (카톡으로만 전달)
// - --ref는 실수로 운영 DB에 만들지 않게 하는 확인용. .env.local의 Supabase 주소와 같아야 실행된다
// - 이름·번호는 모두 가상 (010-5559-xxxx). 실제 학생 정보를 넣지 않는다
import { createClient } from "@supabase/supabase-js";

const DOMAIN = "login.leetenglish.kr"; // src/lib/auth/login-id.ts와 같게

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.SEED_PASSWORD;
const ref = process.argv.find((a) => a.startsWith("--ref="))?.slice(6);

if (!url || !secret) throw new Error(".env.local에 NEXT_PUBLIC_SUPABASE_URL·SUPABASE_SECRET_KEY가 필요합니다");
if (!ref || new URL(url).hostname.split(".")[0] !== ref) throw new Error("--ref=<프로젝트 ref>가 .env.local의 Supabase 주소와 다릅니다. 대상 DB를 확인하세요");
if (!password || password.length < 6) throw new Error("SEED_PASSWORD 환경변수(6자 이상)를 정해 주세요");

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

// 고정 id: 다시 실행해도 같은 줄을 고친다
const ID = {
  teacher: "a0000000-0000-4000-8000-000000000001",
  class: "a0000000-0000-4000-8000-000000000002",
  student: "a0000000-0000-4000-8000-000000000003",
  guardian: "a0000000-0000-4000-8000-000000000004",
  newbie: "a0000000-0000-4000-8000-000000000005",
};

// 로그인 아이디 · 역할 · 화면 이름 · 첫 로그인 비밀번호 변경 여부
const ACCOUNTS = [
  { loginId: "admin", role: "admin", name: "원장님(시연)", phone: "010-5559-0001", mustChange: false },
  { loginId: "teacher", role: "teacher", name: "김시연 선생님", phone: "010-5559-0002", mustChange: false },
  { loginId: "student", role: "student", name: "조나윤(시연)", phone: "010-5559-0003", mustChange: false },
  { loginId: "parent", role: "parent", name: "조나윤 어머니(시연)", phone: "010-5559-0004", mustChange: false },
  { loginId: "kiosk", role: "kiosk", name: "출결 키패드", phone: null, mustChange: false },
  // 첫 로그인 흐름 시험용: 로그인하면 비밀번호 바꾸는 화면으로 간다 (실행할 때마다 다시 "바꿔야 함"으로)
  { loginId: "newbie", role: "student", name: "새학생(시연)", phone: "010-5559-0005", mustChange: true },
];

const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
};

async function findUserByEmail(email) {
  for (let page = 1; page < 50; page++) {
    const { users } = must(await admin.auth.admin.listUsers({ page, perPage: 200 }), "계정 목록");
    const hit = users.find((u) => u.email === email);
    if (hit || users.length < 200) return hit ?? null;
  }
  return null;
}

const profileIds = {};
for (const a of ACCOUNTS) {
  const email = `${a.loginId}@${DOMAIN}`;
  const app_metadata = { role: a.role, must_change_password: a.mustChange };
  const existing = await findUserByEmail(email);
  const user = existing
    ? must(await admin.auth.admin.updateUserById(existing.id, { password, app_metadata, ban_duration: "none" }), `${a.loginId} 고치기`).user
    : must(await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata }), `${a.loginId} 만들기`).user;
  profileIds[a.loginId] = user.id;
  must(
    await admin.from("profiles").upsert({
      id: user.id,
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
  console.log(`${existing ? "고침" : "만듦"}  ${a.loginId.padEnd(8)} ${a.role}`);
}

// 학원 쪽 정보: 선생님 1 · 반 1 · 학생 1(출결 번호 1234, 키패드 시연과 같게) · 보호자 1
must(await admin.from("teachers").upsert({ id: ID.teacher, profile_id: profileIds.teacher, real_name: "김시연", nickname: "Amy", is_active: true }), "선생님");
must(await admin.from("classes").upsert({ id: ID.class, name: "시연반", teacher_id: ID.teacher }), "반");
must(
  await admin.from("students").upsert([
    { id: ID.student, profile_id: profileIds.student, name: "조나윤", attendance_code: "1234", status: "enrolled" },
    { id: ID.newbie, profile_id: profileIds.newbie, name: "새학생", attendance_code: "1235", status: "enrolled" },
  ]),
  "학생",
);
// 반 소속은 (반, 학생, 들어온 날)이 열쇠라 들어온 날을 고정한다
const joined_on = "2026-10-01";
must(
  await admin.from("class_members").upsert(
    [
      { class_id: ID.class, student_id: ID.student, joined_on },
      { class_id: ID.class, student_id: ID.newbie, joined_on },
    ],
    { onConflict: "class_id,student_id,joined_on" },
  ),
  "반 소속",
);
must(await admin.from("guardians").upsert({ id: ID.guardian, profile_id: profileIds.parent, name: "조나윤 어머니", relation: "mother", phone1: "010-5559-0004" }), "보호자");
must(await admin.from("guardian_students").upsert({ guardian_id: ID.guardian, student_id: ID.student }, { onConflict: "guardian_id,student_id" }), "보호자 연결");

console.log("완료: 계정 6개, 선생님·반·학생 2·보호자. 비밀번호는 SEED_PASSWORD");
