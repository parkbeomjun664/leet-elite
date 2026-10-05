// 가짜 저장 (DB 연결 전). 잠깐 기다렸다가 성공한다
// 실패 흉내: window.__leetFailSave = true 이면 실패한다 (Playwright 테스트, /design-system 미리보기의 [저장 실패 흉내])

declare global {
  interface Window {
    __leetFailSave?: boolean;
  }
}

export const MOCK_SAVE_MS = 400;

export function shouldFailSave() {
  return typeof window !== "undefined" && window.__leetFailSave === true;
}

export function mockSave(ms = MOCK_SAVE_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => (shouldFailSave() ? reject(new Error("저장 실패 (흉내)")) : resolve()), ms);
  });
}
