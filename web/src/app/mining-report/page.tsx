"use client";

import { AlertCircle } from "lucide-react";
import { Download, ExternalLink, Printer } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { MiningReportDocument } from "@/components/report/MiningReportDocument";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEdaDefaultBy } from "@/hooks/useEda";
import { useInsightVisuals } from "@/hooks/useInsights";
import { useMiningReport } from "@/hooks/useMiningReport";
import { useRules } from "@/hooks/useRules";

export default function MiningReportPage() {
  const defaultDimension = "PAY_1";
  const { data: report, isLoading, error } = useMiningReport();
  const { data: defaultRules } = useRules(1, "default");
  const { data: nonDefaultRules } = useRules(1, "non-default");
  const { data: defaultBy } = useEdaDefaultBy(defaultDimension);
  const { data: insightVisuals } = useInsightVisuals();

  return (
    <div className="report-shell flex min-w-0 flex-col">
      <Header title="Data Mining Report" />
      <div className="min-w-0 flex-1 p-4 xl:p-5">
        <div className="report-action mb-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print report</Button>
          <Button asChild><a href="/report.pdf" download><Download className="mr-2 h-4 w-4" />Download detailed report (PDF)</a></Button>
          <Button asChild variant="link"><Link href="/report/paper"><ExternalLink className="mr-2 h-4 w-4" />Open the detailed report page</Link></Button>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-72" />
            <Skeleton className="h-[520px]" />
          </div>
        ) : error ? (
          <Card className="border-danger/50">
            <CardContent className="flex items-start gap-3 p-5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              {(error as { message?: string }).message ?? "Failed to load mining report"}
            </CardContent>
          </Card>
        ) : report ? (
          <MiningReportDocument
            report={report}
            defaultRules={defaultRules}
            nonDefaultRules={nonDefaultRules}
            defaultBy={defaultBy}
            defaultDimension={defaultDimension}
            insightVisuals={insightVisuals}
          />
        ) : null}
      </div>
    </div>
  );
}
