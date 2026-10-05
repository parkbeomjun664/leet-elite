// 휴대폰 화면 구분 규칙 (10/2): 테두리 없이 ① 회색 페이지 바탕 위 흰 카드 ② 여백 단차 ③ 카드 밖 제목
// 서버 화면과 클라이언트 화면이 같이 쓰는 클래스라 "use client"가 없는 파일에 둔다

/** 흰 카드 (모서리 12px, 안쪽 여백 20px) */
export const MCARD = "rounded-[var(--radius-mcard)] bg-card p-5";
/** 여러 항목이 들어가는 흰 카드 목록 */
export const MCARD_LIST = "overflow-hidden rounded-[var(--radius-mcard)] bg-card";
/** 카드 안 항목 사이 구분선: 좌우 20px 들여쓴 1px 선 (첫 항목은 없음) */
export const ROW_DIVIDER = "relative before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-line-soft first:before:hidden";

