import "server-only";
import { todayKST } from "@/lib/date";
import { targetSummary } from "@/lib/homework/display";
import { statusDate } from "@/lib/homework/status";
import { homework as mockHomework, submissions as mockSubmissions } from "@/lib/mock/activity";
import { classes as mockClasses, students as mockStudents, teachers as mockTeachers } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import { isMockRequest } from "./source";

// 숙제 등록·목록 데이터 (HW-01·04, 10/14). 로그인한 사람의 권한으로 읽는다
// RLS 덕분에 원장님은 전체, 선생님은 담당 반·담당 학생 숙제만 나온다 → 원장님·선생님 화면이 같은 함수를 쓴다
// 시험 모드(가상 데이터)에서는 scope로 원장님(전체)·선생님(첫 번째 가상 선생님의 반)을 나눈다

export type HomeworkScope = "admin" | "teacher";

export type TargetStudent = { id: string; name: string; school: string | null; grade: string | null };
export type TargetClass = { id: string; name: string; studentIds: string[] };
export type HomeworkTargets = { classes: TargetClass[]; students: TargetStudent[] };

/** 숙제를 낼 수 있는 학생과 반 (재원생만, 반은 지금 소속 기준) */
export async function loadHomeworkTargets(scope: HomeworkScope): Promise<HomeworkTargets> {
  if (await isMockRequest()) {
    const teacherId = mockTeachers[0].id;
    const cls = [...mockClasses]
      .filter((c) => scope === "admin" || c.teacherId === teacherId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const enrolled = mockStudents.filter((s) => s.status === "enrolled");
    const classes = cls.map((c) => ({ id: c.id, name: c.name, studentIds: enrolled.filter((s) => s.classIds.includes(c.id)).map((s) => s.id) }));
    const allowed = new Set(scope === "admin" ? enrolled.map((s) => s.id) : classes.flatMap((c) => c.studentIds));
    const students = enrolled
      .filter((s) => allowed.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, school: s.school, grade: s.grade }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return { classes, students };
  }

  const supabase = await createClient();
  const [studentsRes, classesRes] = await Promise.all([
    supabase.from("students").select("id, name, school, grade").eq("status", "enrolled").order("name"),
    supabase
      .from("classes")
      .select("id, name, sort_order, class_members ( student_id, left_on )")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  if (studentsRes.error) throw new Error(`학생을 불러오지 못함: ${studentsRes.error.message}`);
  if (classesRes.error) throw new Error(`반을 불러오지 못함: ${classesRes.error.message}`);
  const enrolledIds = new Set(studentsRes.data.map((s) => s.id));
  return {
    students: studentsRes.data,
    classes: classesRes.data.map((c) => ({
      id: c.id,
      name: c.name,
      studentIds: c.class_members.filter((m) => m.left_on === null && enrolledIds.has(m.student_id)).map((m) => m.student_id),
    })),
  };
}

export type HomeworkRow = {
  id: string;
  kind: "general" | "daily";
  title: string;
  submitMode: "check" | "photo";
  /** 마감: 일반 = 마감일, 매일 = 기간 마지막 날 */
  dueOn: string | null;
  startsOn: string | null;
  endsOn: string | null;
  createdOn: string;
  archived: boolean;
  targetCount: number;
  /** 제출한 학생 수. 매일 숙제는 오늘(기간이 끝났으면 마지막 날) 낸 학생 */
  submittedCount: number;
  /** "초중 · 8명" / "강민 외 3명" (targetSummary) */
  summary: string;
};

/** 대상 학생 id → 이름순 첫 학생 이름과 요약 */
function summarize(ids: string[], nameOf: (id: string) => string, classes: TargetClass[]): string {
  const first = [...ids].map(nameOf).sort((a, b) => a.localeCompare(b, "ko"))[0] ?? "";
  return targetSummary(ids, classes, first);
}

/** 숙제 목록 (HW-04): 최근 등록 순 */
export async function loadHomeworkList(scope: HomeworkScope): Promise<HomeworkRow[]> {
  const today = todayKST();
  const { classes } = await loadHomeworkTargets(scope);
  if (await isMockRequest()) {
    const teacherId = mockTeachers[0].id;
    const nameOf = new Map(mockStudents.map((s) => [s.id, s.name]));
    return mockHomework
      .filter((h) => scope === "admin" || h.createdBy === teacherId)
      .map((h) => {
        const subs = mockSubmissions.filter((s) => s.homeworkId === h.id && s.submittedAt.slice(0, 10) <= today);
        return {
          id: h.id,
          kind: h.kind,
          title: h.title,
          submitMode: h.submitMode,
          dueOn: h.kind === "daily" ? h.endsOn : h.dueOn,
          startsOn: h.startsOn,
          endsOn: h.endsOn,
          createdOn: h.createdOn,
          archived: false,
          targetCount: h.studentIds.length,
          submittedCount: new Set(subs.map((s) => s.studentId)).size,
          summary: summarize(h.studentIds, (id) => nameOf.get(id) ?? "알 수 없음", classes),
        };
      })
      .sort((a, b) => b.createdOn.localeCompare(a.createdOn) || a.title.localeCompare(b.title, "ko"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homework")
    .select(
      "id, kind, title, submit_mode, due_on, starts_on, ends_on, created_at, archived_at, homework_targets ( student_id, students ( name ), submissions ( for_date ) )",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`숙제를 불러오지 못함: ${error.message}`);
  return data.map((h) => {
    const day = h.kind === "daily" && h.starts_on && h.ends_on ? statusDate(h.starts_on, h.ends_on, today) : null;
    const names = new Map(h.homework_targets.map((t) => [t.student_id, t.students?.name ?? "알 수 없음"]));
    return {
      id: h.id,
      kind: h.kind,
      title: h.title,
      submitMode: h.submit_mode,
      dueOn: h.kind === "daily" ? h.ends_on : h.due_on,
      startsOn: h.starts_on,
      endsOn: h.ends_on,
      createdOn: todayKST(new Date(h.created_at)),
      archived: h.archived_at !== null,
      targetCount: h.homework_targets.length,
      submittedCount: h.homework_targets.filter((t) => t.submissions.some((s) => (day ? s.for_date === day : true))).length,
      summary: summarize([...names.keys()], (id) => names.get(id) ?? "알 수 없음", classes),
    };
  });
}

export type HomeworkDetail = HomeworkRow & {
  body: string;
  weekdays: number[] | null;
  /** 제출 현황 기준 날짜 (매일 숙제만) */
  statusDay: string | null;
  students: {
    id: string;
    name: string;
    school: string | null;
    grade: string | null;
    /** 기준 날짜(일반은 아무 때나)의 제출 시각 "HH:MM", 안 냈으면 null */
    submittedAt: string | null;
    photoCount: number;
    hasFeedback: boolean;
  }[];
};

/** 숙제 상세 (HW-05 학생별 제출 여부, 10/14 기본). 볼 수 없거나 없는 숙제면 null */
export async function loadHomeworkDetail(scope: HomeworkScope, id: string): Promise<HomeworkDetail | null> {
  const today = todayKST();
  const rows = await loadHomeworkList(scope);
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const day = row.kind === "daily" && row.startsOn && row.endsOn ? statusDate(row.startsOn, row.endsOn, today) : null;
  const hhmm = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

  if (await isMockRequest()) {
    const h = mockHomework.find((x) => x.id === id)!;
    const students = h.studentIds
      .map((sid) => {
        const s = mockStudents.find((x) => x.id === sid)!;
        const sub = mockSubmissions.find((x) => x.homeworkId === id && x.studentId === sid && x.submittedAt.slice(0, 10) <= today);
        return {
          id: sid,
          name: s.name,
          school: s.school,
          grade: s.grade,
          submittedAt: sub ? sub.submittedAt.slice(11) : null,
          photoCount: sub ? sub.photoCount : 0,
          hasFeedback: Boolean(sub?.teacherComment),
        };
      })
      .sort((a, b) => Number(a.submittedAt !== null) - Number(b.submittedAt !== null) || a.name.localeCompare(b.name, "ko"));
    return { ...row, body: h.body, weekdays: h.weekdays, statusDay: day, students };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homework")
    .select(
      "body, weekdays, homework_targets ( student_id, students ( name, school, grade ), submissions ( for_date, submitted_at, teacher_comment, submission_photos ( id ) ) )",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`숙제를 불러오지 못함: ${error.message}`);
  if (!data) return null;
  const students = data.homework_targets
    .map((t) => {
      const sub = t.submissions.find((s) => (day ? s.for_date === day : true)) ?? null;
      return {
        id: t.student_id,
        name: t.students?.name ?? "알 수 없음",
        school: t.students?.school ?? null,
        grade: t.students?.grade ?? null,
        submittedAt: sub ? hhmm(sub.submitted_at) : null,
        photoCount: sub ? sub.submission_photos.length : 0,
        hasFeedback: Boolean(sub?.teacher_comment),
      };
    })
    // 안 낸 학생이 위 (확인할 사람 먼저), 같은 상태는 이름순
    .sort((a, b) => Number(a.submittedAt !== null) - Number(b.submittedAt !== null) || a.name.localeCompare(b.name, "ko"));
  return { ...row, body: data.body, weekdays: data.weekdays, statusDay: day, students };
}
