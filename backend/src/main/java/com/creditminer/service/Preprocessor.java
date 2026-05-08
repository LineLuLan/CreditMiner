package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.core.Instances;

/**
 * Phase 2 preprocessing.
 *
 * <p>Steps (in order):
 * <ol>
 *   <li>Replace "Unknown" with null in 3 categorical columns</li>
 *   <li>Impute missing — categorical: mode; numeric: median</li>
 *   <li>Drop duplicates by {@code CLIENTNUM}</li>
 *   <li>Flag outliers via Z-score and IQR (do NOT delete)</li>
 *   <li>Optional: scale (caller decides which scaler based on downstream model)</li>
 * </ol>
 * </p>
 *
 * <p>Returns a NEW {@link Instances} — original is untouched.</p>
 */
@Slf4j
@Service
public class Preprocessor {

    /** Master entry point. Calls all sub-steps in order. */
    public Instances run(Instances raw) {
        log.info("Preprocessor.run() — starting on {} instances", raw.numInstances());
        Instances data = imputeMissing(raw);
        data = dropDuplicates(data);
        data = flagOutliers(data);
        return data;
    }

    /**
     * Impute missing values + replace "Unknown" sentinel with mode.
     *
     * <p>Strategy:
     * <ul>
     *   <li>Categorical → mode imputation</li>
     *   <li>Numerical → median imputation</li>
     * </ul>
     * </p>
     *
     * <p>Use {@code weka.filters.unsupervised.attribute.ReplaceMissingValues}
     * after pre-mapping "Unknown" to nulls.</p>
     */
    public Instances imputeMissing(Instances data) {
        // TODO: implement
        return data;
    }

    public Instances dropDuplicates(Instances data) {
        // TODO: dedupe by CLIENTNUM column
        return data;
    }

    /**
     * Flags outliers via Z-score (|z|>3) AND IQR rule.
     *
     * <p>Sets a virtual {@code is_outlier} flag — actual persistence happens
     * in {@code DatabaseSeeder}. Returns a copy with an extra attribute or
     * an aligned {@code boolean[]}.</p>
     */
    public Instances flagOutliers(Instances data) {
        // TODO: compute z-scores and IQR bounds for the 4 financial columns
        // listed in blueprint §2.3, OR them, attach as new attribute
        return data;
    }

    /** Min-max normalize for distance-based algorithms (KMeans). */
    public Instances normalize(Instances data) {
        // TODO: weka.filters.unsupervised.attribute.Normalize
        return data;
    }

    /** Z-score standardize for NaiveBayes / Logistic. */
    public Instances standardize(Instances data) {
        // TODO: weka.filters.unsupervised.attribute.Standardize
        return data;
    }

    /** One-hot encode nominals (for Logistic / form-input inference). */
    public Instances encodeNominal(Instances data) {
        // TODO: weka.filters.unsupervised.attribute.NominalToBinary
        return data;
    }
}
