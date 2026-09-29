// 아직 만들지 않은 메뉴를 눌렀을 때 보여 주는 화면
export function ComingSoon({ title, stage }: { title: string; stage?: string }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-dashed border-line bg-card px-6 py-16 text-center">
      <p className="text-[13px] font-bold tracking-[0.1em] text-brand">준비 중</p>
      <h1 className="mt-2 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-sub">{stage ? `${stage}에 만들 화면입니다.` : "곧 만들 화면입니다."}</p>
    </section>
  );
}
