/** Shared report names keep charts, tables and narrative on the same terminology. */
const MODEL_LABELS: Record<string, string> = {
  RANDOMFOREST: "Random forest",
  DECISIONTREE: "J48",
  J48: "J48",
  NAIVEBAYES: "Naive Bayes",
  LOGISTIC: "Logistic regression",
};

const VARIANT_LABELS: Record<string, string> = {
  smote: "SMOTE",
  cost: "cost-sensitive",
  baseline: "baseline",
  canonical: "deployed",
};

export function variantLabel(variant?: string): string {
  return variant ? VARIANT_LABELS[variant.toLowerCase()] ?? variant : "n/a";
}

export function modelLabel(model?: string, variant?: string): string {
  const name = model ? MODEL_LABELS[model.replaceAll(/[^a-z0-9]/gi, "").toUpperCase()] ?? model : "Model";
  if (!variant) return name;
  return variant.toLowerCase() === "baseline"
    ? `${name} (baseline)`
    : `${name} + ${variantLabel(variant)}`;
}
