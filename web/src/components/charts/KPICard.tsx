import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: "up" | "down" | "flat";
  className?: string;
}

const TREND_META = {
  up: { Icon: ArrowUpRight, className: "text-success" },
  down: { Icon: ArrowDownRight, className: "text-destructive" },
  flat: { Icon: ArrowRight, className: "text-muted-foreground" },
} as const;

export function KPICard({ label, value, hint, trend, className }: KPICardProps) {
  const trendMeta = trend ? TREND_META[trend] : null;
  return (
    <Card className={cn("transition-shadow hover:shadow-card-hover", className)}>
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="flex items-center gap-2">
          <div className="num text-2xl font-bold tracking-tight">{value}</div>
          {trendMeta ? (
            <trendMeta.Icon className={cn("h-4 w-4 shrink-0", trendMeta.className)} aria-hidden />
          ) : null}
        </div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
