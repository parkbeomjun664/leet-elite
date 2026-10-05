import { redirect } from "next/navigation";

// 10/5: 스타일 가이드는 디자인 시스템 미리보기(/design-system)로 옮겼다
export default function OldDesignPage() {
  redirect("/design-system");
}
