import Link from "next/link";
import { User } from "lucide-react";

export function CitizenHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-navy-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-button-gradient shadow-glow">
            <Emblem />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white/90">Mysuru Gov</div>
            <div className="text-[11px] uppercase tracking-wider text-white/50">
              Complaint Portal
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          <Link href="/complaints/new" className="btn-ghost focus-ring">
            Register Complaint
          </Link>
          <Link href="/complaints" className="btn-ghost focus-ring">
            All Complaints
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link
              href="/profile"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              aria-label="Profile"
            >
              <User className="h-4 w-4" />
            </Link>
          ) : (
            <Link href="/auth/login" className="btn-ghost focus-ring">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Emblem() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3 4 7v6c0 4.5 3.5 7.5 8 8 4.5-.5 8-3.5 8-8V7l-8-4Z" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
