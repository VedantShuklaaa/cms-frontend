"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { toApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";

const highlights = [
  "Role-aware dashboards for admins, faculty and students",
  "Attendance, exams and results in one place",
  "Fees, notices and reports without the paperwork",
];

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) {
      router.replace("/dashboard");
    }
  }, [ready, user, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const signedIn = await login(email.trim(), password);
      toast(
        `Welcome back, ${ROLE_LABELS[signedIn.role].toLowerCase()}`,
        "success",
      );
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50">
        <BrandMark asLink={false} />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <aside className="relative hidden w-[46%] max-w-[660px] flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-indigo-600/35 blur-[110px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-20 h-[420px] w-[420px] rounded-full bg-violet-600/25 blur-[120px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/15 backdrop-blur">
            <Icon name="graduation" size={21} />
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight tracking-tight">
              Campus
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-indigo-200/70">
              College management
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-indigo-200/90 backdrop-blur">
            <Icon name="sparkles" size={12} />
            One workspace for the whole campus
          </span>
          <h2 className="mt-5 text-[34px] font-semibold leading-[1.15] tracking-tight xl:text-[40px]">
            The calm centre of your college operations.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300/90">
            Departments, people, teaching and administration — organised in a
            single, secure console that adapts to your role.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                  <Icon name="check" size={11} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-[11px] text-slate-400">
          <Icon name="shield" size={13} />
          Authorised access only · Sessions are encrypted
        </div>
      </aside>

      {/* Sign-in panel */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center p-5 lg:hidden">
          <BrandMark asLink={false} />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-12">
          <div className="w-full max-w-[390px]">
            <div className="mb-8">
              <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Sign in to continue to your workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error ? <Alert tone="error">{error}</Alert> : null}

              <Field label="Email address" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@college.edu"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoFocus
                  required
                />
              </Field>

              <Field label="Password" htmlFor="password" required>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                  </button>
                </div>
              </Field>

              <Button
                type="submit"
                size="lg"
                loading={submitting}
                className="mt-2 w-full"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-xs leading-relaxed text-slate-500">
                There is no self-registration. Accounts are created by your
                institution&apos;s administrator.
              </p>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 px-5 py-5 text-[11px] text-slate-400 sm:px-8">
          <span>© {new Date().getFullYear()} Campus</span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Icon name="lock" size={12} />
            Secure sign-in
          </span>
        </footer>
      </main>
    </div>
  );
}
