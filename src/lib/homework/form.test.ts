import { describe, expect, it } from "vitest";
import { autoDailyTitle, defaultDates, parseHomework, readyToSubmit } from "./form";

const TODAY = "2026-10-14"; // 수요일
const general = { kind: "general", title: "단어 시험", body: "", submitMode: "photo", dueOn: "2026-10-16", startsOn: "", endsOn: "", weekdays: [], studentIds: ["s1"] };
const daily = { ...general, kind: "daily", title: "", dueOn: "", startsOn: "2026-10-14", endsOn: "2026-10-20", weekdays: [1, 2, 3, 4, 5] };

describe("숙제 등록 검사 (HW-01~03, 10/14 오후 개선)", () => {
  it("일반 숙제: 마감일 필수, 제목·내용 공백 정리, 기간·요일 없음", () => {
    const r = parseHomework({ ...general, title: "  단어   시험 ", body: " 1~3과 \n" }, TODAY);
    expect(r).toEqual({
      ok: true,
      value: { kind: "general", title: "단어 시험", body: "1~3과", submitMode: "photo", dueOn: "2026-10-16", startsOn: null, endsOn: null, weekdays: null, studentIds: ["s1"] },
    });
    expect(parseHomework({ ...general, dueOn: "" }, TODAY)).toMatchObject({ ok: false, field: "due" });
    expect(parseHomework({ ...general, dueOn: "2026-10-13" }, TODAY)).toMatchObject({ error: "마감일이 이미 지났어요" });
    expect(parseHomework({ ...general, title: " " }, TODAY)).toMatchObject({ ok: false, field: "title" });
  });

  it("매일 숙제: 기간·요일, 제목을 비우면 날짜가 제목", () => {
    const r = parseHomework(daily, TODAY);
    expect(r.ok && r.value).toMatchObject({ title: "10/14~10/20 숙제", startsOn: "2026-10-14", endsOn: "2026-10-20", weekdays: [1, 2, 3, 4, 5], dueOn: null });
    expect(autoDailyTitle("2026-10-14", "2026-10-14")).toBe("10/14 (수) 숙제");
  });

  it("매일 숙제 기간·요일이 틀리면 기간 칸 안내", () => {
    expect(parseHomework({ ...daily, startsOn: "" }, TODAY)).toMatchObject({ field: "period" });
    expect(parseHomework({ ...daily, startsOn: "2026-10-20", endsOn: "2026-10-14" }, TODAY)).toMatchObject({ error: "종료일이 시작일보다 앞서요" });
    expect(parseHomework({ ...daily, startsOn: "2026-10-01", endsOn: "2026-10-10" }, TODAY)).toMatchObject({ error: "이미 지난 기간이에요" });
    expect(parseHomework({ ...daily, endsOn: "2027-01-14" }, TODAY)).toMatchObject({ field: "period" });
    expect(parseHomework({ ...daily, weekdays: [] }, TODAY)).toMatchObject({ error: "숙제를 내는 요일을 골라 주세요" });
    // 10/17(토)~10/18(일) 기간에 월~금만 고르면 낼 날이 없다
    expect(parseHomework({ ...daily, startsOn: "2026-10-17", endsOn: "2026-10-18" }, TODAY)).toMatchObject({ error: "기간 안에 고른 요일이 없어요" });
    // 이상한 요일 값은 버린다
    const r = parseHomework({ ...daily, weekdays: [5, 1, 7, 1, -1] }, TODAY);
    expect(r.ok && r.value.weekdays).toEqual([1, 5]);
  });

  it("제출 방식: 체크만 / 사진 첨부 (모르는 값은 사진)", () => {
    const check = parseHomework({ ...general, submitMode: "check" }, TODAY);
    expect(check.ok && check.value.submitMode).toBe("check");
    const other = parseHomework({ ...general, submitMode: "video" }, TODAY);
    expect(other.ok && other.value.submitMode).toBe("photo");
  });

  it("대상: 1명 이상, 겹친 학생은 한 번만", () => {
    expect(parseHomework({ ...general, studentIds: [] }, TODAY)).toMatchObject({ ok: false, field: "targets" });
    const r = parseHomework({ ...general, studentIds: ["s1", "s2", "s1", ""] }, TODAY);
    expect(r.ok && r.value.studentIds).toEqual(["s1", "s2"]);
  });

  it("길이 제한·잘못된 종류", () => {
    expect(parseHomework({ ...general, title: "가".repeat(101) }, TODAY)).toMatchObject({ field: "title" });
    expect(parseHomework({ ...general, body: "가".repeat(2001) }, TODAY)).toMatchObject({ field: "body" });
    expect(parseHomework({ ...general, kind: "weekly" }, TODAY)).toMatchObject({ ok: false });
    expect(parseHomework(null, TODAY)).toMatchObject({ ok: false });
  });
});

describe("[n명에게 숙제 내기] 버튼 켜기 (필수값)", () => {
  const g = { kind: "general" as const, title: "단어", dueOn: "2026-10-16", startsOn: "", endsOn: "", weekdays: [], studentIds: ["s1"] };
  it("일반: 제목·대상·마감이 모두 있어야", () => {
    expect(readyToSubmit(g)).toBe(true);
    expect(readyToSubmit({ ...g, title: "  " })).toBe(false);
    expect(readyToSubmit({ ...g, studentIds: [] })).toBe(false);
    expect(readyToSubmit({ ...g, dueOn: "" })).toBe(false);
  });
  it("매일: 제목은 비워도 되고 기간·요일·대상이 있어야", () => {
    const d = { ...g, kind: "daily" as const, title: "", dueOn: "", startsOn: "2026-10-14", endsOn: "2026-10-20", weekdays: [1] };
    expect(readyToSubmit(d)).toBe(true);
    expect(readyToSubmit({ ...d, weekdays: [] })).toBe(false);
    expect(readyToSubmit({ ...d, endsOn: "" })).toBe(false);
  });
});

describe("기본값", () => {
  it("일반 마감은 오늘+2일, 매일 기간은 오늘부터 일주일", () => {
    expect(defaultDates(TODAY)).toEqual({ dueOn: "2026-10-16", startsOn: "2026-10-14", endsOn: "2026-10-20" });
  });
});
