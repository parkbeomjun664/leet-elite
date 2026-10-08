import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "개인정보 처리방침" };

// 개인정보 처리방침 (NF-10, 10/8 여유 작업 A4). 로그인 없이 열린다 (src/lib/auth/roles.ts PUBLIC)
// 초안: [확인] 표시는 원장님께 여쭤 정한다 (퇴원생 보관 기간, 책임자, 시행일). 오픈(12/21) 전에 초안 안내를 지운다
// 항목은 이 앱이 실제로 모으는 것만 적는다 (docs/data-model.md). 교육비·결제 정보는 다루지 않는다(에듀OK)

const DRAFT = true;

function Confirm({ children }: { children: ReactNode }) {
  return <span className="rounded-[2px] bg-warn-tint px-1 text-warn">[확인] {children}</span>;
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line-soft pt-6">
      <h2 className="text-heading font-bold">
        {n}. {title}
      </h2>
      <div className="mt-3 space-y-2 text-body leading-relaxed text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-card px-4 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
      <article className="mx-auto max-w-[720px] space-y-6">
        <header>
          <Link href="/login" className="inline-flex min-h-11 items-center text-caption text-sub hover:text-ink">
            ‹ 로그인으로
          </Link>
          <h1 className="mt-2 text-title font-bold">개인정보 처리방침</h1>
          <p className="mt-2 text-body text-sub">
            LEET영어학원(이하 &ldquo;학원&rdquo;)은 학원 관리 앱 &ldquo;리트 엘리트&rdquo;를 운영하면서 학생·학부모·선생님의 개인정보를 아래와 같이
            처리합니다.
          </p>
          {DRAFT && (
            <p role="note" className="mt-4 rounded-[var(--radius-control)] bg-warn-tint px-4 py-3 text-caption text-warn">
              초안입니다. [확인] 표시는 학원과 정한 뒤 바뀝니다.
            </p>
          )}
        </header>

        <Section n={1} title="처리 목적">
          <ul>
            <li>학원이 발급한 계정으로 로그인하고 본인을 확인하기 위해</li>
            <li>출결(등원·하원) 기록과 학부모 알림을 위해</li>
            <li>숙제 등록·제출·피드백, 보강 일정 안내를 위해</li>
            <li>학생·학부모와 학원 사이의 메시지를 주고받기 위해</li>
            <li>선생님 출근·퇴근 기록을 위해</li>
          </ul>
        </Section>

        <Section n={2} title="처리하는 항목">
          <ul>
            <li>학생: 이름, 휴대폰 번호(있는 경우), 학교, 학년, 입학일, 재원 상태, 출결 번호, 수업 시간표, 소속 반</li>
            <li>보호자: 이름, 학생과의 관계, 전화번호</li>
            <li>선생님: 이름, 학생·학부모에게 보이는 이름, 전화번호, 담당 반, 출근·퇴근 시각</li>
            <li>앱을 쓰면서 생기는 정보: 출결 시각, 숙제 사진·코멘트, 메시지, 알림 설정</li>
            <li>보안을 위해 자동으로 남는 정보: 로그인 시도 기록(시각, 접속 IP), 알림을 받기 위한 기기 정보</li>
          </ul>
          <p className="text-sub">교육비·결제 정보는 이 앱에서 다루지 않습니다.</p>
        </Section>

        <Section n={3} title="보관 기간과 파기">
          <ul>
            <li>재원 중에는 계속 보관합니다.</li>
            <li>
              퇴원하면 계정을 사용 중지하고, 퇴원일로부터 <Confirm>보관 기간</Confirm>이 지나면 지체 없이 파기합니다.
            </li>
            <li>로그인 시도 기록은 <Confirm>보관 기간</Confirm> 뒤 지웁니다.</li>
            <li>전자 파일은 복구할 수 없는 방법으로 지웁니다.</li>
          </ul>
        </Section>

        <Section n={4} title="제3자 제공">
          <p>학원은 개인정보를 다른 곳에 제공하지 않습니다. 법령에 따른 요청이 있는 경우만 예외입니다.</p>
        </Section>

        <Section n={5} title="처리 위탁">
          <p>앱을 운영하기 위해 아래 업체의 서비스를 씁니다.</p>
          <ul>
            <li>Supabase Inc.: 데이터 저장(서버 위치: 대한민국 서울)</li>
            <li>
              Vercel Inc.: 앱 화면 전달 <Confirm>국외 이전 여부·위치</Confirm>
            </li>
          </ul>
        </Section>

        <Section n={6} title="이용자의 권리">
          <p>
            학생·학부모·선생님은 자신의(학부모는 자녀의) 개인정보를 보거나 고치거나 지워 달라고, 처리를 멈춰 달라고 학원에 요청할 수 있습니다. 학원은
            요청을 받으면 지체 없이 처리합니다. 만 14세 미만 학생의 개인정보는 보호자의 동의를 받아 처리합니다.
          </p>
        </Section>

        <Section n={7} title="안전하게 지키는 방법">
          <ul>
            <li>비밀번호는 알아볼 수 없게 바꿔 저장합니다.</li>
            <li>역할에 따라 볼 수 있는 정보를 서버에서 나눕니다. 선생님은 담당 반 학생만, 학부모는 자녀만 봅니다.</li>
            <li>숙제 사진은 공개되지 않는 저장소에 두고, 볼 권한이 있는 사람에게만 잠깐 쓸 수 있는 주소로 보여 줍니다.</li>
            <li>로그인을 여러 번 틀리면 잠시 막습니다.</li>
          </ul>
        </Section>

        <Section n={8} title="개인정보 보호책임자">
          <p>
            책임자: <Confirm>이름·직책</Confirm>
            <br />
            문의: 학원 카카오톡 채널 또는 <Confirm>전화번호</Confirm>
          </p>
        </Section>

        <Section n={9} title="시행일">
          <p>
            이 방침은 <Confirm>시행일</Confirm>부터 적용합니다. 바뀌면 앱에서 알려 드립니다.
          </p>
        </Section>
      </article>
    </main>
  );
}
