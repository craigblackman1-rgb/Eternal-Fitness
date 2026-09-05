"use client";

import { useState } from "react";
import Link from "next/link";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HubCard } from "@/components/hub";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IconCheckCircle, IconAlertTriangle } from "@/components/icons";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: "sending" });

    try {
      const res = await fetch("/api/portal/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setStatus({ kind: "error", message: data.error ?? "Something went wrong." });
        return;
      }
      setStatus({ kind: "sent" });
    } catch {
      setStatus({ kind: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <div className="hub-shell relative flex min-h-screen items-center justify-center bg-[var(--hub-canvas)] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose/5 rounded-pill blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal/5 rounded-pill blur-3xl" />
      </div>

      <HubCard className="relative w-full max-w-md shadow-md border-border/60">
        <div className="px-6 pt-8 pb-6 text-center">
          <div className="mx-auto mb-5 flex items-center justify-center">
            <EternalFitnessLogo variant="dark" size="lg" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email and we&rsquo;ll send you a reset link
          </p>
        </div>

        <div className="px-6 pb-8">
          {status.kind === "sent" ? (
            <>
              <Alert className="border-[var(--status-success-border)] bg-[var(--status-success-bg)]">
                <IconCheckCircle className="h-5 w-5 text-[var(--status-success-text)]" aria-hidden="true" />
                <AlertTitle className="text-[var(--status-success-text)]">Check your email</AlertTitle>
                <AlertDescription className="text-foreground">
                  If an account exists for that address, we&rsquo;ve sent a password reset link. The
                  link expires in 15 minutes.
                </AlertDescription>
              </Alert>
              <div className="mt-4">
                <Link href="/portal/login">
                  <Button variant="outline" className="w-full min-h-11 rounded-pill">
                    Back to sign in
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {status.kind === "error" && (
                <Alert variant="destructive">
                  <IconAlertTriangle className="h-5 w-5" aria-hidden="true" />
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full min-h-11 rounded-pill bg-rose hover:bg-rose/90 text-white text-base font-semibold"
                disabled={status.kind === "sending"}
              >
                {status.kind === "sending" ? "Sending..." : "Send reset link"}
              </Button>
              <div className="text-center">
                <Link href="/portal/login" className="text-xs text-rose hover:underline">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </HubCard>
    </div>
  );
}
