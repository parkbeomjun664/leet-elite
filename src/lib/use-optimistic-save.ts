import { useOptimistic, useTransition, type Dispatch, type SetStateAction } from "react";
import { toast } from "./toast";

/**
 * 낙관적 업데이트: 누르면 화면을 먼저 바꾸고, 뒤에서 저장한다 (docs/design.md 7번)
 * - 성공: 진짜 상태에 반영 + 성공 토스트
 * - 실패: 아무것도 하지 않으면 React가 누르기 전 화면으로 되돌린다 + 실패 토스트
 * 저장 중에도 계속 누를 수 있다. 진짜 상태는 끝난 순서대로 apply를 거듭 적용한다
 *
 * DB를 연결하면 save만 서버 함수로 바꾼다
 */
export function useOptimisticSave<S, A>({
  state,
  setState,
  apply,
  save,
  successMessage,
  errorMessage = () => "저장하지 못했어요. 다시 눌러 주세요",
}: {
  state: S;
  setState: Dispatch<SetStateAction<S>>;
  /** 상태에 행동 하나를 반영한 새 상태 (순수 함수) */
  apply: (state: S, action: A) => S;
  save: (action: A) => Promise<void>;
  successMessage?: (action: A) => string;
  errorMessage?: (action: A) => string;
}) {
  const [value, addOptimistic] = useOptimistic(state, apply);
  const [pending, startTransition] = useTransition();

  /** 저장이 끝나면 성공 여부를 돌려준다 (실패 시 입력한 글을 남겨 두는 등에 쓴다) */
  function run(action: A) {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        addOptimistic(action);
        try {
          await save(action);
          // await 뒤의 상태 변경도 같은 전환 안에서 일어나게 다시 감싼다 (React 19 규칙)
          startTransition(() => setState((prev) => apply(prev, action)));
          const msg = successMessage?.(action);
          if (msg) toast.success(msg);
          resolve(true);
        } catch {
          toast.error(errorMessage(action));
          resolve(false);
        }
      });
    });
  }

  return { value, run, pending };
}
