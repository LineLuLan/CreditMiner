import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-danger bg-danger text-danger-foreground hover:bg-danger/90",
        danger: "border-danger bg-danger text-danger-foreground hover:bg-danger/90",
        success:
          "border-success bg-success text-success-foreground hover:bg-success/80",
        warning:
          "border-warning bg-warning text-warning-foreground hover:bg-warning/80",
        info: "border-info bg-info text-info-foreground hover:bg-info/80",
        "success-soft": "border-success bg-success/15 text-success",
        "warning-soft": "border-warning bg-warning/15 text-warning",
        "info-soft": "border-info bg-info/15 text-info",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
