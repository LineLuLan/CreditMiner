package com.creditminer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.core.Instances;

import java.util.Random;

/**
 * Stratified train/test splitter (BE-50).
 *
 * <p>Stratification preserves the {@code Attrition_Flag} class ratio in both
 * splits. This matters because the dataset is imbalanced (~84:16) — random
 * splitting could leave too few Attrited rows in the test set.</p>
 */
@Slf4j
@Service
public class Splitter {

    public record Split(Instances train, Instances test) {}

    /**
     * Stratified shuffle split.
     *
     * @param data       full dataset; class index must be set
     * @param trainRatio fraction in [0,1] for the train side (e.g. 0.8)
     * @param seed       PRNG seed
     */
    public Split stratified(Instances data, double trainRatio, long seed) {
        if (data.classIndex() < 0) {
            throw new IllegalStateException("Class index must be set before splitting");
        }
        Instances shuffled = new Instances(data);
        shuffled.randomize(new Random(seed));
        shuffled.stratify(10);

        int total = shuffled.numInstances();
        int trainSize = (int) Math.round(total * trainRatio);
        Instances train = new Instances(shuffled, 0, trainSize);
        Instances test = new Instances(shuffled, trainSize, total - trainSize);
        log.info("Stratified split: total={} train={} ({}%) test={} ({}%)",
                total, train.numInstances(),
                Math.round(100.0 * train.numInstances() / total),
                test.numInstances(),
                Math.round(100.0 * test.numInstances() / total));
        return new Split(train, test);
    }
}
