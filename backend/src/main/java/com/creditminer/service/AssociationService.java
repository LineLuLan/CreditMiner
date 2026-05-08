package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.associations.Apriori;
import weka.core.Instances;

import java.util.List;

/**
 * Phase 7 — Apriori association rule mining.
 *
 * <p>Pipeline (offline, in TrainPipeline):
 * <ol>
 *   <li>Discretize numeric columns into 3 equal-frequency bins</li>
 *   <li>Run Apriori with {@code minSupport=0.05, minConfidence=0.7, numRules=50}</li>
 *   <li>Filter to rules with {@code Attrition_Flag} on RHS</li>
 *   <li>Categorize each as {@code "churn"} or {@code "retention"}</li>
 *   <li>Export to {@code rules.json} AND insert into {@code rules} table</li>
 * </ol>
 * </p>
 */
@Slf4j
@Service
public class AssociationService {

    /** Discretize the 6 numeric columns listed in blueprint §7.1 step 1. */
    public Instances discretizeForApriori(Instances data) {
        // TODO: weka.filters.unsupervised.attribute.Discretize -B 3 -F (equal-frequency)
        return data;
    }

    /** Run Apriori with default params; return all rules. */
    public Apriori runApriori(Instances data) throws Exception {
        // TODO: configure minSupport, minConfidence, numRules; ap.buildAssociations(data)
        return null;
    }

    /** Extract rules from {@link Apriori}, filter, classify churn/retention. */
    public List<RuleRecord> extractRules(Apriori apriori, double minLift) {
        // TODO: walk apriori.getAllTheRules() and shape into RuleRecord
        return List.of();
    }

    /** Lightweight in-memory record passed to repo / JSON exporter. */
    public record RuleRecord(String lhs, String rhs, double support,
                             double confidence, double lift, String category) { }
}
