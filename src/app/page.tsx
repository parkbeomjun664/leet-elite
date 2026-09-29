import { redirect } from "next/navigation";

// 로그인 연결 전까지는 로그인 화면으로 보낸다. 로그인 후에는 역할별 첫 화면으로 보낼 예정
export default function Home() {
  redirect("/login");
}
