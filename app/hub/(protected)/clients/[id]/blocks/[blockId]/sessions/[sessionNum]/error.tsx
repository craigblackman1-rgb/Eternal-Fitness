"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Session page error:", error);
  }, [error]);

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <h1 className="text-lg font-semibold text-rose">Something went wrong loading this session</h1>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-[var(--hub-hover)] rounded-lg p-3">
        {error.message}
        {error.digest ? `\n\nDigest: ${error.digest}` : ""}
      </p>
      {error.stack && (
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto bg-[var(--hub-hover)] rounded-lg p-3 max-h-96">
          {error.stack}
        </pre>
      )}
      <Button onClick={() => reset()} className="rounded-lg">Try again</Button>
    </div>
  );
}
