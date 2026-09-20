import { CitizenHeader } from "@/components/layout/header";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <CitizenHeader signedIn={false} />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="glass-card p-6">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-white/60">
            Sign in to submit and track complaints.
          </p>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
