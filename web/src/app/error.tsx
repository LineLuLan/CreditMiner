"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-destructive/30 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span
            className="grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive"
            aria-hidden
          >
            <AlertTriangle className="h-7 w-7" />
          </span>
          <div className="space-y-1">
            <h2 className="h3">Something went wrong</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {error.message || "An unexpected error occurred. You can retry the action or reload the page."}
            </p>
            {error.digest ? (
              <p className="text-[11px] font-mono text-muted-foreground/70">
                ref: {error.digest}
              </p>
            ) : null}
          </div>
          <Button onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
