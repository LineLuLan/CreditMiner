export type CaptionKind = "figure" | "table";

export const REPORT_CAPTION_IDS = {
  figures: [
    "class-balance",
    "default-dimension",
    "unknown-rewrites-chart",
    "outlier-counts-chart",
    "algorithm-decisiontree-confusion",
    "algorithm-randomforest-confusion",
    "algorithm-naivebayes-confusion",
    "algorithm-logistic-confusion",
    "model-comparison-chart",
    "elbow-wcss",
    "silhouette",
    "sequence-support",
    "quality-runtime",
    "roc-curves",
    "pr-curves",
    "best-confusion",
    "other-confusions",
  ],
  tables: [
    "tier-balance",
    "unknown-rewrites",
    "negative-bill-counts",
    "outlier-counts",
    "engineered-features",
    "algorithm-decisiontree-variants",
    "algorithm-randomforest-variants",
    "algorithm-naivebayes-variants",
    "algorithm-logistic-variants",
    "centroids",
    "default-rules",
    "non-default-rules",
    "anomalies",
    "sequence-item-mapping",
    "sequence-non-default",
    "sequence-feature-experiment",
    "variant-runtime",
    "appendix-models",
    "appendix-parameters",
  ],
} as const;

export const PAPER_CAPTION_IDS = {
  figures: [
    "paper-sequence-support",
    "paper-quality-runtime",
    "paper-roc-curves",
    "paper-pr-curves",
    "paper-best-confusion",
    "paper-other-confusions",
  ],
  tables: [
    "paper-team",
    "paper-dataset",
    "paper-preprocessing",
    "paper-algorithms",
    "paper-sequence-mapping",
    "paper-sequence-non-default",
    "paper-sequence-experiment",
    "paper-model-comparison",
    "paper-variant-runtime",
    "paper-parameters",
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
