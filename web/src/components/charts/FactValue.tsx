"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useFacts } from "@/hooks/useFacts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountUp } from "@/hooks/useCountUp";
import { getFact, type FactSources } from "@/lib/facts";
import { formatCount, formatDecimal, formatMultiplier, formatPct1 } from "@/lib/format";

const FactsContext = createContext({ getFact: (id: string) => getFact(id) });

export function FactsProvider({
  sources,
  children,
}: {
  sources: FactSources;
  children: ReactNode;
}) {
  const facts = useFacts(sources);
  return <FactsContext.Provider value={facts}>{children}</FactsContext.Provider>;
}

export function FactValue({
  id,
  format,
  animate = false,
}: {
  id: string;
  format?: "multiplier" | ((value: number) => string);
  animate?: boolean;
}) {
  const fact = useContext(FactsContext).getFact(id);
  const value = format === "multiplier" ? fact.multiplier : fact.value;
  if (value === null) return <>n/a</>;
  const formatter =
    typeof format === "function"
      ? format
      : format === "multiplier"
        ? formatMultiplier
        : fact.unit === "count"
          ? formatCount
          : fact.unit === "points"
            ? (number: number) => `${formatDecimal(number, 1)} pts`
            : fact.unit === "score"
              ? (number: number) => formatDecimal(number, 4)
              : formatPct1;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${fact.label}: ${formatter(value)}`}>
            {animate ? <AnimatedFactValue value={value} format={formatter} /> : formatter(value)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[min(20rem,calc(100vw-2rem))] break-words">
          <p className="font-medium">{fact.label}</p>
          <p>n = {formatCount(fact.n)}</p>
          <p>Baseline: {formatPct1(fact.baseline)}</p>
          <p>95% interval: {fact.ci95 ? `${formatPct1(fact.ci95.low)} - ${formatPct1(fact.ci95.high)}` : "n/a"}</p>
          {fact.definition ? <p className="mt-1">{fact.definition}</p> : null}
          {fact.source ? <p className="mt-1 break-all text-xs text-muted-foreground">{fact.source}</p> : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AnimatedFactValue({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  return <>{format(useCountUp(value))}</>;
}
