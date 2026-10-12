"use client";

import { Button } from "@/components/ui/button";

/** 재원생 화면 위쪽 [학생 등록]: 주소에 ?new=1을 붙여 등록 창을 연다 (서버를 다시 부르지 않게 history로, 10/12) */
export function NewStudentButton() {
  return (
    <Button
      variant="primary"
      onClick={() => {
        const p = new URLSearchParams(window.location.search);
        p.set("new", "1");
        window.history.pushState(null, "", `?${p}`);
      }}
    >
      학생 등록
    </Button>
  );
}
