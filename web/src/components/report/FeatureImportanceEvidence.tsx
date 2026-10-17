"use client";

import { useFacts } from "@/hooks/useFacts";
import { formatPct } from "@/lib/utils";
import { featureLabel } from "@/lib/constants";
import type { MiningReport } from "@/types/api.types";

export function FeatureImportanceEvidence({ report }: { report: MiningReport }) {
  const { getFact } = useFacts({ report });
  // Intent: keep catalogue permutation ranking and raw AUC units together.
  // Status: catalogue first, report share fallback; next: none; blockers: none.
  // Confidence: raw drops and normalized shares are explicitly separate columns.
  const rows = report.classification.featureImportance.map((feature, index) => {
    const fact = getFact("importance-top" + (index + 1));
    const name = fact.name ?? feature.name;
    const matchingFeature = report.classification.featureImportance.find((item) => item.name === name);
    return {
      name,
      aucDrop: fact.aucDrop ?? matchingFeature?.aucDrop,
      share: fact.value ?? matchingFeature?.share,
    };
  }).slice(0, 10);

  return (
    <section className="min-w-0 max-w-full space-y-3" aria-label="Feature importance">
      <h3 className="report-heading text-lg font-semibold">Feature importance</h3>
      <p className="text-sm leading-6 text-muted-foreground">
        Permutation importance: mean holdout AUC drop over 5 shuffles.
        Normalized share is relative importance; it is not the raw AUC drop.
      </p>
      <figure aria-label="Permutation feature importance ranking" className="space-y-2">
        {rows.map((row) => <div key={row.name} className="grid min-w-0 grid-cols-[190px_minmax(0,1fr)] items-center gap-3 text-[11px]">
          <span className="whitespace-nowrap">{featureLabel(row.name)}</span>
          <div className="h-3 overflow-hidden rounded bg-muted" title={`${featureLabel(row.name)}: ${formatPct(row.share ?? 0)} normalized share`}>
            <div className="h-full bg-chart-neutral" style={{ width: `${Math.max(0, Math.min(1, row.share ?? 0)) * 100}%` }} />
          </div>
        </div>)}
        <figcaption className="text-xs text-muted-foreground">Normalized share of permutation importance. The table gives raw AUC drops when available.</figcaption>
      </figure>
      <div className="max-w-full overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[360px] text-xs">
          <thead><tr className="border-b bg-muted/30">
            <th className="p-3 text-left">Feature</th>
            <th className="p-3 text-right">AUC drop</th>
            <th className="p-3 text-right">Normalized share</th>
          </tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b last:border-0">
                <td className="break-words p-3 font-medium">{featureLabel(row.name)}</td>
                <td className="p-3 text-right tabular-nums">{row.aucDrop == null ? "n/a" : row.aucDrop.toFixed(4)}</td>
                <td className="p-3 text-right tabular-nums">{row.share == null ? "n/a" : formatPct(row.share)}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={3} className="p-3">Feature importance is unavailable.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
