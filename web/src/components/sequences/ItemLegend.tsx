import { SEQUENCE_ITEMS } from "@/lib/sequence-format";
import type { SequenceArtifact } from "@/types/api.types";

export function ItemLegend({ mapping }: { mapping: SequenceArtifact["itemMapping"] }) {
  return (
    <details className="min-w-0 rounded-lg border bg-card">
      <summary className="cursor-pointer rounded-lg px-5 py-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        How items are coded
      </summary>
      <div className="space-y-4 border-t p-5 text-sm">
        <p className="break-words leading-6 text-muted-foreground">
          Items joined by &quot;+&quot; occur in the same month. &quot;Then&quot; marks a later observed month, which
          may have a gap. &quot;x3&quot; means three repeated steps in the pattern.
        </p>
        <p className="break-words leading-6 text-muted-foreground">Month order: from the April 2005 statement to the September 2005 statement.</p>
        {mapping.oldestMonthReference ? (
          <p className="break-words leading-6 text-muted-foreground">April has no payment item because March&apos;s bill is unobserved.</p>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ["Status", mapping.status],
              ["Payment", mapping.payment],
            ] as const
          ).map(([name, items]) => (
            <section key={name} className="min-w-0">
              <h3 className="mb-3 font-semibold">{name}</h3>
              <dl className="space-y-3">
                {Object.entries(items).map(([token, definition]) => (
                  <div key={token} className="break-words">
                    <dt className="font-medium">
                      <span className="font-mono">{token}</span>{" - "}
                      {token === "NO_BALANCE" ? "Nothing due" : token === "COVERED" ? "Payment covers the bill" : Object.prototype.hasOwnProperty.call(SEQUENCE_ITEMS, token)
                        ? SEQUENCE_ITEMS[token]
                        : token}
                    </dt>
                    <dd className="mt-1 text-xs leading-5 text-muted-foreground">{definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </details>
  );
}
