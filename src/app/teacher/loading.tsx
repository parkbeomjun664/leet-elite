import { SkeletonBoard } from "@/components/ui/skeleton";

// 선생님 홈을 불러오는 동안: 실제 화면과 같은 모양의 회색 블록을 바로 보여 준다 (메뉴 이동 중 빈 화면 없음, 10/8)
export default function Loading() {
  return <SkeletonBoard immediate />;
}
