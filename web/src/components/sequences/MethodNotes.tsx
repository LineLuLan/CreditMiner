import Link from "next/link";
import { formatCvF1Change, formatPct } from "@/lib/format";
import { matchedCvComparison } from "@/lib/sequence-format";
import type { SequenceArtifact } from "@/types/api.types";

export function MethodNotes({ artifact }: { artifact: SequenceArtifact }) {
  const comparison = matchedCvComparison(artifact.featureExperiment.results);
  return (
    <div className="space-y-2 text-xs leading-5 text-muted-foreground">
      <p>
        GSP compares ordered repayment patterns, using{" "}
        {formatPct(artifact.groups.default.minSupportUsed)} minimum support for default and{" "}
        {formatPct(artifact.groups.nonDefault.minSupportUsed)} for non-default sequences. Support
        measures prevalence within each group, not the probability of default.
      </p>
      <p>
        {comparison
          ? formatCvF1Change(comparison.delta, comparison.algo)
          : "The pattern features have no complete same-algorithm CV F1 comparison."}
        {" "}The full experiment is in the{" "}
        <Link
          href="/mining-report#section-5-4"
          className="font-medium text-primary underline underline-offset-4"
        >
          report
        </Link>
        .
      </p>
    </div>
  );
}
