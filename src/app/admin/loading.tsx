import { SkeletonPage } from "@/components/ui/skeleton";

// 화면을 불러오는 동안 빈 화면 대신 같은 모양의 회색 블록 (0.2초 안에 끝나면 보이지 않음, docs/design.md 4번)
export default function Loading() {
  return <SkeletonPage />;
}
