import type { Metadata } from "next";
import { TodayTimeline } from "@/components/admin/today-timeline";
import { studentDay } from "@/lib/attendance";
import { buildClassBlocks, sortBlocks, type Block } from "@/lib/admin/timeline";
import { addMinutes, formatDateKo, nowTimeKST, todayKST } from "@/lib/date";
import { makeups } from "@/lib/mock/activity";
import { classById, mockAttendanceFor, studentById, students, teacherById } from "@/lib/mock/data";

export const metadata: Metadata = { title: "홈 (새 구조)" };

// 가상 데이터라 매 요청마다 "지금" 기준으로 다시 계산한다
export const dynamic = "force-dynamic";

/**
 * 원장님 새 홈 (10/9 비교용, 기존 /admin 은 그대로): "오늘 시간표가 중심인 홈"
 * PC = 가운데 오늘 타임라인 + 오른쪽 처리할 일(3단계) / 휴대폰 = 지금 수업 중 · 다음 수업 · 처리할 일 한 줄(4단계)
 * 데이터는 기존 가상 데이터·계산을 다시 쓴다 (새 쿼리 없음). 반 블록 묶기는 src/lib/admin/timeline.ts
 */
export default async function AdminHomeV2({ searchParams }: PageProps<"/admin/home-v2">) {
  // 시연용: ?at=16:00 처럼 시각을 지정하면 그 시각 기준 (시계는 멈춘다)
  const { at } = await searchParams;
  const demoTime = typeof at === "string" && /^\d{2}:\d{2}$/.test(at) ? at : null;
  const date = todayKST();
  const now = demoTime ?? nowTimeKST();
  const records = mockAttendanceFor(date, now);

  // 오늘 수업이 있는 재원생 → 반(첫 반 기준) 블록
  const entries = students
    .filter((s) => s.status === "enrolled")
    .flatMap((s) => {
      const day = studentDay(s, records, date, now);
      const cls = classById(s.classIds[0]);
      if (!day.slot || !cls) return [];
      return [
        {
          classId: cls.id,
          className: cls.name,
          teacherName: teacherById(cls.teacherId)?.nickname ?? null,
          student: { id: s.id, name: s.name, status: day.status, start: day.slot.start, end: addMinutes(day.slot.start, day.slot.durationMin) },
        },
      ];
    });

  // 오늘 보강 (취소 제외) → 마름모 블록
  const makeupBlocks: Block[] = makeups
    .filter((m) => m.date === date && m.status !== "cancelled")
    .map((m) => ({
      kind: "makeup" as const,
      id: m.id,
      start: m.start,
      end: addMinutes(m.start, m.durationMin),
      studentName: studentById(m.studentId)?.name ?? "알 수 없음",
      teacherName: teacherById(m.teacherId)?.nickname ?? null,
      reason: m.reason,
    }));

  const blocks = sortBlocks([...buildClassBlocks(entries), ...makeupBlocks]);

  return (
    // 1280 이상: 가운데 타임라인 + 오른쪽 처리할 일(320px, 3단계에서 채움)
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
      <TodayTimeline dateLabel={formatDateKo(date).replace(/^\d+년 /, "")} blocks={blocks} initialNow={now} demo={demoTime !== null} />
    </div>
  );
}
