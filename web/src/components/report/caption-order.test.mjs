import assert from "node:assert/strict";
import test from "node:test";
import { getCaptionNumber, PAPER_CAPTION_IDS, REPORT_CAPTION_IDS } from "./caption-order.ts";

test("report captions follow document order without gaps", () => {
  assert.deepEqual(REPORT_CAPTION_IDS.figures, [
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
  ]);
  assert.deepEqual(REPORT_CAPTION_IDS.tables, [
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
  ]);

  for (const [kind, ids] of [
    ["figure", REPORT_CAPTION_IDS.figures],
    ["table", REPORT_CAPTION_IDS.tables],
  ]) {
    assert.deepEqual(
      ids.map((id) => getCaptionNumber(kind, id)),
      ids.map((_, index) => index + 1),
    );
  }

  assert.equal(getCaptionNumber("figure", "unknown-rewrites-chart"), 3);
  assert.equal(getCaptionNumber("figure", "model-comparison-chart"), 9);
  assert.equal(getCaptionNumber("figure", "elbow-wcss"), 10);
  assert.equal(getCaptionNumber("figure", "roc-curves"), 14);
  assert.equal(getCaptionNumber("table", "appendix-models"), 18);
  assert.equal(getCaptionNumber("table", "appendix-parameters"), 19);
  assert.equal(getCaptionNumber("figure", "missing"), null);
  assert.equal(getCaptionNumber("table", "missing-table"), null);
});

test("paper captions follow their print document order", () => {
  assert.deepEqual(PAPER_CAPTION_IDS.figures, [
    "paper-sequence-support",
    "paper-quality-runtime",
    "paper-roc-curves",
    "paper-pr-curves",
    "paper-best-confusion",
    "paper-other-confusions",
  ]);
  assert.deepEqual(PAPER_CAPTION_IDS.tables, [
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
  ]);
  assert.deepEqual(PAPER_CAPTION_IDS.figures.map((id) => getCaptionNumber("figure", id, PAPER_CAPTION_IDS)), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(PAPER_CAPTION_IDS.tables.map((id) => getCaptionNumber("table", id, PAPER_CAPTION_IDS)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
