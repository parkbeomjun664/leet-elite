import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Radio, Select, Textarea } from "@/components/ui/field";
import { EmptyLine, InfoList, PageHeader, Panel, SectionTitle, Stat } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { DesignTabsDemo } from "./tabs-demo";

export const metadata: Metadata = { title: "스타일 가이드" };

// 모든 화면은 여기 있는 부품과 색만 쓴다. 새 부품을 만들면 여기에도 추가한다. (CLAUDE.md 디자인 규칙)

const COLORS = [
  { name: "brand", label: "메인 (버건디)", cls: "bg-brand", hex: "#B72F34" },
  { name: "brand-dark", label: "진한 메인", cls: "bg-brand-dark", hex: "#92262A" },
  { name: "brand-tint", label: "메인 연한 바탕", cls: "bg-brand-tint", hex: "#FBECEE" },
  { name: "bg", label: "화면 바탕", cls: "bg-bg", hex: "#F6F4F3" },
  { name: "card", label: "카드", cls: "bg-card", hex: "#FFFFFF" },
  { name: "line", label: "테두리", cls: "bg-line", hex: "#E5DEDC" },
  { name: "ink", label: "글자", cls: "bg-ink", hex: "#252525" },
  { name: "sub", label: "보조 글자", cls: "bg-sub", hex: "#74696A" },
  { name: "ok", label: "상태: 정상·등원·제출", cls: "bg-ok", hex: "#2F7D5B" },
  { name: "warn", label: "상태: 주의·미등원·미제출", cls: "bg-warn", hex: "#B7791F" },
  { name: "info", label: "상태: 안내·하원·매일 숙제", cls: "bg-info", hex: "#2B6CB0" },
];

const TYPE = [
  { label: "화면 제목", cls: "text-[22px] font-bold", sample: "2026년 9월 30일 (수)" },
  { label: "구역 제목 · 이름", cls: "text-base font-bold", sample: "오늘 등원 · 김하윤" },
  { label: "본문", cls: "text-[15px]", sample: "수업 15:00 ~ 16:30 · 등원 15:07" },
  { label: "기본 (표·목록)", cls: "text-sm", sample: "리트초 초4 · OB-초중" },
  { label: "숫자 요약", cls: "text-xl font-bold tabular", sample: "14  3  1" },
];

export default function DesignPage() {
  return (
    <main className="mx-auto max-w-[1080px] space-y-8 px-4 py-8">
      <PageHeader title="스타일 가이드" description="리트 엘리트의 색, 글씨, 공통 부품. 모든 화면은 이 부품만 사용합니다." />

      <Panel title="색">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {COLORS.map((c) => (
            <li key={c.name} className="flex items-center gap-3">
              <span className={`size-10 shrink-0 rounded-[var(--radius-control)] border border-line ${c.cls}`} />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{c.label}</span>
                <span className="block text-sm text-sub tabular">
                  {c.name} · {c.hex}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="글씨">
        <ul className="divide-y divide-line-soft">
          {TYPE.map((t) => (
            <li key={t.label} className="flex items-baseline gap-4 py-2.5">
              <span className="w-32 shrink-0 text-sm text-sub">{t.label}</span>
              <span className={t.cls}>{t.sample}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-sub">글꼴 Pretendard · 13px 미만 글씨는 쓰지 않음 · 시간과 숫자는 자릿수를 맞춤(tabular)</p>
      </Panel>

      <Panel title="버튼">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">출결 등록</Button>
            <Button>취소</Button>
            <Button variant="ghost">더보기</Button>
            <Button variant="danger">삭제</Button>
            <Button variant="primary" disabled>
              저장 중…
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">작게 32px</Button>
            <Button>보통 40px</Button>
            <Button size="lg" variant="primary">
              크게 48px (휴대폰 주요 버튼)
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="입력">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="학생 이름" htmlFor="d-name" required hint="동명이인은 학교·학년으로 구분됩니다">
            <Input id="d-name" placeholder="홍길동" />
          </Field>
          <Field label="출결 코드" htmlFor="d-code" error="이미 다른 재원생이 쓰는 코드입니다">
            <Input id="d-code" defaultValue="1020" className="border-brand" />
          </Field>
          <Field label="반" htmlFor="d-class">
            <Select id="d-class" defaultValue="c6">
              <option value="c6">중등(브릿지)</option>
              <option value="c7">고등-코어</option>
            </Select>
          </Field>
          <Field label="상태">
            <div className="flex gap-5 pt-2">
              <Radio name="d-st" label="정상" defaultChecked />
              <Radio name="d-st" label="결석" />
              <Radio name="d-st" label="미등원" />
            </div>
          </Field>
          <Field label="메모" htmlFor="d-memo" className="md:col-span-2">
            <Textarea id="d-memo" placeholder="예: 화목 3시 10분 시작" />
          </Field>
          <Checkbox label="오늘 날짜 사용" defaultChecked />
        </div>
      </Panel>

      <Panel title="상태 표시">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="ok">등원 · 제출</Badge>
          <Badge tone="info">하원 · 매일 숙제</Badge>
          <Badge tone="warn">미등원 · 미제출</Badge>
          <Badge tone="brand">결석 · 새 메시지</Badge>
          <Badge>수업 전 · 일반 숙제</Badge>
        </div>
      </Panel>

      <Panel title="필터 · 탭">
        <DesignTabsDemo />
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="정보 목록" actions={<Button size="sm">수정</Button>}>
          <InfoList
            items={[
              { label: "학교·학년", value: "리트초 초4" },
              { label: "반", value: "OB-초중" },
              { label: "수업 시간", value: "월·수·금 14:30 ~ 15:50" },
              { label: "출결 코드", value: "1004" },
            ]}
          />
        </Panel>
        <Panel title="숫자 요약 · 빈 목록">
          <dl className="mb-4 flex gap-5">
            <Stat label="오늘 수업" value={14} />
            <Stat label="등원" value={3} tone="text-ok" />
            <Stat label="미등원" value={1} tone="text-warn" />
          </dl>
          <SectionTitle count={0}>오늘 보강</SectionTitle>
          <EmptyLine>오늘 예정된 보강이 없습니다.</EmptyLine>
        </Panel>
      </div>

      <section>
        <SectionTitle>표</SectionTitle>
        <Table>
          <thead>
            <tr>
              <Th>이름</Th>
              <Th>학교·학년</Th>
              <Th>반</Th>
              <Th>출결 코드</Th>
              <Th>상태</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ["김하윤", "리트초 초4", "OB-초중", "1004", "ok"],
              ["이서준", "푸른중 중2", "중등(브릿지)", "1037", "warn"],
              ["박지우", "해오름고 고1", "고등-코어", "1059", "neutral"],
            ].map(([n, s, c, code, tone]) => (
              <Tr key={n}>
                <Td className="font-semibold">{n}</Td>
                <Td>{s}</Td>
                <Td>{c}</Td>
                <Td className="tabular">{code}</Td>
                <Td>
                  <Badge tone={tone as "ok" | "warn" | "neutral"}>{tone === "ok" ? "등원" : tone === "warn" ? "미등원" : "수업 전"}</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </section>
    </main>
  );
}
