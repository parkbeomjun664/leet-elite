// 실제 학생 명단으로 화면을 시험해 보는 장치 (범준님 컴퓨터에서만)
//
// - 명단 파일은 저장소 "밖"에 둔다: ../_private/eduok-students.json (에듀OK 학생 목록을 옮겨 적은 것)
// - 파일이 없으면 null → 지금처럼 가상 데이터를 쓴다. 그래서 GitHub·다른 컴퓨터에는 실제 정보가 절대 들어가지 않는다
// - 가상 데이터로 강제로 보고 싶을 때(캡처·범위 확인서): .env.local에 LEET_REAL_DATA=0
// - 서버에서만 읽는다 (화면 쪽 코드는 이 파일을 import하지 않는다)
import fs from "node:fs";
import path from "node:path";

/** 에듀OK 학생 목록 한 줄 그대로 */
export type RosterRow = {
  cls: string; // 반 이름 (에듀OK와 같음)
  name: string; // "(재)홍길동(한빛중3)" 처럼 상태·학교·학년이 붙은 그대로
  phone: string | null;
  guardian: string;
  gPhone1: string;
  gPhone2: string | null;
  enrolledOn: string;
  leftOn: string | null;
  memo: string;
};

export function loadRealRoster(): RosterRow[] | null {
  if (process.env.LEET_REAL_DATA === "0") return null;
  const file = path.resolve(process.cwd(), "..", "_private", "eduok-students.json");
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as RosterRow[];
  } catch {
    return null;
  }
}

/** "(재)홍길동(한빛중3)", "홍길동.새솔중3", "홍길동 초6", "홍길동" → 상태·이름·학교·학년 */
export function parseRosterName(raw: string) {
  const status = raw.startsWith("(휴)") ? "on_leave" : raw.startsWith("(퇴)") ? "withdrawn" : "enrolled";
  const rest = raw.replace(/^\((재|휴|퇴)\)/, "").trim();
  const m = rest.match(/^([^(.\s]+)[(.\s]?([^)]*)\)?$/);
  const name = m?.[1] ?? rest;
  const info = (m?.[2] ?? "").trim(); // "한빛중3", "초5", "새봄초6"
  const g = info.match(/(초|중|고)(\d)$/);
  return {
    status: status as "enrolled" | "on_leave" | "withdrawn",
    name,
    grade: g ? `${g[1]}${g[2]}` : null,
    school: g && info.length > 2 ? info.slice(0, -1) : null,
  };
}

const DAY: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

/** 메모 맨 앞의 요일 글자("월수금", "화목", "월~목")를 요일 번호로. 없으면 null */
export function weekdaysFromMemo(memo: string): number[] | null {
  const m = memo.match(/^([월화수목금토일](?:\s*[~,·]?\s*[월화수목금토일])*)/);
  if (!m) return null;
  const token = m[1].replace(/\s/g, "");
  const range = token.match(/^([월화수목금토일])~([월화수목금토일])$/);
  if (range) {
    const out: number[] = [];
    for (let d = DAY[range[1]]; d <= DAY[range[2]]; d++) out.push(d);
    return out;
  }
  return [...token.replace(/[~,·]/g, "")].map((c) => DAY[c]).filter((d) => d !== undefined);
}
