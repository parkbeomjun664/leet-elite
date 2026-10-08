import { z } from "zod";
import { phoneSchema } from "./basic";

// 보호자 정보 수정 규칙 (STU-07, 10/9). 이미 연결된 보호자의 이름·관계·전화만. 새 보호자 추가·연결은 10/20
// 형제는 보호자 한 명에 연결되어 있으므로 한 번 고치면 형제 화면에도 같이 바뀐다

export const RELATIONS = ["mother", "father", "other"] as const;

export const guardianSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "보호자 이름을 입력해 주세요").max(30, "보호자 이름은 30자 이하로 입력해 주세요"),
  relation: z.enum(RELATIONS).nullable(),
  phone1: phoneSchema,
  phone2: phoneSchema,
});

export type GuardianEdit = z.output<typeof guardianSchema>;
export type GuardianField = "name" | "phone1" | "phone2";

export function parseGuardian(input: unknown): { ok: true; value: GuardianEdit } | { ok: false; field?: GuardianField; error: string } {
  const r = guardianSchema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  const issue = r.error.issues[0];
  const key = issue.path[0];
  return { ok: false, field: key === "name" || key === "phone1" || key === "phone2" ? key : undefined, error: issue.message };
}
