"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import EternalFitnessLogo from "@/components/EternalFitnessLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HubCard } from "@/components/hub";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IconAlertTriangle } from "@/components/icons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message ?? "Login failed");
      setLoading(false);
      return;
    }

    router.push("/hub");
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Trainer Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage clients and training blocks</p>
        </div>

        <div className="px-6 pb-8">
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/hub/forgot-password" className="text-xs text-rose hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full min-h-11 rounded-pill bg-rose hover:bg-rose/90 text-white text-base font-semibold"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </HubCard>
    </div>
  );
}
