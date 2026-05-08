#!/usr/bin/env bash
# Run the offline TrainPipeline (CSV -> .model + DB seed). Linux/macOS.
set -euo pipefail

if [[ ! -f backend/data/raw/BankChurners.csv ]]; then
  echo "MISSING: backend/data/raw/BankChurners.csv"
  echo "Download from https://www.kaggle.com/datasets/sakshigoyal7/credit-card-customers"
  exit 1
fi

( cd backend && mvn -q exec:java -Dexec.mainClass="com.creditminer.pipeline.TrainPipeline" )
