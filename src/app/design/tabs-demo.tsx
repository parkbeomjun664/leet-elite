"use client";

import { useState } from "react";
import { FilterRow, Segment, Tabs } from "@/components/ui/segment";

// 스타일 가이드용: 필터 줄과 탭이 실제로 눌리는 모습
export function DesignTabsDemo() {
  const [cls, setCls] = useState("all");
  const [tab, setTab] = useState<"info" | "hw" | "msg">("info");
  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-card)] border border-line">
        <FilterRow label="반">
          {[
            ["all", "전체", 14],
            ["c2", "OB-초중", 8],
            ["c4", "초중", 4],
          ].map(([k, l, n]) => (
            <Segment key={k} active={cls === k} onClick={() => setCls(String(k))} count={Number(n)}>
              {l}
            </Segment>
          ))}
        </FilterRow>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "info", label: "수업 정보" },
          { key: "hw", label: "숙제", count: 4 },
          { key: "msg", label: "학부모 메시지", count: 2 },
        ]}
      />
    </div>
  );
}
