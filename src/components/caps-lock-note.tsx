/** 비밀번호 칸 아래 Caps Lock 안내 (src/lib/use-caps-lock.ts). 오류가 아니라 주의라서 빨강 대신 주황 글씨 */
export function CapsLockNote({ id, on }: { id: string; on: boolean }) {
  return (
    <p id={id} aria-live="polite" className="mt-1.5 px-1 text-caption font-semibold text-warn empty:hidden">
      {on ? "Caps Lock이 켜져 있어요. 대문자로 입력되고 있어요" : ""}
    </p>
  );
}
