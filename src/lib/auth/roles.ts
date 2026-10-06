// 역할별 출입 규칙 (화면 출입 통제용). 실제 데이터 권한은 DB의 RLS가 따로 막는다 (CLAUDE.md)

export const ROLES = ["admin", "teacher", "student", "parent", "kiosk"] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

/** 로그인하면 처음 가는 화면 */
export const HOME: Record<Role, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
  kiosk: "/kiosk",
};

// 화면 묶음마다 들어갈 수 있는 역할. 원장님은 선생님 화면과 키패드(설치할 때)에도 들어간다
const AREAS: { prefix: string; roles: readonly Role[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/teacher", roles: ["teacher", "admin"] },
  { prefix: "/student", roles: ["student"] },
  { prefix: "/parent", roles: ["parent"] },
  { prefix: "/kiosk", roles: ["kiosk", "admin"] },
];

// 로그인 없이 열리는 화면: 로그인, 디자인 미리보기(가상 이름만)
const PUBLIC = ["/login", "/design-system", "/design"];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/**
 * 이 주소를 열어도 되는지. 안 되면 보낼 곳을 돌려준다
 * - 로그인 안 함 → /login (보던 주소는 next로 남겨 로그인 뒤 돌아온다)
 * - 로그인했는데 /, /login → 역할 첫 화면
 * - 다른 역할의 화면 → 자기 첫 화면
 */
export const PASSWORD_PAGE = "/account/password";

export function routeFor(path: string, role: Role | null, search = "", opts?: { mustChangePassword?: boolean }): { redirect: string } | null {
  if (role === null) {
    if (PUBLIC.some((p) => under(path, p))) return null;
    return { redirect: path === "/" ? "/login" : `/login?next=${encodeURIComponent(path + search)}` };
  }
  // 첫 로그인·재설정 뒤에는 비밀번호를 바꾸기 전까지 다른 화면에 못 간다 (AUTH-03)
  if (opts?.mustChangePassword && !under(path, PASSWORD_PAGE)) return { redirect: PASSWORD_PAGE };
  if (path === "/" || under(path, "/login")) return { redirect: HOME[role] };
  const area = AREAS.find((a) => under(path, a.prefix));
  if (area && !area.roles.includes(role)) return { redirect: HOME[role] };
  return null;
}

/** 로그인 뒤 돌아갈 주소. 다른 사이트 주소나 그 역할이 못 여는 화면이면 첫 화면으로 */
export function safeNext(next: string | null | undefined, role: Role): string {
  // "/"로 시작하고 두 번째 글자가 / 나 \ 가 아니며, 공백·보이지 않는 글자(탭·줄바꿈 등)가 없는 주소만
  // (브라우저는 "/<탭>/evil.com"의 탭을 지우고 "//evil.com"으로 읽을 수 있다)
  if (!next || !/^\/(?![/\\])[^\s\u0000-\u001f\u007f]*$/.test(next)) return HOME[role];
  const path = next.split(/[?#]/)[0];
  return routeFor(path, role) ? HOME[role] : next;
}
