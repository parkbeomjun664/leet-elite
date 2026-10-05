"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";
import { StatusScreen } from "@/components/status-screen";
import { Button, ButtonLink } from "@/components/ui/button";

// 화면을 그리다 오류가 나면 이 화면이 대신 나온다. 다시 시도하면 그 화면만 다시 불러온다 (Next 16: unstable_retry)
export default function ErrorPage({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={RotateCw}
      title="화면을 불러오지 못했어요"
      description="잠시 후 다시 시도해 주세요. 계속 안 되면 학원에 알려 주세요."
      actions={
        <>
          <Button variant="primary" size="lg" onClick={() => unstable_retry()}>
            다시 시도
          </Button>
          <ButtonLink href="/" size="lg">
            처음 화면으로
          </ButtonLink>
        </>
      }
    />
  );
}
