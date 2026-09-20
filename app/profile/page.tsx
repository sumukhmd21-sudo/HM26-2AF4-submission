import Link from "next/link";
import { redirect } from "next/navigation";
import { CitizenHeader } from "@/components/layout/header";
import { SignOutButton } from "@/components/signout-button";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/profile");
  return (
    <>
      <CitizenHeader signedIn />
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="glass-card space-y-3 p-6">
          <div className="text-xs uppercase tracking-wider text-white/40">Profile</div>
          <div>
            <div className="text-sm text-white/60">Name</div>
            <div className="text-base">{user.full_name}</div>
          </div>
          <div>
            <div className="text-sm text-white/60">Email</div>
            <div className="text-base">{user.email}</div>
          </div>
          <div>
            <div className="text-sm text-white/60">Role</div>
            <div className="text-base">{user.role}</div>
          </div>
          <div className="flex gap-2 pt-2">
            <Link href="/complaints" className="btn-ghost">My Complaints</Link>
            <SignOutButton />
          </div>
        </div>
      </main>
    </>
  );
}
