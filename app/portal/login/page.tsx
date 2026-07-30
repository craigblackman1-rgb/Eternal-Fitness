"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IconAlertTriangle } from "@/components/icons";

export default function PortalLoginPage() {
  return (
    <Suspense>
      <PortalLoginForm />
    </Suspense>
  );
}

function PortalLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/portal";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid email or password.");
        setLoading(false);
        return;
      }
      router.push(next);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <a
        href="#portal-login-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-[var(--status-primary)] focus:shadow-md"
      >
        Skip to sign-in form
      </a>

      <div className="flex flex-col justify-center w-full lg:w-1/2 bg-white px-6 py-16 sm:px-12 lg:px-16 xl:px-20">
        <div className="w-full max-w-sm mx-auto">
          <div className="mb-12">
            <EternalFitnessLogo variant="dark" size="lg" />
          </div>

          <main id="portal-login-main">
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-rose mb-4">
              Client area
            </p>
            <h1 className="font-serif text-[clamp(2rem,1.5rem+2vw,2.6rem)] font-bold leading-[1.06] tracking-[-0.03em] text-ink mb-3">
              Sign in to your documents
            </h1>
            <p className="text-[1.06rem] text-[var(--color-body)] mb-10 leading-relaxed">
              Your documents, training plans, and progress — all in one place.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <Alert variant="destructive">
                  <IconAlertTriangle className="h-5 w-5" aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="portal-email">Email address</Label>
                <Input
                  id="portal-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="portal-password">Password</Label>
                  <Link href="/portal/forgot-password" className="text-xs text-rose hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="portal-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full min-h-11 rounded-full bg-rose hover:bg-rose/90 text-white text-base font-semibold"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </main>

          <div className="mt-12 pt-6 border-t border-[var(--color-border-warm)]">
            <p className="text-[0.94rem] text-[var(--color-body)] mb-3">
              <b className="text-[var(--color-ink)]">Prefer not to do this online?</b>
            </p>
            <p className="text-[0.94rem] text-[var(--color-body)] mb-3 leading-relaxed">
              Call the studio on{" "}
              <a href="tel:07517658128" className="font-semibold text-rose hover:underline">
                07517 658 128
              </a>{" "}
              and Esther will go through your documents with you, or post them to you.
            </p>
            <p className="text-[0.94rem]">
              <Link href="/" className="font-semibold text-rose hover:underline">
                Back to Eternal Fitness
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative w-1/2 bg-warm">
        <Image
          src="/images/studio-kneel-stretch.jpg"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute left-6 right-6 bottom-6 bg-white border border-[var(--color-border-warm)] rounded-xl p-5 shadow-[var(--shadow-glass)]">
          <p className="font-serif text-xl leading-[1.35] text-ink mb-2">
            &ldquo;Everything I need is in one place, in a size I can actually read.&rdquo;
          </p>
          <span className="text-sm font-semibold text-[var(--color-body)]">
            Client, Worthing studio
          </span>
        </div>
      </div>
    </div>
  );
}
