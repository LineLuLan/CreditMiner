package com.creditminer.pipeline;

import lombok.extern.slf4j.Slf4j;

/**
 * OFFLINE training pipeline.
 *
 * <p>Run with:
 * <pre>{@code
 * mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.TrainPipeline"
 * }</pre>
 * </p>
 *
 * <p>Stages (matching blueprint §14.1):
 * <ol>
 *   <li>Load CSV → preprocess → engineer features → save {@code clean.arff}</li>
 *   <li>Train classifiers (J48, RF, NB) — baseline + SMOTE + cost-sensitive</li>
 *   <li>10-fold CV; final test eval; export comparison.csv</li>
 *   <li>Train KMeans clusterer (with elbow + silhouette to pick k)</li>
 *   <li>Discretize → Apriori → save {@code rules.json}</li>
 *   <li>Seed Postgres (customers + clusters + rules + insights)</li>
 * </ol>
 * </p>
 *
 * <p><b>This is NOT a Spring component</b> — it's a standalone {@code main}
 * intentionally separated from the REST application so it can run as a cron
 * job without booting the web server.</p>
 */
@Slf4j
public class TrainPipeline {

    public static void main(String[] args) throws Exception {
        log.info("=== CreditMiner TrainPipeline ===");

        // Step 1: Load + preprocess + features
        log.info("Step 1/6 — Load + preprocess + feature engineering");
        // TODO: DataLoader, Preprocessor, FeatureEngineer
        // Instances raw = new DataLoader().loadCsv(System.getenv().getOrDefault("CM_RAW_CSV", "data/raw/BankChurners.csv"));
        // Instances clean = new Preprocessor().run(raw);
        // Instances enriched = new FeatureEngineer().run(clean);
        // new DataLoader().saveArff(enriched, "data/processed/clean.arff");

        // Step 2: Train classifiers
        log.info("Step 2/6 — Train classifiers (J48 / RF / NB) + SMOTE + cost-sensitive");
        // TODO: stratified split, train each, save .model

        // Step 3: Evaluation
        log.info("Step 3/6 — 10-fold CV + test-set evaluation");
        // TODO: build comparison table CSV

        // Step 4: Clustering
        log.info("Step 4/6 — KMeans + elbow + silhouette");
        // TODO: pick k by Elbow + Silhouette, train final model, save kmeans.model

        // Step 5: Apriori
        log.info("Step 5/6 — Discretize + Apriori");
        // TODO: discretize, run, save rules.json

        // Step 6: DB seeding
        log.info("Step 6/6 — Seed Postgres");
        // TODO: invoke a DatabaseSeeder helper (lives in pipeline package or service)

        log.info("=== DONE ===");
    }
}
