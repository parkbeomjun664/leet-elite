import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { StatusScreen } from "@/components/status-screen";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "없는 화면" };

// 주소가 틀렸거나 지워진 화면
export default function NotFound() {
  return (
    <StatusScreen
      icon={SearchX}
      title="찾는 화면이 없어요"
      description="주소가 바뀌었거나 지워진 화면이에요. 처음 화면에서 다시 찾아 주세요."
      actions={
        <ButtonLink href="/" variant="primary" size="lg">
          처음 화면으로
        </ButtonLink>
      }
    />
  );
}
