"use client";

import { AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SequenceHero } from "@/components/sequences/SequenceHero";
import { PatternBars } from "@/components/sequences/PatternBars";
import { PatternTable } from "@/components/sequences/PatternTable";
import { AllPatterns } from "@/components/sequences/AllPatterns";
import { ItemLegend } from "@/components/sequences/ItemLegend";
import { MethodNotes } from "@/components/sequences/MethodNotes";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSequences } from "@/hooks/useSequences";
import { formatCount } from "@/lib/format";
import { SequenceArtifactSchema } from "@/lib/schemas";
import { selectAllSequencePatterns, selectSequenceStories } from "@/lib/sequence-format";

export default function SequencesPage() {
  const { data, isLoading, error } = useSequences();
  const parsed = SequenceArtifactSchema.safeParse(data);
  const artifact = parsed.success ? parsed.data : null;
  const stories = artifact ? selectSequenceStories(artifact) : null;
  const counts = artifact
    ? [
        { label: "Default sequences", value: artifact.groups.default.sequences },
        { label: "Default patterns", value: artifact.groups.default.frequentPatterns },
        { label: "Non-default sequences", value: artifact.groups.nonDefault.sequences },
        { label: "Non-default patterns", value: artifact.groups.nonDefault.frequentPatterns },
      ]
    : [];

  return (
    <div className="flex min-w-0 flex-col">
      <Header title="Sequences" />
      <main className="min-w-0 flex-1 space-y-5 p-4 xl:p-5">
        {isLoading ? (
          <>
            <Skeleton className="h-40" />
            <Skeleton className="h-[480px]" />
          </>
        ) : error ? (
          <Card className="border-danger/50">
            <CardContent className="flex items-start gap-3 p-5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {(error as { message?: string })?.message ?? "Failed to load sequences"}
            </CardContent>
          </Card>
        ) : artifact ? (
          <>
            <SequenceHero pattern={stories?.defaultStories[0]} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {counts.map(({ label, value }) => (
                <Card key={label} className="min-w-0">
                  <CardContent className="p-4">
                    <p className="break-words text-xs text-muted-foreground">{label}</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums">{formatCount(value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <PatternBars patterns={stories?.defaultStories ?? []} />
              <PatternTable patterns={stories?.nonDefaultStories ?? []} />
            </div>
            <AllPatterns patterns={selectAllSequencePatterns(artifact)} />
            <ItemLegend mapping={artifact.itemMapping} />
            <MethodNotes artifact={artifact} />
          </>
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              The sequence-mining artifact is unavailable or invalid.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
