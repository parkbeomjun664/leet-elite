// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button";

afterEach(cleanup);

describe("Button 상태 (docs/design.md 4번)", () => {
  it("기본: 누르면 onClick이 불린다", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("로딩: 글자는 자리에 남고(크기 유지) 다시 눌리지 않는다", () => {
    const onClick = vi.fn();
    render(
      <Button state="loading" onClick={onClick}>
        저장
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveProperty("disabled", false); // 회색 비활성이 아니라
    expect(btn.getAttribute("aria-disabled")).toBe("true"); // 누름만 막는다
    expect(btn.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("저장").className).toContain("invisible");
    expect(screen.getByText("처리 중")).toBeTruthy();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("로딩 중인 제출 버튼은 폼을 다시 보내지 않는다", () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" state="loading">
          로그인
        </Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("완료: 체크와 '완료'를 알리고, 눌리지 않는다", () => {
    const onClick = vi.fn();
    render(
      <Button state="done" onClick={onClick}>
        저장
      </Button>,
    );
    expect(screen.getByText("완료")).toBeTruthy();
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("비활성: disabled", () => {
    render(<Button disabled>저장</Button>);
    expect(screen.getByRole("button")).toHaveProperty("disabled", true);
  });
});
