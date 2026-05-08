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
 * Lazily computes the Phase 1 describe report on first call and caches it
 * in-memory for subsequent {@code GET /api/eda/describe} requests.
 *
 * <p>Source preference: pre-generated ARFF (fast, already leakage-free) →
 * raw CSV (slower, runs leakage filter). If neither is on disk, throws a
 * {@code REPORT_NOT_GENERATED} {@link BusinessException} → HTTP 503.</p>
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
    private String arffPath;

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
        log.info("Computing describe report (cache miss) — csv={}, arff={}", csvPath, arffPath);
        File arff = new File(arffPath);
        File csv = new File(csvPath);
        try {
            Instances data;
            List<String> dropped;
            if (arff.exists()) {
                data = dataLoader.loadArff(arffPath);
                ensureClassIndex(data);
                dropped = List.of();
            } else if (csv.exists()) {
                data = dataLoader.loadCsv(csvPath);
                dropped = dataLoader.getLastDroppedColumns();
            } else {
                throw new BusinessException("REPORT_NOT_GENERATED",
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Phase 1 dataset not available. Place BankChurners.csv at '"
                                + csvPath + "' or run Phase1Report to generate '"
                                + arffPath + "'.");
            }
            return describeService.describe(data, dropped);
        } catch (BusinessException be) {
            throw be;
        } catch (Exception ex) {
            log.error("Failed to compute describe report", ex);
            throw new BusinessException("REPORT_NOT_GENERATED",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Failed to load Phase 1 dataset: " + ex.getMessage());
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
