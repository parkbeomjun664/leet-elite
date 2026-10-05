import { logout } from "@/app/login/actions";
import { cn } from "@/lib/cn";

/** 로그아웃 (AUTH-07). 서버 함수로 보내는 작은 폼이라 화면 어디에 둬도 된다 */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button type="submit" className={cn("min-h-11 text-sub hover:text-ink", className)}>
        로그아웃
      </button>
    </form>
  );
}
