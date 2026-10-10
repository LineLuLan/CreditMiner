"use client";

import { AlertCircle, ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { PaperReportDocument } from "@/components/report/paper/PaperReportDocument";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMiningReport } from "@/hooks/useMiningReport";

export default function PaperReportPage() {
  const { data, isLoading, error } = useMiningReport();
  return (
    <div className="report-shell paper-report-shell flex min-w-0 flex-col">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">Detailed report</h1>
            <Link
              href="/mining-report"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden />
              Back to the web report
            </Link>
          </div>
        </div>
        <ThemeToggle />
      </header>
      <main className="min-w-0 flex-1 p-4 xl:p-6">
        <div className="report-action mx-auto mb-4 flex max-w-[190mm] justify-end">
          <Button type="button" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print or save PDF
          </Button>
        </div>
        {isLoading ? (
          <div className="mx-auto max-w-[190mm] space-y-4">
            <Skeleton className="h-96" />
            <Skeleton className="h-[600px]" />
          </div>
        ) : error ? (
          <Card className="mx-auto max-w-[190mm] border-danger/50">
            <CardContent className="flex items-start gap-3 p-5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              {(error as { message?: string })?.message ?? "Failed to load report"}
            </CardContent>
          </Card>
        ) : data ? (
          <PaperReportDocument report={data} />
        ) : null}
      </main>
    </div>
  );
}
