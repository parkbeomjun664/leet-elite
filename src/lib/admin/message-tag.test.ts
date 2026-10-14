import { describe, expect, it } from "vitest";
import { classifyMessage, compareTodos, messageTime, sortByAttendanceThenRecent, tagGroup } from "./message-tag";

describe("용건 자동 분류 (10/12 v4)", () => {
  it("가상 학부모 메시지 8개", () => {
    expect(classifyMessage("선생님, 이번 주 목요일은 학교 행사가 있어서 30분 늦을 것 같아요.")).toBe("지각");
    expect(classifyMessage("오늘 병원 예약이 있어서 수업 끝나기 20분 전에 데리러 가겠습니다.")).toBe("조퇴");
    expect(classifyMessage("숙제 사진이 앱에서 잘 안 올라간다고 하는데 확인 부탁드려요.")).toBe("문의");
    expect(classifyMessage("다음 주 월요일부터 수업 시간을 30분 늦출 수 있을까요?")).toBe("일정");
    expect(classifyMessage("단원 평가 결과 나오면 따로 상담 가능할까요?")).toBe("문의");
    expect(classifyMessage("아이가 감기 기운이 있어서 오늘은 쉬게 하려고 합니다.")).toBe("결석");
    expect(classifyMessage("교재를 학원에 두고 왔다고 하네요. 내일 챙겨 갈게요.")).toBe("문의");
    expect(classifyMessage("방학 특강 일정 나오면 미리 알려 주세요.")).toBe("일정");
  });
  it("직접 쓴 말", () => {
    expect(classifyMessage("오늘 결석합니다")).toBe("결석");
    expect(classifyMessage("열이 나서 못 갈 것 같아요")).toBe("결석");
    expect(classifyMessage("오늘은 조금 일찍 보내 주세요")).toBe("조퇴");
    expect(classifyMessage("차가 막혀서 10분 늦게 도착해요")).toBe("지각");
    expect(classifyMessage("안녕하세요")).toBe("문의");
  });
  it("색 계열: 결석·조퇴·지각 = 오늘 영향, 일정, 문의", () => {
    expect(["결석", "조퇴", "지각"].map((t) => tagGroup(t as "결석"))).toEqual(["today", "today", "today"]);
    expect(tagGroup("일정")).toBe("schedule");
    expect(tagGroup("문의")).toBe("ask");
  });
});

describe("메시지 시간 표시", () => {
  const today = "2026-10-12";
  it("오늘은 오전·오후 시각", () => {
    expect(messageTime("2026-10-12 09:12", today)).toBe("오전 9:12");
    expect(messageTime("2026-10-12 13:15", today)).toBe("오후 1:15");
    expect(messageTime("2026-10-12 00:05", today)).toBe("오전 12:05");
    expect(messageTime("2026-10-12 12:30", today)).toBe("오후 12:30");
  });
  it("어제는 '어제', 그 전은 월/일", () => {
    expect(messageTime("2026-10-11 21:30", today)).toBe("어제");
    expect(messageTime("2026-10-09 19:40", today)).toBe("10/9");
    expect(messageTime("2026-09-30 08:00", today)).toBe("9/30");
  });
});

describe("처리할 일 정렬: 오늘 수업에 영향 → 읽지 않음 → 최신순", () => {
  it("세 기준을 순서대로", () => {
    const list = [
      { id: "old-unread", affectsToday: false, unread: true, at: "2026-10-10 09:00" },
      { id: "read-new", affectsToday: false, unread: false, at: "2026-10-12 11:00" },
      { id: "today-old", affectsToday: true, unread: true, at: "2026-10-12 08:00" },
      { id: "new-unread", affectsToday: false, unread: true, at: "2026-10-12 10:00" },
      { id: "today-new", affectsToday: true, unread: true, at: "2026-10-12 09:30" },
    ];
    expect([...list].sort(compareTodos).map((x) => x.id)).toEqual(["today-new", "today-old", "new-unread", "old-unread", "read-new"]);
  });
});

describe("원장 홈 학부모 메시지 정렬 (10/14): 출결 먼저 → 최신순", () => {
  const list = [
    { id: "ask-new", tag: "문의" as const, at: "2026-10-14 11:00" },
    { id: "absent-old", tag: "결석" as const, at: "2026-10-13 20:00" },
    { id: "plan-mid", tag: "일정" as const, at: "2026-10-14 09:00" },
    { id: "late-new", tag: "지각" as const, at: "2026-10-14 10:30" },
    { id: "early-mid", tag: "조퇴" as const, at: "2026-10-14 08:00" },
  ];
  it("결석·조퇴·지각이 먼저, 각 묶음 안은 최신순", () => {
    const r = sortByAttendanceThenRecent(list);
    expect(r.map((m) => m.id)).toEqual(["late-new", "early-mid", "absent-old", "ask-new", "plan-mid"]);
    expect(r.map((m) => m.group)).toEqual(["attendance", "attendance", "attendance", "other", "other"]);
  });
  it("원래 배열은 그대로, 빈 목록도 된다", () => {
    const copy = [...list];
    sortByAttendanceThenRecent(list);
    expect(list).toEqual(copy);
    expect(sortByAttendanceThenRecent([])).toEqual([]);
  });
});
