package com.creditminer.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import weka.classifiers.Classifier;
import weka.clusterers.Clusterer;
import weka.core.Instances;
import weka.core.SerializationHelper;
import weka.filters.Filter;

import java.io.File;

/**
 * Loads serialized Weka models into memory at application startup.
 *
 * <p>Models are loaded once via {@link #loadModels()} (annotated with
 * {@link PostConstruct}); inference handlers obtain references via the
 * Lombok-generated getters.</p>
 *
 * <p>If a model file is missing, this class logs a warning and the affected
 * inference endpoints will return HTTP 503 ({@code MODEL_NOT_LOADED}). The
 * application still boots so non-inference endpoints (overview, customers,
 * rules) remain usable.</p>
 *
 * <p>Path overrides come from {@code creditminer.models.*} in
 * {@code application.yml}.</p>
 */
@Slf4j
@Configuration
@Getter
public class ModelConfig {

    @Value("${creditminer.models.classifier}")
    private String classifierPath;

    @Value("${creditminer.models.clusterer}")
    private String clustererPath;

    @Value("${creditminer.models.clusterer-normalizer:models/kmeans-normalizer.model}")
    private String clustererNormalizerPath;

    @Value("${creditminer.models.clusterer-input-header:models/kmeans-input-header.model}")
    private String clustererInputHeaderPath;

    @Value("${creditminer.models.rules-json}")
    private String rulesJsonPath;

    private Classifier classifier;
    private Clusterer clusterer;
    /** Fitted Normalize filter mirroring the bounds the clusterer was trained on. */
    private Filter clustererNormalizer;
    /** 19-attr Instances header — predict-time input must match this shape before normalize. */
    private Instances clustererInputHeader;
    private boolean classifierLoaded = false;
    private boolean clustererLoaded = false;

    /**
     * Eagerly load .model files on startup.
     *
     * <p>Failures are logged but never propagated — see class-level docs.</p>
     */
    @PostConstruct
    public void loadModels() {
        this.classifier = tryLoadClassifier(classifierPath);
        this.clusterer = tryLoadClusterer(clustererPath);
        this.clustererNormalizer = tryLoadFilter(clustererNormalizerPath);
        this.clustererInputHeader = tryLoadInstances(clustererInputHeaderPath);
        log.info("Model load summary: classifier={}, clusterer={}, normalizer={}, header={}",
                classifierLoaded, clustererLoaded,
                clustererNormalizer != null,
                clustererInputHeader != null
                        ? clustererInputHeader.numAttributes() + " attrs" : "missing");
    }

    private Classifier tryLoadClassifier(String path) {
        File f = new File(path);
        if (!f.exists()) {
            log.warn("Classifier not found at {} — /predict will return MODEL_NOT_LOADED", path);
            return null;
        }
        try {
            Classifier loaded = (Classifier) SerializationHelper.read(path);
            classifierLoaded = true;
            log.info("Loaded classifier: {} ({} bytes)", path, f.length());
            return loaded;
        } catch (Exception e) {
            log.error("Failed to load classifier from {}: {}", path, e.getMessage());
            return null;
        }
    }

    private Clusterer tryLoadClusterer(String path) {
        File f = new File(path);
        if (!f.exists()) {
            log.warn("Clusterer not found at {} — cluster lookup unavailable", path);
            return null;
        }
        try {
            Clusterer loaded = (Clusterer) SerializationHelper.read(path);
            clustererLoaded = true;
            log.info("Loaded clusterer: {} ({} bytes)", path, f.length());
            return loaded;
        } catch (Exception e) {
            log.error("Failed to load clusterer from {}: {}", path, e.getMessage());
            return null;
        }
    }

    private Filter tryLoadFilter(String path) {
        File f = new File(path);
        if (!f.exists()) {
            log.warn("Clusterer normalizer not found at {} — predict-time cluster lookup will return -1", path);
            return null;
        }
        try {
            Filter loaded = (Filter) SerializationHelper.read(path);
            log.info("Loaded clusterer normalizer: {} ({} bytes)", path, f.length());
            return loaded;
        } catch (Exception e) {
            log.error("Failed to load clusterer normalizer from {}: {}", path, e.getMessage());
            return null;
        }
    }

    private Instances tryLoadInstances(String path) {
        File f = new File(path);
        if (!f.exists()) {
            log.warn("Clusterer input header not found at {} — predict-time cluster lookup will return -1", path);
            return null;
        }
        try {
            Instances loaded = (Instances) SerializationHelper.read(path);
            log.info("Loaded clusterer input header: {} ({} attrs)", path, loaded.numAttributes());
            return loaded;
        } catch (Exception e) {
            log.error("Failed to load clusterer input header from {}: {}", path, e.getMessage());
            return null;
        }
    }

    /**
     * Used by health check / endpoints to detect cold-start state.
     */
    public boolean isReady() {
        return classifierLoaded && clustererLoaded;
    }
}
