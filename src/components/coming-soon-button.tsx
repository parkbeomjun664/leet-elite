"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

/**
 * 아직 만들지 않은 기능의 버튼. 눌러도 아무 반응이 없으면 고장으로 보이므로, 언제 열리는지 안내한다
 * opensOn: 일별 계획(docs/progress.md)의 날짜. 예: feature "학생 등록", opensOn "10/12" → "학생 등록 기능은 10/12에 열려요"
 */
export function ComingSoonButton({ feature, opensOn, ...rest }: Omit<ComponentProps<typeof Button>, "onClick"> & { feature: string; opensOn: string }) {
  return <Button {...rest} onClick={() => toast.info(`${feature} 기능은 ${opensOn}에 열려요`)} />;
}
