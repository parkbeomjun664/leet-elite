// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { getToast, toast } from "./toast";
import { useOptimisticSave } from "./use-optimistic-save";

// 출결 상태 흉내: 학생 id → 상태
type Board = Record<string, string>;
type Action = { id: string; status: string };
const apply = (s: Board, a: Action) => ({ ...s, [a.id]: a.status });

/** 저장을 테스트에서 직접 끝내거나 실패시키는 가짜 저장 */
function controlledSave() {
  const calls: { action: Action; resolve: () => void; reject: () => void }[] = [];
  const save = (action: Action) => new Promise<void>((resolve, reject) => calls.push({ action, resolve, reject: () => reject(new Error("x")) }));
  return { save, calls };
}

function setup(save: (a: Action) => Promise<void>) {
  return renderHook(() => {
    const [state, setState] = useState<Board>({ s1: "등원", s2: "등원" });
    const opt = useOptimisticSave({ state, setState, apply, save, successMessage: () => "하원 처리했어요" });
    return { state, ...opt };
  });
}

afterEach(() => {
  cleanup();
  toast.dismiss();
});

// 저장이 끝난 뒤 React가 전환을 마무리할 시간
const tick = () => new Promise((r) => setTimeout(r, 20));

describe("useOptimisticSave", () => {
  it("누르면 저장이 끝나기 전에 화면 값이 먼저 바뀐다", async () => {
    const { save, calls } = controlledSave();
    const { result } = setup(save);
    await act(async () => void result.current.run({ id: "s1", status: "하원" }));
    await waitFor(() => expect(result.current.value.s1).toBe("하원"));
    expect(result.current.state.s1).toBe("등원"); // 진짜 상태는 아직
    expect(calls).toHaveLength(1);
    // 끝나지 않은 저장을 남기면 다음 테스트의 전환까지 묶인다 (React 19는 진행 중인 비동기 전환을 함께 끝낸다)
    await act(async () => {
      calls[0].resolve();
      await tick();
    });
  });

  it("성공하면 진짜 상태에 반영되고 성공 토스트", async () => {
    const { save, calls } = controlledSave();
    const { result } = setup(save);
    let done!: Promise<boolean>;
    await act(async () => void (done = result.current.run({ id: "s1", status: "하원" })));
    await act(async () => {
      calls[0].resolve();
      await tick();
    });
    await expect(done).resolves.toBe(true);
    await waitFor(() => expect(result.current.state.s1).toBe("하원"));
    expect(result.current.value.s1).toBe("하원");
    expect(getToast()).toMatchObject({ kind: "success", message: "하원 처리했어요" });
  });

  it("실패하면 누르기 전으로 되돌리고 실패 토스트", async () => {
    const { save, calls } = controlledSave();
    const { result } = setup(save);
    let done!: Promise<boolean>;
    await act(async () => void (done = result.current.run({ id: "s1", status: "하원" })));
    await waitFor(() => expect(result.current.value.s1).toBe("하원"));
    await act(async () => {
      calls[0].reject();
      await tick();
    });
    await expect(done).resolves.toBe(false);
    await waitFor(() => expect(result.current.value.s1).toBe("등원"));
    expect(result.current.state.s1).toBe("등원");
    expect(getToast()).toMatchObject({ kind: "error", message: "저장하지 못했어요. 다시 눌러 주세요" });
  });

  it("두 명을 연달아 누르고 하나만 실패하면 실패한 학생만 되돌린다", async () => {
    const { save, calls } = controlledSave();
    const { result } = setup(save);
    await act(async () => void result.current.run({ id: "s1", status: "하원" }));
    await act(async () => void result.current.run({ id: "s2", status: "하원" }));
    await waitFor(() => expect(result.current.value).toEqual({ s1: "하원", s2: "하원" }));
    await act(async () => {
      calls[0].reject();
      await tick();
    });
    await act(async () => {
      calls[1].resolve();
      await tick();
    });
    await waitFor(() => expect(result.current.value).toEqual({ s1: "등원", s2: "하원" }));
    expect(result.current.state).toEqual({ s1: "등원", s2: "하원" });
  });
});
