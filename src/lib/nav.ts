// 역할별 상단 메뉴 (에듀OK처럼 큰 메뉴 + 하위 메뉴 2단 구조)
// 메뉴 이름·순서를 바꿀 때는 이 파일만 고치면 된다.

export type NavLeaf = { label: string; href: string };
export type NavItem = { label: string; href: string; children?: NavLeaf[] };

export const ADMIN_NAV: NavItem[] = [
  { label: "홈", href: "/admin" },
  {
    label: "출결",
    href: "/admin/attendance",
    children: [
      { label: "오늘 출결", href: "/admin/attendance" },
      { label: "출결 내역", href: "/admin/attendance/history" },
      { label: "결석 신청", href: "/admin/attendance/absences" },
    ],
  },
  {
    label: "숙제",
    href: "/admin/homework",
    children: [
      { label: "숙제 관리", href: "/admin/homework" },
      { label: "숙제 등록", href: "/admin/homework/new" },
    ],
  },
  {
    label: "학생관리",
    href: "/admin/students",
    children: [
      { label: "재원생", href: "/admin/students" },
      { label: "휴·퇴원생", href: "/admin/students/inactive" },
      { label: "보호자", href: "/admin/guardians" },
    ],
  },
  {
    label: "반·선생님",
    href: "/admin/classes",
    children: [
      { label: "반 관리", href: "/admin/classes" },
      { label: "선생님 관리", href: "/admin/teachers" },
      { label: "선생님 출퇴근", href: "/admin/work-logs" },
    ],
  },
  { label: "보강", href: "/admin/makeups" },
  { label: "메시지", href: "/admin/messages" },
];

export const TEACHER_NAV: NavItem[] = [
  { label: "홈", href: "/teacher" },
  {
    label: "숙제",
    href: "/teacher/homework",
    children: [
      { label: "숙제 관리", href: "/teacher/homework" },
      { label: "숙제 등록", href: "/teacher/homework/new" },
    ],
  },
  { label: "담당 학생", href: "/teacher/students" },
  { label: "보강", href: "/teacher/makeups" },
  { label: "메시지", href: "/teacher/messages" },
  { label: "출퇴근", href: "/teacher/work" },
];

/** 현재 주소가 메뉴에 해당하는지 (홈은 정확히 같을 때만) */
export function isActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 현재 주소에 해당하는 큰 메뉴 */
export function activeItem(nav: NavItem[], pathname: string): NavItem | undefined {
  // 홈(/admin, /teacher)이 모든 주소의 앞부분이라, 긴 주소부터 비교
  const sorted = [...nav].sort((a, b) => b.href.length - a.href.length);
  return (
    sorted.find((item) => item.children?.some((c) => isActive(pathname, c.href))) ??
    sorted.find((item) => isActive(pathname, item.href, item === nav[0]))
  );
}
