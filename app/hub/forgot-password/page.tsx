"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth-client";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HubCard } from "@/components/hub";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IconAlertTriangle, IconCheckCircle } from "@/components/icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await requestPasswordReset({
      email,
      redirectTo: "/hub/reset-password",
    });

    setLoading(false);
    if (error) {
      setError(error.message ?? "Something went wrong");
      return;
    }
    setSent(true);
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset your password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sent ? "Check your email for a reset link." : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        <div className="px-6 pb-8">
          {sent ? (
            <div className="flex flex-col gap-4">
              <Alert className="border-[var(--status-success-border)] bg-[var(--status-success-bg)]">
                <IconCheckCircle className="h-5 w-5 text-[var(--status-success-text)]" aria-hidden="true" />
                <AlertTitle className="text-[var(--status-success-text)]">Check your email</AlertTitle>
                <AlertDescription className="text-foreground">
                  If an account exists for {email}, a reset link is on its way. The link expires in 1 hour.
                </AlertDescription>
              </Alert>
              <Link href="/hub/login" className="text-sm text-rose text-center hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <Alert variant="destructive">
                  <IconAlertTriangle className="h-5 w-5" aria-hidden="true" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="esther@eternal-fitness.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full min-h-11 rounded-pill bg-rose hover:bg-rose/90 text-white text-base font-semibold"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
              <div className="text-center">
                <Link href="/hub/login" className="text-sm text-muted-foreground hover:underline">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </HubCard>
    </div>
  );
}
