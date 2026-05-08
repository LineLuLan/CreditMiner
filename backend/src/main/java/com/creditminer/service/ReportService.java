package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Export pipeline outputs to CSV/PDF for the technical report.
 *
 * <p>Currently a placeholder — wire when working on the deliverables in W8.</p>
 */
@Slf4j
@Service
public class ReportService {

    /** Export model comparison table (blueprint §5.4) to CSV. */
    public byte[] exportComparisonCsv() {
        // TODO
        return new byte[0];
    }

    /** Export confusion matrices for each model. */
    public byte[] exportConfusionMatrixCsv() {
        // TODO
        return new byte[0];
    }

    /** Export feature importance ranking from RandomForest. */
    public byte[] exportFeatureImportanceCsv() {
        // TODO
        return new byte[0];
    }
}
