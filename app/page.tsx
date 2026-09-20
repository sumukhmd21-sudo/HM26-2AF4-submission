import Link from "next/link";
import { CitizenHeader } from "@/components/layout/header";
import { CitizenSidebar } from "@/components/complaint/citizen-sidebar";
import { ComplaintInput } from "@/components/complaint/complaint-input";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export default async function Home() {
  const user = await getCurrentUser();
  const recent = user
    ? await query<{
        complaint_number: string;
        title: string;
        status: string;
        created_at: string;
      }>(
        `SELECT complaint_number, title, status, created_at
         FROM complaints WHERE citizen_id = $1
         ORDER BY created_at DESC LIMIT 8`,
        [user.id]
      )
    : { rows: [] };

  return (
    <>
      <CitizenHeader signedIn={!!user} />
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <CitizenSidebar
          user={user ? { id: user.id, name: user.full_name } : null}
          complaints={recent.rows}
        />
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-blue-500/10 via-transparent to-transparent blur-2xl" />
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              A cleaner, safer, better
              <br />
              <span className="bg-button-gradient bg-clip-text text-transparent">
                Mysuru
              </span>{" "}
              — together
            </h1>
            <p className="mt-4 max-w-xl text-sm text-white/60 sm:text-base">
              Register a new complaint or view the status of your previously submitted complaints.
            </p>
            <div className="mt-10 w-full max-w-2xl">
              <ComplaintInput />
              <p className="mt-3 text-center text-xs text-white/40">
                Tap the microphone to speak, or type a description of the issue.
              </p>
              {!user && (
                <p className="mt-4 text-center text-xs text-white/40">
                  <Link href="/auth/login" className="text-blue-300 hover:underline">
                    Sign in
                  </Link>{" "}
                  to save complaints and track their status.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
