import type * as React from "react";

export const CHART_AXIS_TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 13,
  fontWeight: 500,
} as const;

export const CHART_LEGEND_STYLE: React.CSSProperties = {
  color: "hsl(var(--foreground))",
  fontSize: 13,
  fontWeight: 500,
  paddingTop: 12,
};

export const CHART_TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: "hsl(var(--foreground))",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 4,
};

export const CHART_TOOLTIP_ITEM_STYLE: React.CSSProperties = {
  color: "hsl(var(--foreground))",
  fontSize: 13,
  fontWeight: 500,
};

export function chartTooltipContentStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    boxShadow: "0 12px 32px hsl(var(--background) / 0.35)",
    color: "hsl(var(--popover-foreground))",
    fontSize: 13,
    lineHeight: 1.4,
    padding: "10px 12px",
    ...extra,
  };
}

export const CHART_TOOLTIP_PROPS = {
  contentStyle: chartTooltipContentStyle(),
  itemStyle: CHART_TOOLTIP_ITEM_STYLE,
  labelStyle: CHART_TOOLTIP_LABEL_STYLE,
} as const;
