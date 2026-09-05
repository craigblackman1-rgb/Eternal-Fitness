"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HubCard } from "@/components/hub";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IconAlertTriangle } from "@/components/icons";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing reset token. Please request a new link.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not reset your password.");
        setLoading(false);
        return;
      }
      router.push("/portal/login?reset=success");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="hub-shell relative flex min-h-screen items-center justify-center bg-[var(--hub-canvas)] overflow-hidden">
        <HubCard className="relative w-full max-w-md shadow-md border-border/60">
          <div className="px-6 pt-8 pb-6 text-center">
            <div className="mx-auto mb-5 flex items-center justify-center">
              <EternalFitnessLogo variant="dark" size="lg" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Invalid link</h1>
            <p className="text-sm text-muted-foreground mt-2">
              This reset link is missing a token. Please request a new one.
            </p>
            <div className="mt-4">
              <Link href="/portal/forgot-password">
                <Button className="rounded-pill bg-rose hover:bg-rose/90 text-white">
                  Request a new link
                </Button>
              </Link>
            </div>
          </div>
        </HubCard>
      </div>
    );
  }

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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Choose a new password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your new password below
          </p>
        </div>

        <div className="px-6 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <IconAlertTriangle className="h-5 w-5" aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              className="w-full min-h-11 rounded-pill bg-rose hover:bg-rose/90 text-white text-base font-semibold"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </div>
      </HubCard>
    </div>
  );
}
