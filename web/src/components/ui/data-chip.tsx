import * as React from "react";
import { cn } from "@/lib/utils";

interface DataChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string;
  value: React.ReactNode;
  tone?: "default" | "primary" | "destructive";
}

export function DataChip({ label, value, tone = "default", className, ...props }: DataChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs leading-5",
        tone === "default" && "bg-muted/45 text-muted-foreground",
        tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
        tone === "destructive" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
      {...props}
    >
      {label ? <span className="font-medium text-foreground">{label}:</span> : null}
      <span className="min-w-0 break-words">{value}</span>
    </span>
  );
}
