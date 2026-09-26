"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MiningReportDocument } from "@/components/report/MiningReportDocument";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEdaChurnBy } from "@/hooks/useEda";
import { useInsightVisuals } from "@/hooks/useInsights";
import { useMiningReport } from "@/hooks/useMiningReport";
import { useRules } from "@/hooks/useRules";

export default function MiningReportPage() {
  const [churnDimension, setChurnDimension] = useState("Months_Inactive_12_mon");
  const { data: report, isLoading, error } = useMiningReport();
  const { data: churnRules } = useRules(1, "churn");
  const { data: retentionRules } = useRules(1, "retention");
  const { data: churnBy, error: churnByError } = useEdaChurnBy(churnDimension);
  const { data: insightVisuals } = useInsightVisuals();

  useEffect(() => {
    if (churnByError && churnDimension === "Months_Inactive_12_mon") {
      setChurnDimension("Card_Category");
    }
  }, [churnByError, churnDimension]);

  return (
    <div className="report-shell flex min-w-0 flex-col">
      <Header title="Data Mining Report" />
      <div className="min-w-0 flex-1 p-4 xl:p-5">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-72" />
            <Skeleton className="h-[520px]" />
          </div>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="flex items-start gap-3 p-5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              {(error as { message?: string }).message ?? "Failed to load mining report"}
            </CardContent>
          </Card>
        ) : report ? (
          <MiningReportDocument
            report={report}
            churnRules={churnRules}
            retentionRules={retentionRules}
            churnBy={churnBy}
            churnDimension={churnDimension}
            insightVisuals={insightVisuals}
          />
        ) : null}
      </div>
    </div>
  );
}
