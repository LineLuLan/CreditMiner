"use client";

import { useState } from "react";
import { formatCount, formatPct } from "@/lib/format";
import { humanisePattern } from "@/lib/sequence-format";
import type { SequencePattern } from "@/types/api.types";

const PAGE_SIZE = 25;

/**
 * Intent: retain exact mined patterns without rendering the entire artifact at once.
 * Status: 25 rows per page with local table scrolling; next: preserve API order.
 * Blockers: none. Confidence: sample-backed rendering and narrow-layout guards.
 */
export function AllPatterns({ patterns }: { patterns: SequencePattern[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(patterns.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = patterns.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const showFamily = patterns.some((pattern) => pattern.familyStory);

  return (
    <details className="min-w-0 max-w-full rounded-lg border bg-card">
      <summary className="cursor-pointer p-4 text-sm font-semibold">All patterns</summary>
      <div className="space-y-3 border-t p-4">
        <p className="text-xs text-muted-foreground">
          {formatCount(patterns.length)} exact patterns. Support is the share of each group.
        </p>
        <div className="max-w-full overflow-x-auto" role="region" aria-label="All sequence patterns" tabIndex={0}>
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th scope="col" className="p-3 text-left">Pattern</th>
                {showFamily ? <th scope="col" className="p-3 text-left">Family</th> : null}
                <th scope="col" className="p-3 text-right">Default support</th>
                <th scope="col" className="p-3 text-right">Non-default support</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pattern) => (
                <tr key={pattern.pattern} className="border-b last:border-0">
                  <td className="max-w-md break-words p-3">{humanisePattern(pattern).text}</td>
                  {showFamily ? <td className="max-w-xs break-words p-3">{pattern.familyStory || "-"}</td> : null}
                  <td className="p-3 text-right tabular-nums">{formatPct(pattern.supportDefault)}</td>
                  <td className="p-3 text-right tabular-nums">{formatPct(pattern.supportNonDefault)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!patterns.length ? <p className="text-sm text-muted-foreground">No patterns are available.</p> : null}
        {pageCount > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <button type="button" className="rounded border px-3 py-2 disabled:opacity-50" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              Previous
            </button>
            <span aria-live="polite">Page {formatCount(currentPage + 1)} of {formatCount(pageCount)}</span>
            <button type="button" className="rounded border px-3 py-2 disabled:opacity-50" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              Next
            </button>
          </div>
        ) : null}
      </div>
    </details>
  );
}
