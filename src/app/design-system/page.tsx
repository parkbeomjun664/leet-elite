import { CalendarX2, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { CardsDemo, KeypadDemo, NumbersDemo, OptimisticDemo, SheetDemo, SkeletonDemo, TabsDemo, TimeSelectDemo, ToastDemo } from "./demos";

export const metadata: Metadata = { title: "디자인 시스템" };

// 기준 문서: docs/design.md. 새 부품을 만들면 여기에도 추가한다

const NEUTRALS = [
  { name: "ink", hex: "#1A1A1A", use: "본문·제목·선택 테두리", cls: "bg-ink" },
  { name: "sub", hex: "#6E6D6A", use: "보조 글씨·라벨", cls: "bg-sub" },
  { name: "faint", hex: "#A3A19D", use: "아이콘·안내·비활성", cls: "bg-faint" },
  { name: "line", hex: "#E4E2DE", use: "입력칸·보조 버튼 테두리", cls: "bg-line" },
  { name: "line-soft", hex: "#EFEDEA", use: "구분선·스켈레톤", cls: "bg-line-soft" },
  { name: "bg", hex: "#F7F6F4", use: "휴대폰 바탕·옅은 칸", cls: "bg-bg" },
  { name: "card", hex: "#FFFFFF", use: "관리 바탕·카드", cls: "bg-card" },
];

const STATUS = [
  { name: "ok", label: "등원 · 제출함", fg: "#2E7D4F", bg: "#EAF5EE", tone: "ok" as const },
  { name: "warn", label: "미등원 · 미제출", fg: "#A6650A", bg: "#FDF3E1", tone: "warn" as const },
  { name: "info", label: "하원 · 예정", fg: "#2B6CB0", bg: "#E8F0FA", tone: "info" as const },
  { name: "brand", label: "결석", fg: "#B3262E", bg: "#FBECEE", tone: "brand" as const },
];

const TYPE = [
  { name: "제목 title", spec: "22 · bold", cls: "text-title font-bold", sample: "2026년 10월 5일 (월)" },
  { name: "소제목 heading", spec: "16 · semibold", cls: "text-heading font-semibold", sample: "오늘 등원 · 김하윤" },
  { name: "본문 body", spec: "15 · regular", cls: "text-body", sample: "수업 15:00 ~ 16:30 · 등원 15:07" },
  { name: "보조 caption", spec: "13 · regular", cls: "text-caption text-sub", sample: "가온초 초4 · OB-초중" },
  { name: "숫자 figure", spec: "24 · bold · 폭 같은 숫자", cls: "text-figure font-bold tabular", sample: "7   1   6" },
];

const TONES = [
  { who: "선생님", tone: "밀도 높게", rule: "한 화면에 반 전체, 목록 + 오른쪽 상세. 숫자 0은 회색" },
  { who: "원장님", tone: "한눈에", rule: "확인할 일 먼저(0이면 숨김), 숫자 24px 오른쪽 정렬" },
  { who: "학생", tone: "할 일 중심", rule: "맨 위 오늘 할 숙제 + [제출하기] 하나" },
  { who: "학부모", tone: "상태 한눈에", rule: "맨 위 한 문장 \"14:38 등원했어요\" + 상태색 카드" },
  { who: "키패드", tone: "초대형", rule: "숫자 48px 이상, 버튼 72px 이상. 누름 반응·완료 표시만 움직임" },
];

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-[1080px] px-4 pt-10 pb-24 md:px-6">
      <header className="border-b border-line-soft pb-8">
        <p className="text-caption font-semibold text-sub">LEET Elite 디자인 시스템</p>
        <h1 className="mt-2 text-title font-bold tracking-tight">차분한 화면에 빨강 한 방울, 누르면 바로 답하는 화면</h1>
        <p className="mt-3 max-w-[620px] text-body text-sub">
          화면 대부분은 흰색과 회색입니다. 빨강은 그 화면에서 가장 중요한 버튼 하나에만 씁니다. 누르면 저장을 기다리지 않고 바로 바뀌고, 실패하면 되돌린 뒤
          알려 드립니다.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button variant="primary">하원 처리</Button>
          <Button>취소</Button>
          <Button variant="ghost">전체 보기</Button>
          <span className="ml-2 text-caption text-sub">← 직접 눌러 보세요</span>
        </div>
      </header>

      <Section title="색" note="회색은 한 벌. 빨강은 로고·주 버튼·결석·오류에만, 상태색은 상태 표시에만 씁니다.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {NEUTRALS.map((c) => (
            <li key={c.name}>
              <span className={`block h-14 rounded-[var(--radius-card)] shadow-[inset_0_0_0_1px_rgb(26_26_26/0.06)] ${c.cls}`} />
              <p className="mt-2 text-caption font-semibold">{c.name}</p>
              <p className="text-caption text-sub tabular">{c.hex}</p>
              <p className="text-caption text-sub">{c.use}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_2fr]">
          <div>
            <Sub>브랜드</Sub>
            <ul className="flex gap-3">
              {[
                ["brand", "#B3262E", "bg-brand", "주 버튼"],
                ["brand-dark", "#92262A", "bg-brand-dark", "눌림"],
                ["brand-tint", "#FBECEE", "bg-brand-tint", "결석만"],
              ].map(([n, h, cls, use]) => (
                <li key={n} className="flex-1">
                  <span className={`block h-14 rounded-[var(--radius-card)] ${cls}`} />
                  <p className="mt-2 text-caption font-semibold">{n}</p>
                  <p className="text-caption text-sub tabular">{h}</p>
                  <p className="text-caption text-sub">{use}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Sub>상태</Sub>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATUS.map((s) => (
                <li key={s.name} className="rounded-[var(--radius-card)] bg-bg p-3">
                  <Badge tone={s.tone}>{s.label.split(" · ")[0]}</Badge>
                  <p className="mt-2 text-caption font-semibold">{s.name}</p>
                  <p className="text-caption text-sub tabular">
                    {s.fg} / {s.bg}
                  </p>
                  <p className="text-caption text-sub">{s.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="글자" note="Pretendard 하나, 크기 5단계. 굵기는 regular·semibold·bold 세 가지.">
        <ul className="divide-y divide-line-soft">
          {TYPE.map((t) => (
            <li key={t.name} className="grid items-baseline gap-1 py-4 sm:grid-cols-[180px_1fr]">
              <div>
                <p className="text-caption font-semibold">{t.name}</p>
                <p className="text-caption text-sub">{t.spec}</p>
              </div>
              <p className={t.cls}>{t.sample}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-caption text-sub">출결 키패드는 따로: 숫자 48px(태블릿 56) · 결과 이름 40px(48) · 안내 20px(24) · 버튼 최소 72px(88). 아래 &quot;출결 키패드&quot;에서 실제 크기로 볼 수 있습니다.</p>
      </Section>

      <Section title="여백 · 모서리 · 그림자" note="여백은 4의 배수. 구분은 테두리보다 바탕 단차와 여백으로.">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Sub>여백</Sub>
            <ul className="space-y-1.5">
              {[4, 8, 12, 16, 20, 24, 32, 40].map((n) => (
                <li key={n} className="flex items-center gap-3">
                  <span className="w-8 text-right text-caption text-sub tabular">{n}</span>
                  <span className="h-2 rounded-full bg-ink/80" style={{ width: n * 3 }} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Sub>모서리</Sub>
            <ul className="grid grid-cols-2 gap-3">
              {[
                ["4", "배지", "rounded-[var(--radius-badge)]"],
                ["6", "버튼·입력", "rounded-[var(--radius-control)]"],
                ["8", "관리 카드·시트", "rounded-[var(--radius-card)]"],
                ["12", "휴대폰 카드", "rounded-[var(--radius-mcard)]"],
              ].map(([n, use, cls]) => (
                <li key={n}>
                  <span className={`block h-12 bg-line-soft ${cls}`} />
                  <p className="mt-1.5 text-caption">
                    <b className="tabular">{n}px</b> <span className="text-sub">{use}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Sub>그림자 (두 단계만)</Sub>
            <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-card)] bg-bg p-4">
              <div>
                <span className="block h-12 rounded-[var(--radius-control)] bg-card shadow-chip" />
                <p className="mt-1.5 text-caption">
                  <b>chip</b> <span className="text-sub">카드 안 작은 버튼</span>
                </p>
              </div>
              <div>
                <span className="block h-12 rounded-[var(--radius-card)] bg-card shadow-float" />
                <p className="mt-1.5 text-caption">
                  <b>float</b> <span className="text-sub">시트·토스트</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="버튼" note="주(빨강)는 화면마다 하나. 누르면 0.97로 살짝 줄어듭니다.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="text-caption text-sub">
                <th className="py-2 font-semibold" />
                <th className="py-2 font-semibold">sm 32</th>
                <th className="py-2 font-semibold">md 40</th>
                <th className="py-2 font-semibold">lg 48</th>
                <th className="py-2 font-semibold">비활성</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["primary", "주", "저장"],
                  ["secondary", "보조", "취소"],
                  ["ghost", "텍스트", "전체 보기"],
                  ["danger", "위험", "퇴원 처리"],
                ] as const
              ).map(([v, label, text]) => (
                <tr key={v} className="border-t border-line-soft">
                  <td className="py-3 pr-4 text-caption font-semibold whitespace-nowrap">{label}</td>
                  <td className="py-3 pr-3">
                    <Button variant={v} size="sm">
                      {text}
                    </Button>
                  </td>
                  <td className="py-3 pr-3">
                    <Button variant={v}>{text}</Button>
                  </td>
                  <td className="py-3 pr-3">
                    <Button variant={v} size="lg">
                      {text}
                    </Button>
                  </td>
                  <td className="py-3">
                    <Button variant={v} disabled>
                      {text}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="입력칸" note="관리 화면 40px, 휴대폰·로그인 48px. 초점은 진한 테두리 + 옅은 링, 오류는 빨강.">
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="이름" htmlFor="ds-name">
            <Input id="ds-name" placeholder="이름 검색" />
          </Field>
          <Field label="학생 휴대폰" htmlFor="ds-phone" error="휴대폰 번호 11자리를 넣어 주세요">
            <Input id="ds-phone" defaultValue="010-5550" aria-invalid />
          </Field>
          <Field label="상태" htmlFor="ds-state">
            <Select id="ds-state" defaultValue="재원">
              <option>재원</option>
              <option>휴원</option>
            </Select>
          </Field>
          <Field label="로그인 (휴대폰 48px)" htmlFor="ds-login">
            <Input id="ds-login" inputSize="lg" placeholder="휴대폰 번호 또는 아이디" />
          </Field>
          <Field label="등원 시각 (24시간제)">
            <TimeSelectDemo />
          </Field>
        </div>
      </Section>

      <Section title="배지" note="상태색 바탕 + 진한 글씨, 13px. 선생님 홈 학생 칸만 점 + 글자.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="ok">등원</Badge>
          <Badge tone="warn">미등원</Badge>
          <Badge tone="info">하원</Badge>
          <Badge tone="brand">결석</Badge>
          <Badge>수업 없음</Badge>
          <span className="mx-2 h-5 w-px bg-line" />
          <Badge tone="ok" size="lg">
            제출함
          </Badge>
          <Badge tone="warn" size="lg">
            미제출
          </Badge>
          <span className="ml-1 text-caption text-sub">← 휴대폰 (26px)</span>
          <span className="mx-2 h-5 w-px bg-line" />
          <span className="text-caption font-semibold text-ok">● 등원</span>
          <span className="text-caption font-semibold text-warn">● 미등원</span>
        </div>
      </Section>

      <Section title="탭" note="두 종류만: 화면을 바꾸면 밑줄(미끄러지듯 이동), 같은 화면을 거르면 알약.">
        <TabsDemo />
      </Section>

      <Section title="카드" note="테두리 없이 바탕 단차로. 누를 수 있는 카드는 0.98로 줄어듭니다.">
        <CardsDemo />
      </Section>

      <Section title="빈 상태" note="상황 한 문장 + 할 수 있는 일. 점선·빨강 글씨 없이.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-card)] bg-bg">
            <EmptyState icon={MessageCircle} title="아직 주고받은 메시지가 없어요" description="학생에게 먼저 말을 걸어 보세요" action={<Button size="sm">메시지 쓰기</Button>} />
          </div>
          <div className="rounded-[var(--radius-card)] bg-bg">
            <EmptyState icon={CalendarX2} title="오늘은 수업이 없어요" description="다음 수업: 10/8 (목) 15:00" />
          </div>
        </div>
      </Section>

      <Section title="토스트" note="아래 가운데, 한 번에 하나. 성공 2.5초, 실패 4초. 버튼 이름과 같은 말로.">
        <ToastDemo />
      </Section>

      <Section title="스켈레톤" note="목록·상세를 불러오는 동안 같은 자리에 회색 블록. 0.2초 안에 끝나면 보이지 않습니다.">
        <SkeletonDemo />
      </Section>

      <Section title="시트" note="관리 화면은 오른쪽에서, 휴대폰은 화면 전체로 나옵니다.">
        <SheetDemo />
      </Section>

      <Section title="움직임" note="사람이 누른 것에 답할 때만 움직입니다. 기기의 '움직임 줄이기'를 켜면 모두 멈춥니다.">
        <div className="grid gap-x-8 gap-y-2 text-caption sm:grid-cols-3">
          {[
            ["150ms", "누름 반응 · 색 바뀜 · 닫힘"],
            ["200ms", "탭 밑줄 · 토스트 · 덮개"],
            ["250ms", "시트 열림 · 숫자 변화"],
          ].map(([t, use]) => (
            <p key={t} className="border-t border-line-soft pt-2">
              <b className="tabular">{t}</b> <span className="text-sub">{use}</span>
            </p>
          ))}
        </div>
        <div className="mt-8 space-y-8">
          <div>
            <Sub>숫자 변화</Sub>
            <NumbersDemo />
          </div>
          <div>
            <Sub>누르는 즉시 반영 (낙관적 업데이트)</Sub>
            <p className="mb-3 text-caption text-sub">[하원]을 누르면 바로 바뀝니다. &quot;저장 실패 흉내&quot;를 켜고 누르면 0.4초 뒤 되돌아가고 알림이 뜹니다.</p>
            <OptimisticDemo />
          </div>
        </div>
      </Section>

      <Section title="출결 키패드" note="학원 입구 태블릿용 실제 크기. 누름 반응과 완료 표시만 움직입니다. [확인]을 눌러 보세요.">
        <KeypadDemo />
      </Section>

      <Section title="사용자별 톤" note="같은 부품, 다른 밀도.">
        <ul className="divide-y divide-line-soft">
          {TONES.map((t) => (
            <li key={t.who} className="grid gap-1 py-3 sm:grid-cols-[120px_120px_1fr]">
              <b className="text-heading">{t.who}</b>
              <span className="text-body">{t.tone}</span>
              <span className="text-body text-sub">{t.rule}</span>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line-soft py-10">
      <h2 className="text-title font-bold">{title}</h2>
      {note && <p className="mt-1 mb-6 text-body text-sub">{note}</p>}
      {children}
    </section>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-caption font-semibold text-sub">{children}</h3>;
}
