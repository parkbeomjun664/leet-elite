// 시작 화면(src/components/splash.tsx)을 보일지 그리기 전에 정하는 <head> 스크립트 (10/12)
// 이 탭에서 처음 연 것이면 html[data-splash="on"], 이미 봤으면 "off". sessionStorage를 못 쓰면 "off"
// "use client" 파일에서 문자열을 내보내면 서버 레이아웃에는 문자열이 아니라 클라이언트 참조가 가서, 따로 둔다
export const SPLASH_KEY = "leet-splash";

export const SPLASH_SCRIPT = `try{var d=document.documentElement;if(sessionStorage.getItem("${SPLASH_KEY}")){d.dataset.splash="off"}else{sessionStorage.setItem("${SPLASH_KEY}","1");d.dataset.splash="on"}}catch(e){document.documentElement.dataset.splash="off"}`;
