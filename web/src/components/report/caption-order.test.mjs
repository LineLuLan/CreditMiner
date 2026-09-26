import assert from "node:assert/strict";
import test from "node:test";
import { getCaptionNumber, REPORT_CAPTION_IDS } from "./caption-order.ts";

test("report captions follow document order without gaps", () => {
  assert.deepEqual(REPORT_CAPTION_IDS.figures, [
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
  ]);
  assert.deepEqual(REPORT_CAPTION_IDS.tables, [
    "tier-balance",
    "engineered-features",
    "centroids",
    "churn-rules",
    "retention-rules",
    "anomalies",
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
  assert.equal(getCaptionNumber("figure", "model-comparison-chart"), 5);
  assert.equal(getCaptionNumber("figure", "elbow-wcss"), 6);
  assert.equal(getCaptionNumber("figure", "roc-curves"), 8);
  assert.equal(getCaptionNumber("table", "appendix-models"), 7);
  assert.equal(getCaptionNumber("table", "appendix-parameters"), 8);
  assert.equal(getCaptionNumber("figure", "missing"), null);
  assert.equal(getCaptionNumber("table", "unknown-rewrites"), null);
});
