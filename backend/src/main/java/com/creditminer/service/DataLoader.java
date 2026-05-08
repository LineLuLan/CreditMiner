package com.creditminer.service;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.Instances;
import weka.core.converters.ArffSaver;
import weka.core.converters.CSVLoader;
import weka.core.converters.ConverterUtils.DataSource;
import weka.filters.Filter;
import weka.filters.unsupervised.attribute.Remove;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * I/O for raw datasets — CSV in, ARFF in/out.
 *
 * <p>Drops the trailing two Naive-Bayes leakage columns from the original
 * Kaggle dataset at load time (see blueprint §2.4).</p>
 */
@Slf4j
@Service
public class DataLoader {

    private static final String LEAKAGE_PREFIX = "Naive_Bayes_Classifier";
    private static final String CLASS_COLUMN = "Attrition_Flag";

    /** Names of leakage columns dropped by the most recent {@link #loadCsv(String)} call. */
    @Getter
    private List<String> lastDroppedColumns = List.of();

    public Instances loadCsv(String csvPath) throws Exception {
        log.info("Loading CSV: {}", csvPath);
        CSVLoader loader = new CSVLoader();
        loader.setSource(new File(csvPath));
        Instances data = loader.getDataSet();
        return dropLeakageColumns(data);
    }

    public Instances loadArff(String arffPath) throws Exception {
        log.info("Loading ARFF: {}", arffPath);
        DataSource source = new DataSource(arffPath);
        return source.getDataSet();
    }

    public void saveArff(Instances data, String outPath) throws Exception {
        log.info("Saving ARFF: {} ({} instances)", outPath, data.numInstances());
        File out = new File(outPath);
        if (out.getParentFile() != null) {
            out.getParentFile().mkdirs();
        }
        ArffSaver saver = new ArffSaver();
        saver.setInstances(data);
        saver.setFile(out);
        saver.writeBatch();
    }

    /**
     * Strip leakage columns (any attribute whose name starts with
     * {@code Naive_Bayes_Classifier}) and pin {@code Attrition_Flag} as class index.
     */
    private Instances dropLeakageColumns(Instances data) throws Exception {
        List<Integer> indices = new ArrayList<>();
        List<String> names = new ArrayList<>();
        for (int i = 0; i < data.numAttributes(); i++) {
            String name = data.attribute(i).name();
            if (name.startsWith(LEAKAGE_PREFIX)) {
                indices.add(i);
                names.add(name);
            }
        }
        if (indices.isEmpty()) {
            log.warn("No leakage columns matched prefix '{}' — dataset may already be cleaned",
                    LEAKAGE_PREFIX);
        } else {
            Remove filter = new Remove();
            filter.setAttributeIndicesArray(indices.stream().mapToInt(Integer::intValue).toArray());
            filter.setInputFormat(data);
            data = Filter.useFilter(data, filter);
            log.info("Dropped {} leakage column(s): {}", names.size(), names);
        }
        this.lastDroppedColumns = List.copyOf(names);

        Attribute classAttr = data.attribute(CLASS_COLUMN);
        if (classAttr != null) {
            data.setClassIndex(classAttr.index());
        } else {
            log.warn("Class column '{}' not found — class index unset", CLASS_COLUMN);
        }
        log.info("Loaded {} rows × {} columns; class={}",
                data.numInstances(), data.numAttributes(),
                data.classIndex() >= 0 ? data.classAttribute().name() : "(none)");
        return data;
    }
}
