import Link from "next/link";
import {
  getCurrentUser,
  getDashboardPathForRole,
  toDisplayRole,
} from "@/lib/auth";
import { signOut } from "@/app/actions/auth";

export async function TopNav() {
  const user = await getCurrentUser();
  const dashboardPath = user ? getDashboardPathForRole(user.role) : "/";

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-slate-900">
          IIT Ropar Forms
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100"
          >
            Home
          </Link>
          {user?.role === "SYSTEM_ADMIN" && (
            <Link
              href="/admin"
              className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100"
            >
              Admin
            </Link>
          )}
          {user && dashboardPath !== "/" && (
            <Link
              href={dashboardPath}
              className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-100"
            >
              Dashboard
            </Link>
          )}
          {user && (
            <>
              <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-block">
                {toDisplayRole(user.role)}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                >
                  Sign out
                </button>
              </form>
            </>
          )}
          {!user && (
            <Link
              href="/sign-in"
              className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
