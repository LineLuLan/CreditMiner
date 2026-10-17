import assert from "node:assert/strict";
import test from "node:test";
import { modelLabel, variantLabel } from "./model-labels.ts";

test("model labels preserve the selected variant using readable names", () => {
  assert.equal(modelLabel("RandomForest", "smote"), "Random forest + SMOTE");
  assert.equal(modelLabel("DECISIONTREE", "cost"), "J48 + cost-sensitive");
  assert.equal(modelLabel("NaiveBayes", "baseline"), "Naive Bayes (baseline)");
  assert.equal(modelLabel("LOGISTIC"), "Logistic regression");
  assert.equal(modelLabel("FutureModel", "new"), "FutureModel + new");
  assert.equal(modelLabel(undefined), "Model");
  assert.equal(variantLabel("cost"), "cost-sensitive");
});
