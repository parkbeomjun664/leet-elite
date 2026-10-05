// 토스트 알림 저장소: 어느 부품에서든 toast.success("…")로 띄운다. 화면에는 <Toaster />가 그린다
// 동시에 하나만 보인다(새 것이 이전 것을 바꾼다). 성공 2.5초, 실패 4초 (docs/design.md 4번)

export type ToastKind = "success" | "error";
export type ToastItem = { id: number; kind: ToastKind; message: string };

export const TOAST_MS: Record<ToastKind, number> = { success: 2500, error: 4000 };

let current: ToastItem | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function show(kind: ToastKind, message: string) {
  clearTimeout(timer);
  const item = { id: ++seq, kind, message };
  current = item;
  emit();
  timer = setTimeout(() => {
    if (current?.id === item.id) {
      current = null;
      emit();
    }
  }, TOAST_MS[kind]);
  return item.id;
}

export const toast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  dismiss: () => {
    clearTimeout(timer);
    current = null;
    emit();
  },
};

export function subscribeToast(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToast() {
  return current;
}
