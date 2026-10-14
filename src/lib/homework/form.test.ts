import { describe, expect, it } from "vitest";
import { defaultPeriod, parseHomework, todayTitle } from "./form";

const TODAY = "2026-10-14"; // 수요일
const base = { kind: "general", title: "단어 시험", useToday: false, body: "", period: false, startsOn: "", endsOn: "", studentIds: ["s1"] };

describe("숙제 등록 검사 (HW-01~03)", () => {
  it("일반 숙제: 날짜 없이, 제목·내용은 앞뒤 공백 정리", () => {
    const r = parseHomework({ ...base, title: "  단어   시험 ", body: " 1~3과 \n" }, TODAY);
    expect(r).toEqual({ ok: true, value: { kind: "general", title: "단어 시험", body: "1~3과", startsOn: null, endsOn: null, studentIds: ["s1"] } });
  });

  it("오늘 날짜 사용 (HW-02): 제목을 비우면 오늘 날짜, 쓰면 쓴 제목", () => {
    expect(todayTitle(TODAY)).toBe("10/14 (수) 숙제");
    const empty = parseHomework({ ...base, title: "", useToday: true }, TODAY);
    expect(empty.ok && empty.value.title).toBe("10/14 (수) 숙제");
    const typed = parseHomework({ ...base, title: "독해", useToday: true }, TODAY);
    expect(typed.ok && typed.value.title).toBe("독해");
    expect(parseHomework({ ...base, title: " " }, TODAY)).toMatchObject({ ok: false, field: "title" });
  });

  it("매일 숙제: 기간을 끄면 오늘 하루, 켜면 시작~종료", () => {
    const oneDay = parseHomework({ ...base, kind: "daily" }, TODAY);
    expect(oneDay.ok && [oneDay.value.startsOn, oneDay.value.endsOn]).toEqual([TODAY, TODAY]);
    const ranged = parseHomework({ ...base, kind: "daily", period: true, startsOn: "2026-10-14", endsOn: "2026-10-20" }, TODAY);
    expect(ranged.ok && [ranged.value.startsOn, ranged.value.endsOn]).toEqual(["2026-10-14", "2026-10-20"]);
  });

  it("매일 숙제 기간이 틀리면 기간 칸 안내", () => {
    const daily = { ...base, kind: "daily", period: true };
    expect(parseHomework({ ...daily, startsOn: "", endsOn: "2026-10-20" }, TODAY)).toMatchObject({ field: "period" });
    expect(parseHomework({ ...daily, startsOn: "2026-10-20", endsOn: "2026-10-14" }, TODAY)).toMatchObject({ error: "종료일이 시작일보다 앞서요" });
    expect(parseHomework({ ...daily, startsOn: "2026-10-01", endsOn: "2026-10-10" }, TODAY)).toMatchObject({ error: "이미 지난 기간이에요" });
    expect(parseHomework({ ...daily, startsOn: "2026-10-14", endsOn: "2027-01-14" }, TODAY)).toMatchObject({ field: "period" });
  });

  it("대상: 1명 이상, 겹친 학생은 한 번만", () => {
    expect(parseHomework({ ...base, studentIds: [] }, TODAY)).toMatchObject({ ok: false, field: "targets" });
    const r = parseHomework({ ...base, studentIds: ["s1", "s2", "s1", ""] }, TODAY);
    expect(r.ok && r.value.studentIds).toEqual(["s1", "s2"]);
  });

  it("길이 제한·잘못된 종류", () => {
    expect(parseHomework({ ...base, title: "가".repeat(101) }, TODAY)).toMatchObject({ field: "title" });
    expect(parseHomework({ ...base, body: "가".repeat(2001) }, TODAY)).toMatchObject({ field: "body" });
    expect(parseHomework({ ...base, kind: "weekly" }, TODAY)).toMatchObject({ ok: false });
    expect(parseHomework(null, TODAY)).toMatchObject({ ok: false });
  });

  it("기간 기본값은 오늘부터 일주일", () => {
    expect(defaultPeriod(TODAY)).toEqual({ startsOn: "2026-10-14", endsOn: "2026-10-20" });
  });
});
