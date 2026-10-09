"use client";

import { useState, type KeyboardEvent } from "react";

/**
 * 비밀번호 칸에서 Caps Lock이 켜져 있는지 (10/9: 대문자로 들어가 로그인이 안 되는 일을 막으려고)
 * 키를 누르거나 뗄 때 키보드 상태를 읽는다. 칸을 떠나면 안내를 지운다
 * 휴대폰 화면 키보드는 이 상태를 알려 주지 않아서 PC 키보드에서만 보인다
 */
export function useCapsLock() {
  const [on, setOn] = useState(false);
  const read = (e: KeyboardEvent<HTMLInputElement>) => setOn(e.getModifierState?.("CapsLock") ?? false);
  return {
    capsLock: on,
    capsLockHandlers: {
      onKeyDown: read,
      onKeyUp: read,
      onBlur: () => setOn(false),
    },
  };
}
