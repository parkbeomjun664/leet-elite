// 로그인 화면 문구 (서버 함수와 화면이 같이 쓴다)

// 로그인 실패는 이유와 상관없이 이 문장 하나만 보여 준다 (아이디가 있는지 없는지 드러나지 않게, AUTH-09)
export const LOGIN_ERROR = "아이디 또는 비밀번호가 올바르지 않습니다.";
// 너무 많이 틀려서 잠시 막혔을 때 덧붙이는 문장 (AUTH-10)
export const LOCKED_HINT = "잠시 후 다시 시도해 주세요.";

// 실패하면 입력한 아이디·상태 유지 체크를 돌려준다 (React가 보낸 폼을 비우므로 다시 채운다)
// 시도 기록을 읽거나 쓰지 못하면 로그인을 막는다 (잠금 없이 열리지 않게). 계정이 있는지와 상관없는 문구
export const UNAVAILABLE = "지금은 로그인할 수 없어요. 잠시 후 다시 시도해 주세요.";

export type LoginState = { error?: string; hint?: string; loginId?: string; keep?: boolean };
