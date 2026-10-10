# CreditMiner - Credit Card Default Prediction and Repayment-Pattern Mining

IT160IU Data Mining. Team details match the academic report; placeholders must be confirmed before submission.

| Member | Full name | Student ID | Role |
| --- | --- | --- | --- |
| Leader | Tran Nam Anh | ITDSIU23030 | Team leader |
| Member 2 | [Full name] | [Student ID] | [Role] |
| Member 3 | [Full name] | [Student ID] | [Role] |

## Contents and requirements

The enclosing folder contains `report.pdf` and this `code/` directory:

- `bin/creditminer-cli.jar`: self-contained command-line program; JDK 17+ on PATH, no Maven required.
- `bin/creditminer-web.jar`: optional Spring Boot demo API.
- `source/backend/`: Maven project, application/tests, and the bundled GSP package in `lib/`.
- `source/web/`: Next.js source and lockfile; dependencies and build caches excluded.
- `source/db/`: optional PostgreSQL scripts; the demo uses an in-memory H2 database.
- `source/scripts/`: repository build, training, and PDF helpers.
- `datasets/`: UCI raw CSV, processed ARFFs, sequence ARFFs, and JSON/CSV evidence.
- `models/`: method-named Weka models, cluster support files, `best.json`, and `rules.json`.
- `docs/web-report.pdf`: printable web report; `docs/predictions.csv`: packaging smoke-test output.
- `LICENSE-THIRD-PARTY.md`: dataset attribution and Weka/GSP licensing links.

Optional source rebuild: Maven 3.9+, Node.js 20+, Corepack/pnpm, and dependency downloads or a populated Maven cache. PDF export additionally needs Playwright Chromium and Python with `pypdf`. The one-command packager uses Windows PowerShell 5.1+ and `Compress-Archive`.

## Run the CLI (relative paths)

Open a terminal **inside `code/`**. These commands work in both Windows PowerShell and bash (forward slashes are accepted by Java on Windows). Quotes are required for paths containing spaces. Each command is one line.

```powershell
java -jar bin/creditminer-cli.jar --help
java -jar bin/creditminer-cli.jar preprocess --input datasets/default_credit_card_clients.csv --out regenerated/processed --seed 42 --train-ratio 0.8
java -jar bin/creditminer-cli.jar train --train datasets/train.arff --test datasets/test.arff --out regenerated/models --algo ALL --variant all --folds 10 --seed 42
java -jar bin/creditminer-cli.jar train --train datasets/train.arff --test datasets/test.arff --out regenerated/tree --algo DECISIONTREE --variant baseline --folds 10 --seed 42
java -jar bin/creditminer-cli.jar predict --model models/RANDOMFOREST_COST.model --test datasets/test.arff --out predictions.csv
java -jar bin/creditminer-cli.jar evaluate --model models/DECISIONTREE.model --test datasets/test.arff
java -jar bin/creditminer-cli.jar sequence --input datasets/enriched.arff --train datasets/train.arff --test datasets/test.arff --out regenerated/sequences --min-support 0.10 --top 10
```

Bash uses exactly the same commands:

```bash
java -jar bin/creditminer-cli.jar preprocess --input datasets/default_credit_card_clients.csv --out regenerated/processed --seed 42 --train-ratio 0.8
java -jar bin/creditminer-cli.jar train --train datasets/train.arff --test datasets/test.arff --out regenerated/models --algo ALL --variant all --folds 10 --seed 42
java -jar bin/creditminer-cli.jar train --train datasets/train.arff --test datasets/test.arff --out regenerated/tree --algo DECISIONTREE --variant baseline --folds 10 --seed 42
java -jar bin/creditminer-cli.jar predict --model models/RANDOMFOREST_COST.model --test datasets/test.arff --out predictions.csv
java -jar bin/creditminer-cli.jar evaluate --model models/DECISIONTREE.model --test datasets/test.arff
java -jar bin/creditminer-cli.jar sequence --input datasets/enriched.arff --train datasets/train.arff --test datasets/test.arff --out regenerated/sequences --min-support 0.10 --top 10
```

Algorithms: `ALL`, `DECISIONTREE`, `RANDOMFOREST`, `NAIVEBAYES`, `LOGISTIC`. Variants: `all`, `baseline`, `smote`, `cost`. Cost-sensitive variants apply only to DecisionTree and RandomForest, so `ALL/all` trains ten models. Baseline filenames are `METHOD.model`; other variants append `_SMOTE` or `_COST` before `.model`.

## Absolute paths from another directory

Windows PowerShell (replace only `$code` with the extracted location):

```powershell
$code = 'D:\Submission\ITDSIU23030_TranNamAnh\code'
Set-Location $env:TEMP
java -jar "$code\bin\creditminer-cli.jar" predict --model "$code\models\RANDOMFOREST_COST.model" --test "$code\datasets\test.arff" --out "$code\predictions.csv"
java -jar "$code\bin\creditminer-cli.jar" evaluate --model "$code\models\DECISIONTREE.model" --test "$code\datasets\test.arff" --out "$code\evaluation.json"
```

Bash:

```bash
code='/home/grader/Submission/ITDSIU23030_TranNamAnh/code'
cd /tmp
java -jar "$code/bin/creditminer-cli.jar" predict --model "$code/models/RANDOMFOREST_COST.model" --test "$code/datasets/test.arff" --out "$code/predictions.csv"
java -jar "$code/bin/creditminer-cli.jar" evaluate --model "$code/models/DECISIONTREE.model" --test "$code/datasets/test.arff" --out "$code/evaluation.json"
```

Every input/output flag accepts absolute or relative paths, including alternative training and test files. Relative paths resolve against the terminal's current directory. Preprocess another CSV with the UCI schema, then pass its generated `train.arff`/`test.arff` to `train`. Prediction data must retain the training feature order, types, and class labels; arbitrary unrelated CSV/ARFF schemas are not interchangeable.

## Expected outputs and runtime

| Command | Expected output | Runtime guidance |
| --- | --- | --- |
| preprocess | Raw, clean, enriched, train/test ARFFs and descriptive JSONs; 29,965 clean rows split 23,972/5,993 for the included data | Usually seconds; machine dependent |
| train | Method-named models, `evaluation.json`, `evaluation.csv`, `best.json`; metrics and build/CV/holdout timings | Ten models with 10-fold CV can take minutes; RF/SMOTE dominate |
| predict | CSV with one header and 5,993 data rows for the included test set; summary on stdout | Usually seconds including JVM/model load |
| evaluate | JSON metrics and confusion matrix on stdout, or the file named by `--out` | Usually seconds |
| sequence | Sequence ARFFs, selected-pattern evidence, and `phase10_sequences.json` including the fold-local experiment | Can take several minutes; lower support increases work |

These are scheduling estimates, not benchmark promises. `datasets/phase5_evaluation.json` contains measured pipeline timings; CLI training prints timings for the current run. The shipped selected model is cost-sensitive RandomForest. The builder asserts 5,993 predictions and exit code zero for both path tests; it does not retrain the models.

## Optional web demo

The packaged source expects the original `backend/data` and `backend/models` layout. Prepare it from the flat submission artifacts first. From `code/`, PowerShell:

```powershell
New-Item -ItemType Directory -Force source/backend/data/raw, source/backend/data/processed, source/backend/models | Out-Null
Copy-Item datasets/default_credit_card_clients.csv source/backend/data/raw/
Copy-Item datasets/*.arff, datasets/*.json, datasets/phase5_comparison.csv source/backend/data/processed/
Copy-Item models/* source/backend/models/
$env:SPRING_PROFILES_ACTIVE = 'demo'
$env:SERVER_PORT = '8091'
$env:CREDITMINER_CORS_ALLOWED_ORIGINS = 'http://localhost:3001,http://127.0.0.1:3001'
Set-Location source/backend
java -jar ../../bin/creditminer-web.jar
```

Bash, from `code/`:

```bash
mkdir -p source/backend/data/raw source/backend/data/processed source/backend/models
cp datasets/default_credit_card_clients.csv source/backend/data/raw/
cp datasets/*.arff datasets/*.json datasets/phase5_comparison.csv source/backend/data/processed/
cp models/* source/backend/models/
cd source/backend
SPRING_PROFILES_ACTIVE=demo SERVER_PORT=8091 CREDITMINER_CORS_ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001 java -jar ../../bin/creditminer-web.jar
```

Wait until `http://localhost:8091/api/overview` reports `totalCustomers > 0`. This demo seeds an in-memory H2 database and discards it on exit. In another terminal, from `code/source/web`, PowerShell:

```powershell
corepack pnpm install --frozen-lockfile
$env:NEXT_PUBLIC_API_URL = 'http://localhost:8091/api'
corepack pnpm build
corepack pnpm start -p 3001
```

Bash:

```bash
corepack pnpm install --frozen-lockfile
NEXT_PUBLIC_API_URL=http://localhost:8091/api corepack pnpm build
corepack pnpm start -p 3001
```

Open `http://localhost:3001`, `/report/paper` for the academic report, or `/mining-report` for the web report. The public API URL is baked into the web build; rebuild if changing ports. Stop both foreground servers with Ctrl+C. Ports 3000 and 8080 are reserved on Line's machine.

## Regenerate all artifacts from source

First prepare the backend data layout above. From `code/source/backend`, install the bundled GPL 3.0 GSP dependency (see `lib/README.md`):

```text
mvn install:install-file "-Dfile=lib/generalizedSequentialPatterns-1.0.1.jar" "-DpomFile=lib/generalizedSequentialPatterns-1.0.1.pom"
mvn "-Dmaven.jar.forceCreation=true" package
```

Maven downloads other dependencies on first use. `maven.jar.forceCreation` ensures repeated builds recreate the application JAR before shading and Boot repackaging. With a populated cache add `-o`; a custom cache uses the quoted argument `"-Dmaven.repo.local=D:\path\to\repository"`. Run these phase mains in order from that same directory, in either shell:

```text
mvn -q compile exec:java "-Dexec.mainClass=com.creditminer.pipeline.Phase1Report"
mvn -q compile exec:java "-Dexec.mainClass=com.creditminer.pipeline.Phase2Report"
mvn -q compile exec:java "-Dexec.mainClass=com.creditminer.pipeline.Phase3Report"
mvn -q compile exec:java "-Dexec.mainClass=com.creditminer.pipeline.Phase5Pipeline"
mvn -q compile exec:java "-Dexec.mainClass=com.creditminer.pipeline.Phase6Pipeline"
mvn -q compile exec:java "-Dexec.mainClass=com.creditminer.pipeline.Phase7Pipeline"
mvn -q compile exec:java "-Dexec.mainClass=com.creditminer.pipeline.InsightFactsReport"
mvn -q compile exec:java "-Dexec.mainClass=com.creditminer.pipeline.Phase10Pipeline"
```

These overwrite generated backend artifacts; keep the shipped artifacts for comparison. They do not require PostgreSQL. Alternatively run `source/scripts/train.ps1` or `train.sh` from the source tree with a populated offline Maven cache. Do not run database seed/reset scripts to regenerate mining artifacts.

The submission builder operates in the original repository layout (its docs templates are under repository `docs/`), not directly in this flattened extracted package. In the repository:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-submission.ps1
# Line's sandbox cache:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-submission.ps1 -MavenRepo D:\01_Workspaces\CreditMiner\.m2-cache
```

`-TeamFolder` changes the folder name, `-OutDir` changes its parent, and `-BackendPort`/`-WebPort` change the demo ports. `-SkipBuild` reuses existing JARs and the web build (which must already use the selected API URL). `-SkipPdf` produces an explicitly incomplete validation archive without report PDFs. Reruns replace the builder-owned team folder and ZIP. Logs remain alongside the ZIP.

## Dataset and attribution

[UCI Default of Credit Card Clients, dataset 350](https://archive.ics.uci.edu/dataset/350/default+of+credit+card+clients), 30,000 clients, is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The source spreadsheet was converted to CSV; this project removes 35 duplicates, maps categorical values, engineers features, and creates a seed-42 split and repayment sequences.

Dataset citation: Yeh, I. (2009). *Default of Credit Card Clients*. UCI Machine Learning Repository. https://doi.org/10.24432/C55S3H.

Study: Yeh, I.-C. and Lien, C.-H. (2009). *The comparisons of data mining techniques for the predictive accuracy of probability of default of credit card clients*. Expert Systems with Applications, 36(2), 2473-2480. https://doi.org/10.1016/j.eswa.2007.12.020.

See `LICENSE-THIRD-PARTY.md` for Weka and GSP GPL 3.0 notices. This is an academic demonstration, with no claim of suitability for real lending decisions.
