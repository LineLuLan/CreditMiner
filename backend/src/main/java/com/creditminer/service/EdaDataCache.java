package com.creditminer.service;

import com.creditminer.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.Instances;

import java.io.File;

/**
 * Single in-memory copy of the EDA dataset, shared by every EDA endpoint
 * (distribution / correlation / churn-by).
 *
 * <p>Source preference (most enriched first): enriched.arff → clean.arff →
 * phase1_raw.arff → raw CSV. Cached forever once loaded; call {@link #invalidate()}
 * after a pipeline rerun.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EdaDataCache {

    private final DataLoader dataLoader;

    @Value("${creditminer.data.raw-csv}")
    private String csvPath;

    @Value("${creditminer.data.phase1-arff}")
    private String phase1ArffPath;

    @Value("${creditminer.data.processed-arff}")
    private String cleanArffPath;

    @Value("${creditminer.data.enriched-arff}")
    private String enrichedArffPath;

    private volatile Instances cached;

    public Instances get() {
        Instances local = cached;
        if (local != null) return local;
        synchronized (this) {
            if (cached == null) {
                cached = load();
            }
            return cached;
        }
    }

    public synchronized void invalidate() {
        cached = null;
    }

    private Instances load() {
        try {
            Instances data;
            String source;
            if (new File(enrichedArffPath).exists()) {
                source = enrichedArffPath;
                data = dataLoader.loadArff(enrichedArffPath);
            } else if (new File(cleanArffPath).exists()) {
                source = cleanArffPath;
                data = dataLoader.loadArff(cleanArffPath);
            } else if (new File(phase1ArffPath).exists()) {
                source = phase1ArffPath;
                data = dataLoader.loadArff(phase1ArffPath);
            } else if (new File(csvPath).exists()) {
                source = csvPath;
                data = dataLoader.loadCsv(csvPath);
            } else {
                throw new BusinessException("REPORT_NOT_GENERATED",
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "No dataset available. Run Phase 1 / 2 / 3 to generate ARFF first.");
            }
            ensureClassIndex(data);
            log.info("EdaDataCache loaded: {} ({} rows × {} cols)", source,
                    data.numInstances(), data.numAttributes());
            return data;
        } catch (BusinessException be) {
            throw be;
        } catch (Exception ex) {
            log.error("Failed to load EDA dataset", ex);
            throw new BusinessException("REPORT_NOT_GENERATED",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Failed to load EDA dataset: " + ex.getMessage());
        }
    }

    private static void ensureClassIndex(Instances data) {
        if (data.classIndex() >= 0) return;
        Attribute classAttr = data.attribute("Attrition_Flag");
        if (classAttr != null) {
            data.setClassIndex(classAttr.index());
        }
    }
}
