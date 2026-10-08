import { z } from "zod";
import { todayKST } from "@/lib/date";

// 원장님 학생 정보 수정 중 "기본 정보" 저장 규칙 (STU-01~03, 10/8). 서버 함수와 화면이 같은 규칙을 쓴다
// 반·수업 시간은 schedule.ts, 보호자는 guardian.ts (10/9). 상태(휴원·퇴원)는 10/13

// 사용 프로그램 목록 (STU-03). TODO: 원장님이 목록을 추가·수정
export const PROGRAMS = ["클래스카드", "클래스5", "오토보카"] as const;

/** 빈 칸은 null (DB에 빈 문자열 대신 "없음"으로 저장) */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}은(는) ${max}자 이하로 입력해 주세요`)
    .transform((v) => (v === "" ? null : v));

/** 휴대폰: 숫자만 넣어도 되고 하이픈이 있어도 된다. 저장은 010-5550-0000 모양으로 (보호자 전화도 같은 규칙) */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const d = v.replace(/[\s-]/g, "");
    if (!/^01[016789]\d{7,8}$/.test(d)) {
      ctx.addIssue({ code: "custom", message: "휴대폰 번호를 다시 확인해 주세요 (예: 010-5550-1234)" });
      return z.NEVER;
    }
    return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  });

export const studentBasicSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(30, "이름은 30자 이하로 입력해 주세요"),
  phone: phoneSchema,
  school: optionalText(30, "학교"),
  grade: optionalText(10, "학년"),
  enrolledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "입학일을 다시 확인해 주세요"),
  // 생년월일 (STU-01, 10/9): 비워 둘 수 있다. 1950년부터 오늘(한국 날짜)까지 (DB도 1950년 이전은 거부)
  birthDate: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < "1950-01-01" || v > todayKST()) {
        ctx.addIssue({ code: "custom", message: "생년월일을 다시 확인해 주세요" });
        return z.NEVER;
      }
      return v;
    }),
  // 출결 번호: 숫자 4자리 고정 (10/5, 키패드가 4자리에서 바로 처리)
  attendanceCode: z.string().trim().regex(/^\d{4}$/, "출결 코드는 숫자 4자리로 입력해 주세요"),
  programs: z.array(z.enum(PROGRAMS)).max(PROGRAMS.length),
  memo: z.string().trim().max(500, "메모는 500자 이하로 입력해 주세요"),
});

export type StudentBasicInput = z.input<typeof studentBasicSchema>;
export type StudentBasic = z.output<typeof studentBasicSchema>;
/** 저장이 안 됐을 때 화면이 그 칸 아래에 안내를 띄우도록 칸 이름을 함께 돌려준다 */
export type StudentBasicField = Exclude<keyof StudentBasic, "id">;

/** 검사: 성공하면 다듬은 값, 실패하면 첫 번째 문제의 칸과 안내 */
export function parseStudentBasic(input: unknown): { ok: true; value: StudentBasic } | { ok: false; field?: StudentBasicField; error: string } {
  const r = studentBasicSchema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  const issue = r.error.issues[0];
  const key = issue.path[0];
  return { ok: false, field: typeof key === "string" && key !== "id" ? (key as StudentBasicField) : undefined, error: issue.message };
}
