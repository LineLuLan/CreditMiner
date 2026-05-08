# CreditMiner Backend

Java 17 + Spring Boot 3.2 + Weka 3.8.6 — REST API and offline mining pipeline.

## Quick start

```bash
# Compile + run unit tests
mvn clean test

# Start REST API (default profile: dev — talks to local Postgres on :5432)
mvn spring-boot:run

# Run the offline training pipeline (CSV -> models + DB seed)
mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.TrainPipeline"

# Build deployable JAR
mvn clean package -DskipTests
java -jar target/creditminer-0.1.0-SNAPSHOT.jar
```

## Profiles

- `dev` (default) — local Postgres, debug logs
- `prod` — Neon DB, JSON logs, CORS limited to Vercel URL

Switch via `SPRING_PROFILES_ACTIVE=prod`.

## REST API

- Base: `http://localhost:8080/api`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Contract: `docs/BE_Handoff.md`

## Models

`models/*.model` are produced by `TrainPipeline.main()` and loaded by
`ModelConfig` at startup. They are **gitignored** because they are large
binaries — re-train locally, or download from a release artifact.

## Development tracker

See `docs/BE_Tracker.md`.
