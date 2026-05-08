import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  hint?: string;
  trend?: "up" | "down" | "flat";
  className?: string;
}

export function KPICard({ label, value, hint, trend, className }: KPICardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
