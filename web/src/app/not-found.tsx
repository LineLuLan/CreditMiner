import Link from "next/link";
import { SearchX, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span
            className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground"
            aria-hidden
          >
            <SearchX className="h-7 w-7" />
          </span>
          <div className="space-y-1">
            <h2 className="h3">Page not found</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has moved.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" aria-hidden />
              Back to overview
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
