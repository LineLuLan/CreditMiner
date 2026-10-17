#!/usr/bin/env bash
# Regenerate all CreditMiner data-mining artifacts without network access.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
RAW="$BACKEND/data/raw/default_credit_card_clients.csv"

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "MISSING: $1 is required." >&2
    exit 1
  fi
}

require java
require mvn

if [[ ! -f "$RAW" ]]; then
  echo "MISSING: $RAW" >&2
  echo "Place the UCI dataset CSV at that path before training." >&2
  exit 1
fi

MAIN_CLASSES=(
  com.creditminer.pipeline.Phase1Report
  com.creditminer.pipeline.Phase2Report
  com.creditminer.pipeline.Phase3Report
  com.creditminer.pipeline.Phase5Pipeline
  com.creditminer.pipeline.Phase6Pipeline
  com.creditminer.pipeline.Phase7Pipeline
  com.creditminer.pipeline.InsightFactsReport
  com.creditminer.pipeline.Phase10Pipeline
)

# k=4 was chosen for interpretability (see docs/PIPELINE.md); the pipeline otherwise picks k by silhouette (k=2).
export CM_CLUSTER_K="${CM_CLUSTER_K:-4}"

cd "$BACKEND"
for main_class in "${MAIN_CLASSES[@]}"; do
  echo "==> Running $main_class"
  mvn -o -q compile exec:java -Dexec.mainClass="$main_class"
done

echo "Artifact regeneration complete."
