"use client";

import { Check, Delete } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimeSelect } from "@/components/ui/field";
import { FilterRow, Segment, Tabs } from "@/components/ui/segment";
import { Sheet, useSheetClose } from "@/components/ui/sheet";
import { SkeletonCards, SkeletonRows } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { MOCK_SAVE_MS, mockSave } from "@/lib/mock/save";
import { toast } from "@/lib/toast";
import { useAnimatedNumber } from "@/lib/use-animated-number";
import { useOptimisticSave } from "@/lib/use-optimistic-save";

// /design-system 미리보기에서 직접 눌러 보는 예시들. 가상 이름만 쓴다

/** 밑줄 탭(화면 바꾸기) + 알약(같은 화면 거르기) */
export function TabsDemo() {
  const [tab, setTab] = useState<"info" | "hw" | "msg">("info");
  const [cls, setCls] = useState("all");
  return (
    <div className="space-y-6">
      <Tabs
        label="학생 상세"
        value={tab}
        onChange={setTab}
        items={[
          { key: "info", label: "수업 정보" },
          { key: "hw", label: "숙제", count: 4 },
          { key: "msg", label: "메시지", count: 2 },
        ]}
      />
      <div className="rounded-[var(--radius-card)] bg-bg">
        <FilterRow label="반">
          {(
            [
              ["all", "전체", 14],
              ["c1", "OB-초저", 2],
              ["c2", "OB-초중", 8],
              ["c3", "초중", 4],
            ] as const
          ).map(([k, l, n]) => (
            <Segment key={k} active={cls === k} onClick={() => setCls(k)} count={n}>
              {l}
            </Segment>
          ))}
        </FilterRow>
      </div>
    </div>
  );
}

/** 누름 반응 카드: 관리 화면 학생 칸 / 휴대폰 카드 */
export function CardsDemo() {
  const [selected, setSelected] = useState("a");
  const students = [
    { id: "a", name: "김하윤", school: "가온초 초4", status: "등원", time: "등원 14:38" },
    { id: "b", name: "이서준", school: "나래초 초3", status: "미등원", time: "수업 14:30 ~ 15:50" },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <p className="mb-2 text-caption text-sub">관리 화면 학생 칸 (누르면 선택 = 진한 테두리)</p>
        <ul className="grid gap-2">
          {students.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelected(s.id)}
                aria-pressed={selected === s.id}
                className={cn(
                  "press-card w-full rounded-[var(--radius-card)] px-4 py-3 text-left",
                  selected === s.id ? "bg-card shadow-[inset_0_0_0_1.5px_var(--color-ink)]" : "bg-bg hover:bg-line-soft/60",
                )}
              >
                <span className="flex items-center justify-between">
                  <span>
                    <b className="text-heading">{s.name}</b> <span className="text-caption text-sub">{s.school}</span>
                  </span>
                  <span className={cn("text-caption font-semibold", s.status === "등원" ? "text-ok" : "text-warn")}>● {s.status}</span>
                </span>
                <span className="mt-1 block text-caption text-sub tabular">{s.time}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-[var(--radius-card)] bg-bg p-4">
        <p className="mb-2 text-caption text-sub">휴대폰 카드 (bg 바탕 위 흰 카드, 모서리 12)</p>
        <div className="rounded-[var(--radius-mcard)] bg-card p-5">
          <p className="text-caption text-sub">오늘 할 숙제</p>
          <p className="mt-1 text-title font-bold">단어 암기 30개</p>
          <Button variant="primary" size="lg" className="mt-4 w-full" onClick={() => toast.success("숙제를 제출했어요")}>
            제출하기
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 토스트: 성공·실패 */
export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast.success("하원 처리했어요")}>성공 토스트</Button>
      <Button onClick={() => toast.error("저장하지 못했어요. 다시 눌러 주세요")}>실패 토스트</Button>
    </div>
  );
}

/** 스켈레톤: [다시 불러오기]를 누르면 1.5초 동안 */
export function SkeletonDemo() {
  const [loading, setLoading] = useState(false);
  const reload = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };
  return (
    <div className="space-y-4">
      <Button size="sm" onClick={reload} disabled={loading}>
        다시 불러오기
      </Button>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-caption text-sub">학생 칸 격자</p>
          {loading ? (
            <SkeletonCards count={4} className="sm:grid-cols-2 xl:grid-cols-2" />
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {["김하윤", "이서준", "박지우", "최민서"].map((n) => (
                <li key={n} className="rounded-[var(--radius-card)] bg-bg px-4 py-3.5">
                  <b className="text-heading">{n}</b>
                  <p className="mt-1 text-caption text-sub tabular">등원 14:5{n.length}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-2 text-caption text-sub">목록</p>
          {loading ? (
            <SkeletonRows rows={3} />
          ) : (
            <ul className="divide-y divide-line-soft">
              {["단어 암기 30개", "리딩 워크북 p.24~27", "문법 복습"].map((t, i) => (
                <li key={t} className="flex items-center justify-between py-3.5">
                  <span>
                    <span className="block">{t}</span>
                    <span className="text-caption text-sub">10/{5 - i} 마감</span>
                  </span>
                  <Badge tone={i === 0 ? "warn" : "ok"}>{i === 0 ? "미제출" : "제출함"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** 시트 열기·닫기 */
export function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>출결 입력 시트 열기</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="김하윤 출결 입력" subtitle="가온초 · 초4 · OB-초중" width="md:w-[440px]" footer={<SheetFooter />}>
        <div className="space-y-2 p-5 text-body text-sub">
          <p>오른쪽에서 밀려 들어오고(250ms), 닫을 때는 빠르게(150ms) 빠집니다.</p>
          <p>Esc, 바깥, ×, [취소] 모두 같은 움직임으로 닫힙니다.</p>
        </div>
      </Sheet>
    </>
  );
}

function SheetFooter() {
  const close = useSheetClose();
  return (
    <div className="flex gap-2">
      <Button
        variant="primary"
        size="lg"
        className="flex-1"
        onClick={() => {
          toast.success("하원 처리했어요");
          close();
        }}
      >
        하원 처리
      </Button>
      <Button size="lg" onClick={close}>
        취소
      </Button>
    </div>
  );
}

/** 숫자 변화: 선생님 홈 상단 숫자처럼 */
export function NumbersDemo() {
  const [n, setN] = useState({ come: 6, wait: 1, leave: 0 });
  const move = () =>
    setN((p) => (p.wait > 0 ? { come: p.come + 1, wait: p.wait - 1, leave: p.leave } : p.come > 0 ? { come: p.come - 1, wait: p.wait, leave: p.leave + 1 } : { come: 6, wait: 1, leave: 0 }));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <dl className="flex gap-8">
        <AnimatedStat label="미등원" value={n.wait} tone="text-warn" />
        <AnimatedStat label="등원" value={n.come} tone="text-ok" />
        <AnimatedStat label="하원" value={n.leave} tone="text-info" />
      </dl>
      <Button size="sm" onClick={move}>
        한 명 움직이기
      </Button>
    </div>
  );
}

function AnimatedStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  const shown = useAnimatedNumber(value);
  return (
    <div className="text-center">
      <dd className={cn("text-figure font-bold tabular", value === 0 ? "text-ink/50" : tone)}>{shown}</dd>
      <dt className="text-caption text-sub">{label}</dt>
    </div>
  );
}

type Row = { id: string; name: string; status: "등원" | "하원" };
type Leave = { id: string };

/** 낙관적 업데이트: [하원]을 누르면 바로 바뀌고, 실패 흉내를 켜면 되돌아간다 */
export function OptimisticDemo() {
  const [rows, setRows] = useState<Row[]>([
    { id: "a", name: "김하윤", status: "등원" },
    { id: "b", name: "이서준", status: "등원" },
    { id: "c", name: "박지우", status: "등원" },
  ]);
  const [fail, setFail] = useState(false);
  const { value, run } = useOptimisticSave<Row[], Leave>({
    state: rows,
    setState: setRows,
    apply: (s, a) => s.map((r) => (r.id === a.id ? { ...r, status: "하원" } : r)),
    save: () => {
      window.__leetFailSave = fail;
      return mockSave();
    },
    successMessage: (a) => `${rows.find((r) => r.id === a.id)?.name} 하원 처리했어요`,
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-body">
          <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={fail} onChange={(e) => setFail(e.target.checked)} />
          저장 실패 흉내
        </label>
        <Button size="sm" variant="ghost" onClick={() => setRows((p) => p.map((r) => ({ ...r, status: "등원" })))}>
          처음으로
        </Button>
        <span className="text-caption text-sub">가짜 저장은 {MOCK_SAVE_MS / 1000}초 걸립니다</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {value.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-[var(--radius-card)] bg-bg px-4 py-3">
            <span>
              <b className="text-heading">{r.name}</b>
              <span className={cn("ml-2 text-caption font-semibold", r.status === "등원" ? "text-ok" : "text-info")}>● {r.status}</span>
            </span>
            {r.status === "등원" && (
              <Button size="sm" className="shadow-chip" onClick={() => run({ id: r.id })}>
                하원
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 출결 키패드: 실제 크기 숫자 버튼 + 완료 표시 */
export function KeypadDemo() {
  const [done, setDone] = useState(false);
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3"].map((d) => (
          <button key={d} type="button" className="press-key min-h-[72px] rounded-[var(--radius-card)] border border-line bg-card text-[48px] leading-none font-bold md:min-h-[88px] md:text-[56px]">
            {d}
          </button>
        ))}
        <button type="button" aria-label="지우기" className="press-key grid min-h-[72px] place-items-center rounded-[var(--radius-card)] border border-line bg-card text-sub md:min-h-[88px]">
          <Delete className="size-8" />
        </button>
        <button type="button" className="press-key min-h-[72px] rounded-[var(--radius-card)] border border-line bg-card text-[48px] leading-none font-bold md:min-h-[88px] md:text-[56px]">
          0
        </button>
        <button
          type="button"
          onClick={() => setDone((v) => !v)}
          className="press min-h-[72px] rounded-[var(--radius-card)] bg-brand text-[24px] font-bold text-white active:bg-brand-dark md:min-h-[88px]"
        >
          확인
        </button>
      </div>
      <div
        className={cn(
          "flex min-h-[160px] flex-col items-center justify-center rounded-[var(--radius-card)] border px-4 text-center transition-colors duration-[var(--duration-fast)]",
          done ? "border-transparent bg-ok-tint text-ok" : "border-line bg-card text-sub",
        )}
      >
        {done ? (
          <>
            <Check aria-hidden className="mb-1 size-8" />
            <p className="text-[40px] leading-tight font-bold text-ink md:text-[48px]">김하윤</p>
            <p className="text-[20px] font-semibold md:text-[24px]">14:38 등원했어요</p>
          </>
        ) : (
          <p className="text-[20px] font-semibold md:text-[24px]">출결 번호를 누르세요</p>
        )}
      </div>
    </div>
  );
}

/** 24시간제 시간 고르기 */
export function TimeSelectDemo() {
  const [t, setT] = useState("14:38");
  return <TimeSelect value={t} onChange={setT} label="등원 시각" />;
}
