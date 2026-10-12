// dev(시연) DB의 가상 명단 id ↔ 가상 데이터 id (scripts/seed-dev.mts의 uid 규칙과 같게)
// 학생: "s001" ↔ "30000000-0000-4000-8000-000000000001"
// 숙제·보강·메시지가 아직 DB에 없어(10/14~) 로그인한 학생 화면이 가상 데이터를 빌려 쓸 때만 쓴다

/** DB 학생 id → 가상 데이터 학생 id. 시드로 넣은 가상 학생이 아니면(실제로 등록한 학생 등) null */
export function mockStudentIdOf(dbId: string): string | null {
  const m = /^30000000-0000-4000-8000-(\d{12})$/.exec(dbId);
  return m ? `s${String(Number(m[1])).padStart(3, "0")}` : null;
}
