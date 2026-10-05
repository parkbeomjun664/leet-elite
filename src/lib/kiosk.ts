// 출결 키패드 규칙 (KIOSK). 화면과 테스트가 같은 규칙을 쓰도록 따로 둔다
// 10/5 범준님: 출결 번호는 4자리 고정. 4칸이 다 차면 [확인] 없이 바로 처리한다

export const KIOSK_CODE_LEN = 4;

/** 출결 번호 모양이 맞는지 (숫자 4자리) */
export function isKioskCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

/** 지금까지 누른 번호로 바로 처리할지: 4칸이 다 찼으면 (없는 번호면 '등록되지 않은 번호' 안내로 넘어감) */
export function shouldSubmitNow(input: string): boolean {
  return input.length >= KIOSK_CODE_LEN;
}
