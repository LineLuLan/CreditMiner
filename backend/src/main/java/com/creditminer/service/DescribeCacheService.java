package com.creditminer.service;

import com.creditminer.dto.response.DescribeResponse;
import com.creditminer.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.Instances;

import java.io.File;
import java.util.List;

/**
 * Lazily computes the describe report on first call and caches it in-memory
 * for subsequent {@code GET /api/eda/describe} requests.
 *
 * <p>Source preference (most enriched first): {@code enriched.arff} (Phase 3) →
 * {@code clean.arff} (Phase 2) → {@code phase1_raw.arff} (Phase 1) → raw CSV
 * (re-runs leakage filter). If none exist, throws {@code REPORT_NOT_GENERATED}
 * → HTTP 503.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DescribeCacheService {

    private final DataLoader dataLoader;
    private final DescribeService describeService;

    @Value("${creditminer.data.raw-csv}")
    private String csvPath;

    @Value("${creditminer.data.phase1-arff}")
    private String phase1ArffPath;

    @Value("${creditminer.data.processed-arff}")
    private String cleanArffPath;

    @Value("${creditminer.data.enriched-arff}")
    private String enrichedArffPath;

    private volatile DescribeResponse cached;

    public DescribeResponse get() {
        DescribeResponse local = cached;
        if (local != null) {
            log.debug("Serving describe from cache");
            return local;
        }
        synchronized (this) {
            if (cached == null) {
                cached = compute();
            }
            return cached;
        }
    }

    /** Force re-compute on next call (used by tests / admin tooling). */
    public synchronized void invalidate() {
        cached = null;
    }

    private DescribeResponse compute() {
        log.info("Computing describe report (cache miss)");
        try {
            Instances data;
            List<String> dropped;
            String source;
            if (new File(enrichedArffPath).exists()) {
                source = enrichedArffPath;
                data = dataLoader.loadArff(enrichedArffPath);
                ensureClassIndex(data);
                dropped = List.of();
            } else if (new File(cleanArffPath).exists()) {
                source = cleanArffPath;
                data = dataLoader.loadArff(cleanArffPath);
                ensureClassIndex(data);
                dropped = List.of();
            } else if (new File(phase1ArffPath).exists()) {
                source = phase1ArffPath;
                data = dataLoader.loadArff(phase1ArffPath);
                ensureClassIndex(data);
                dropped = List.of();
            } else if (new File(csvPath).exists()) {
                source = csvPath;
                data = dataLoader.loadCsv(csvPath);
                dropped = dataLoader.getLastDroppedColumns();
            } else {
                throw new BusinessException("REPORT_NOT_GENERATED",
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "No dataset available. Expected one of: '"
                                + enrichedArffPath + "', '" + cleanArffPath + "', '"
                                + phase1ArffPath + "', or raw CSV '" + csvPath + "'.");
            }
            log.info("Describe source: {} ({} rows × {} cols)", source,
                    data.numInstances(), data.numAttributes());
            return describeService.describe(data, dropped);
        } catch (BusinessException be) {
            throw be;
        } catch (Exception ex) {
            log.error("Failed to compute describe report", ex);
            throw new BusinessException("REPORT_NOT_GENERATED",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Failed to load dataset: " + ex.getMessage());
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
