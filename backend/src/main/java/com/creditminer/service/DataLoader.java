package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.core.Instances;
import weka.core.converters.ArffSaver;
import weka.core.converters.CSVLoader;
import weka.core.converters.ConverterUtils.DataSource;

import java.io.File;
import java.util.List;

/**
 * I/O for raw datasets — CSV in, ARFF in/out.
 *
 * <p>Drops the trailing two Naive-Bayes leakage columns from the original
 * Kaggle dataset at load time (see blueprint §2.4).</p>
 *
 * <p>This service is used both by the offline {@link com.creditminer.pipeline.TrainPipeline}
 * and the online inference path (when re-fitting filters at request time).</p>
 */
@Slf4j
@Service
public class DataLoader {

    private static final List<String> LEAKAGE_COL_PATTERNS = List.of(
            "Naive_Bayes_Classifier_Attrition_Flag",
            "Naive_Bayes_Classifier" // catch-all for both trailing columns
    );

    /**
     * Load the original BankChurners.csv.
     *
     * @param csvPath path to {@code BankChurners.csv}
     * @return {@link Instances} with leakage columns removed; class index set to {@code Attrition_Flag}
     * @throws Exception on I/O or parse failure
     */
    public Instances loadCsv(String csvPath) throws Exception {
        // TODO: implement
        // 1. Use weka.core.converters.CSVLoader
        // 2. Detect leakage columns by name; drop with weka.filters.unsupervised.attribute.Remove
        // 3. Set class index to "Attrition_Flag"
        // 4. Log row/column counts
        log.info("Loading CSV: {}", csvPath);
        CSVLoader loader = new CSVLoader();
        loader.setSource(new File(csvPath));
        Instances data = loader.getDataSet();
        return dropLeakageColumns(data);
    }

    /**
     * Load an ARFF file produced by an earlier pipeline run.
     */
    public Instances loadArff(String arffPath) throws Exception {
        log.info("Loading ARFF: {}", arffPath);
        DataSource source = new DataSource(arffPath);
        return source.getDataSet();
    }

    /**
     * Persist instances to ARFF.
     */
    public void saveArff(Instances data, String outPath) throws Exception {
        log.info("Saving ARFF: {} ({} instances)", outPath, data.numInstances());
        ArffSaver saver = new ArffSaver();
        saver.setInstances(data);
        saver.setFile(new File(outPath));
        saver.writeBatch();
    }

    /**
     * Strip the trailing 2 Naive-Bayes leakage columns from the Kaggle CSV.
     * Returns the data unchanged if those columns are absent.
     */
    private Instances dropLeakageColumns(Instances data) {
        // TODO: enumerate attributes; use Remove filter to delete matching ones
        // Placeholder so caller flow is shaped correctly
        return data;
    }
}
