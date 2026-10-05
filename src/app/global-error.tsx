"use client";

import "./globals.css";
import { RotateCw } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";

// 맨 바깥 틀(layout)까지 오류가 난 경우. 틀이 없으므로 html·body를 직접 그린다
export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="ko">
      <body>
        <StatusScreen
          icon={RotateCw}
          title="앱을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요. 계속 안 되면 학원에 알려 주세요."
          actions={
            <Button variant="primary" size="lg" onClick={() => unstable_retry()}>
              다시 시도
            </Button>
          }
        />
      </body>
    </html>
  );
}
