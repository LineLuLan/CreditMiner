# CreditMiner backend

The backend contains the Spring Boot REST API, the offline Weka pipeline, the GSP sequence-mining module, and the standalone CreditMiner CLI.

## Stack

| Component | Version or role |
| --- | --- |
| Java | 17 |
| Spring Boot | 3.2.5 |
| Weka | 3.8.6 |
| `generalizedSequentialPatterns` | 1.0.1 |
| Maven | Build, tests, phase runners, and packaging |
| H2 | In-memory local demo |
| PostgreSQL / Neon | Development and hosted persistence |

## Requirements

- Java 17.
- Maven.
- The source CSV at `data/raw/default_credit_card_clients.csv` when regenerating artifacts.
- The generated files in `data/processed` and `models` when running the complete demo.

Run all commands in this document from `backend`.

## Local demo

The `demo` profile creates an H2 database in memory and seeds it from local artifacts. It does not need PostgreSQL credentials.

### PowerShell

```powershell
$env:SPRING_PROFILES_ACTIVE = "demo"
$env:SERVER_PORT = "8091"
mvn spring-boot:run
```

### Bash

```bash
SPRING_PROFILES_ACTIVE=demo SERVER_PORT=8091 mvn spring-boot:run
```

The first load can take about 60 seconds while the seed data is loaded. Use:

- API base: `http://localhost:8091/api`
- Health: `http://localhost:8091/actuator/health`
- Swagger UI: `http://localhost:8091/swagger-ui.html`

## Profiles

| Profile | Database | Schema mode | Port and purpose |
| --- | --- | --- | --- |
| `demo` | H2 in memory | `create` | 8091 in the local runner; artifact-backed course demo |
| `dev` | PostgreSQL | `validate` | 8080 by default; local development |
| `prod` | PostgreSQL, including Neon | `validate` | Host-configured deployment |

Select a profile with `SPRING_PROFILES_ACTIVE`. Override the port with `SERVER_PORT`.

The `prod` configuration supports an optional `backend/.env` file through `spring.config.import`. Keep this file local and git-ignored. Use only variable names such as `DATABASE_URL`, `DB_USER`, and `DB_PASSWORD` in documentation. Do not print or commit their values.

Artifact and model paths can be overridden with the `CM_*` variables defined in `src/main/resources/application.yml`.

## REST API

All application endpoints are under `/api`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/overview` | Dataset and risk summary |
| GET | `/eda/describe` | Column descriptions |
| GET | `/eda/distribution` | Binned distribution with optional default split |
| GET | `/eda/correlation` | Numeric correlation matrix |
| GET | `/eda/default-by` | Default rate by supported dimension |
| GET | `/eda/pca-2d` | Two-dimensional PCA points |
| GET | `/customers` | Filtered, sorted, paginated customers |
| GET | `/customers/{id}` | Full customer record |
| GET | `/clusters` | Cluster summaries |
| GET | `/clusters/{id}/customers` | Customers in one cluster |
| GET | `/rules` | Apriori rules |
| GET | `/anomalies` | Ranked anomaly evidence |
| GET | `/insights` | Insight cards |
| GET | `/insights/visuals` | Insight visualization specifications |
| POST | `/predict` | Default prediction from 23 input fields |
| GET | `/mining-report` | Consolidated pipeline evidence |
| GET | `/sequences` | Complete Phase 10 GSP artifact |

See [../docs/API.md](../docs/API.md) for query parameters, request bodies, sample responses, and the error envelope.

## Offline pipeline

The full artifact chain has eight phase mains. Maven offline mode works after all dependencies are present in the local cache.

```bash
mvn -o -B compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase1Report
mvn -o -B compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase2Report
mvn -o -B compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase3Report
mvn -o -B compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase5Pipeline
mvn -o -B compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase6Pipeline
mvn -o -B compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase7Pipeline
mvn -o -B compile exec:java -Dexec.mainClass=com.creditminer.pipeline.InsightFactsReport
mvn -o -B compile exec:java -Dexec.mainClass=com.creditminer.pipeline.Phase10Pipeline
```

PowerShell users must quote the property argument, for example:

```powershell
mvn -o -B compile exec:java "-Dexec.mainClass=com.creditminer.pipeline.Phase1Report"
```

The helper scripts in `../scripts` run the same phases. See [../docs/PIPELINE.md](../docs/PIPELINE.md) for the exact inputs, outputs, and run times.

`Phase8Seeder` is not part of artifact regeneration. It writes generated data to PostgreSQL and must run only against an explicitly confirmed database.

## Command-line interface

Package the backend to create the shaded CLI JAR:

```bash
mvn -B package
java -jar target/creditminer-cli.jar --help
```

The commands are:

```text
preprocess --input <raw.csv> --out <dir> [--seed 42] [--train-ratio 0.8]
train --train <train.arff> [--test <test.arff>] --out <dir> [model options]
predict --model <file.model> --test <file.arff> [--out <predictions.csv>]
evaluate --model <file.model> --test <file.arff> [--out <evaluation.json>]
sequence --input <enriched.arff> --train <train.arff> --test <test.arff> --out <dir> [sequence options]
```

Relative example from `backend`:

```bash
java -jar target/creditminer-cli.jar evaluate --model models/RANDOMFOREST_COST.model --test data/processed/test.arff --out data/processed/cli-evaluation.json
```

Absolute example on Windows:

```powershell
java -jar D:\01_Workspaces\CreditMiner\backend\target\creditminer-cli.jar sequence --input D:\01_Workspaces\CreditMiner\backend\data\processed\enriched.arff --train D:\01_Workspaces\CreditMiner\backend\data\processed\train.arff --test D:\01_Workspaces\CreditMiner\backend\data\processed\test.arff --out D:\01_Workspaces\CreditMiner\backend\data\processed --min-support 0.10 --top 10
```

## Packaging

The Maven build produces:

- `target/creditminer-0.1.0-SNAPSHOT.jar`: Spring Boot application.
- `target/creditminer-cli.jar`: shaded, Spring-free command-line application.

Start the packaged API with a selected profile:

```bash
SPRING_PROFILES_ACTIVE=demo SERVER_PORT=8091 java -jar target/creditminer-0.1.0-SNAPSHOT.jar
```

## Tests

The backend suite contains 75 tests.

```bash
mvn -B test
```

This command is the required backend verification gate. Report it as passed only after it runs successfully in the current worktree.

## Package map

| Package | Role |
| --- | --- |
| `cli` | Command parsing and Spring-free workflows |
| `pipeline` | Offline phase mains and explicit database utilities |
| `sequence` | Sequence construction, GSP mining, pattern selection, and feature experiment |
| `service` | Mining, EDA, prediction, reporting, and seed logic |
| `controller` | REST endpoints |
| `dto` | Request and response contracts |
| `entity`, `repository` | Relational model and data access |
| `config` | Profiles, CORS, OpenAPI, model loading, and demo initialization |

See [../Architecture.md](../Architecture.md) for the complete system design and artifact-to-endpoint contracts.
