import { afterEach, describe, expect, it, vi } from "vitest";
import { getToast, toast, TOAST_MS } from "./toast";
import { easeOutCubic, tweenValue } from "./use-animated-number";

describe("숫자 변화", () => {
  it("처음과 끝은 정확히 시작값·목표값", () => {
    expect(tweenValue(3, 9, 0)).toBe(3);
    expect(tweenValue(3, 9, 1)).toBe(9);
    expect(tweenValue(9, 3, 1)).toBe(3);
  });
  it("범위를 넘는 진행률은 잘라서 목표값을 넘지 않는다", () => {
    expect(tweenValue(0, 10, 1.4)).toBe(10);
    expect(tweenValue(0, 10, -1)).toBe(0);
  });
  it("ease-out: 앞쪽에서 빨리 움직인다", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(tweenValue(0, 100, 0.5)).toBe(88);
  });
});

describe("토스트", () => {
  afterEach(() => {
    toast.dismiss();
    vi.useRealTimers();
  });
  it("새 토스트가 이전 것을 바꾼다 (동시에 하나)", () => {
    toast.success("하원 처리했어요");
    toast.error("저장하지 못했어요");
    expect(getToast()).toMatchObject({ kind: "error", message: "저장하지 못했어요" });
  });
  it("성공 2.5초, 실패 4초 뒤 사라진다", () => {
    vi.useFakeTimers();
    toast.success("저장했어요");
    vi.advanceTimersByTime(TOAST_MS.success - 1);
    expect(getToast()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(getToast()).toBeNull();

    toast.error("실패");
    vi.advanceTimersByTime(TOAST_MS.success);
    expect(getToast()).not.toBeNull();
    vi.advanceTimersByTime(TOAST_MS.error - TOAST_MS.success);
    expect(getToast()).toBeNull();
  });
});
