export type CaptionKind = "figure" | "table";

export const REPORT_CAPTION_IDS = {
  figures: [
    "class-balance",
    "churn-dimension",
    "unknown-rewrites-chart",
    "outlier-counts-chart",
    "model-comparison-chart",
    "elbow-wcss",
    "silhouette",
    "roc-curves",
    "pr-curves",
    "best-confusion",
    "other-confusions",
  ],
  tables: [
    "tier-balance",
    "engineered-features",
    "centroids",
    "churn-rules",
    "retention-rules",
    "anomalies",
    "appendix-models",
    "appendix-parameters",
  ],
} as const;

export type CaptionRegistryValue = {
  figures: readonly string[];
  tables: readonly string[];
};

export function getCaptionNumber(
  kind: CaptionKind,
  id: string,
  registry: CaptionRegistryValue = REPORT_CAPTION_IDS,
): number | null {
  const ids = kind === "figure" ? registry.figures : registry.tables;
  const index = ids.indexOf(id);
  return index === -1 ? null : index + 1;
}
