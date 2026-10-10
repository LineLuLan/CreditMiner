package com.creditminer.pipeline;

import com.creditminer.service.ClassificationService;
import com.creditminer.service.DataLoader;
import com.creditminer.service.FeatureEngineer;
import com.creditminer.service.ModelFactory;
import com.creditminer.service.PredictInputBuilder;
import com.creditminer.service.Splitter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import weka.classifiers.Classifier;
import weka.classifiers.meta.FilteredClassifier;
import weka.classifiers.meta.CostSensitiveClassifier;
import weka.classifiers.trees.RandomForest;
import weka.core.Randomizable;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;
import weka.filters.supervised.instance.SMOTE;
import weka.filters.Filter;
import weka.filters.MultiFilter;
import weka.filters.unsupervised.attribute.Remove;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class Phase5PipelineTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void configuresExactlyTenDistinctVariants() {
        List<String> variants = Phase5Pipeline.configuredVariants();
        assertEquals(10, variants.size());
        assertEquals(10, variants.stream().distinct().count());
    }

    @Test
    void canonicalSelectionUsesCvAndIgnoresHoldoutMetrics() {
        List<Map<String, Object>> rows = minimumCandidates();
        rows.add(metrics("J48", "smote", 0.70, 0.80, 0.99));
        rows.add(metrics("J48", "cost", 0.60, 0.75, 1.00));

        Map<ClassificationService.Algo, Map<String, Object>> selected =
                Phase5Pipeline.selectCanonicalRows(rows);

        assertEquals("baseline", selected.get(ClassificationService.Algo.J48).get("variant"));
    }

    @Test
    void costVariantCanBeCanonicalAndReportMatchesPersistedPath() {
        List<Map<String, Object>> rows = minimumCandidates();
        rows.add(metrics("J48", "cost", 0.95, 0.90, 0.01));

        Map<ClassificationService.Algo, Map<String, Object>> selected =
                Phase5Pipeline.selectCanonicalRows(rows);
        Map<String, Object> best = Phase5Pipeline.bestVariantDocument(selected);

        assertEquals("cost", selected.get(ClassificationService.Algo.J48).get("variant"));
        assertEquals("J48", best.get("algo"));
        assertEquals("cost", best.get("variant"));
        assertEquals("models/DECISIONTREE.model",
                ModelFactory.fileName(ModelFactory.Algorithm.DECISIONTREE,
                        ModelFactory.Variant.baseline).replaceFirst("^", "models/"));
    }

    @Test
    void exactCvTiesUseStableBaselineThenAlgorithmOrder() {
        List<Map<String, Object>> rows = minimumCandidates();
        rows.add(metrics("J48", "smote", 0.80, 0.85, 0.99));

        Map<ClassificationService.Algo, Map<String, Object>> selected =
                Phase5Pipeline.selectCanonicalRows(rows);
        Map<String, Object> best = Phase5Pipeline.bestVariantDocument(selected);

        assertEquals("baseline", selected.get(ClassificationService.Algo.J48).get("variant"));
        assertEquals("J48", best.get("algo"));
    }

    @Test
    void normalizedClassOrderAndUndocumentedCategoryMappingsAreStable() throws Exception {
        DataLoader loader = new DataLoader();
        Instances data = loader.loadCsv(writeRawCsv().toString());

        assertEquals(List.of("No", "Yes"), List.of(
                data.classAttribute().value(0), data.classAttribute().value(1)));
        assertEquals("Other", data.instance(0).stringValue(data.attribute("EDUCATION")));
        assertEquals("Other", data.instance(1).stringValue(data.attribute("EDUCATION")));
        assertEquals("Other", data.instance(2).stringValue(data.attribute("EDUCATION")));
        assertEquals("Other", data.instance(0).stringValue(data.attribute("MARRIAGE")));
    }

    @Test
    void clippingAndRiskTierBoundariesMatchTheDocumentedRule() {
        Instances enriched = new FeatureEngineer().run(riskBoundaryFixture());

        assertEquals("Low", tier(enriched, 0));
        assertEquals("Medium", tier(enriched, 1));
        assertEquals("High", tier(enriched, 2));
        assertEquals("High", tier(enriched, 3));
        assertEquals(5, enriched.instance(4).value(enriched.attribute("UTILIZATION_1")), 1e-9);
        assertEquals(-1, enriched.instance(5).value(enriched.attribute("UTILIZATION_1")), 1e-9);
        assertEquals(-1, enriched.instance(5).value(enriched.attribute("AVG_UTILIZATION")), 1e-9);
    }

    @Test
    void predictionTemplateHeaderMatchesIdFreeTrainingHeader() throws Exception {
        DataLoader loader = new DataLoader();
        Instances enriched = new FeatureEngineer().run(loader.loadCsv(writeRawCsv().toString()));
        Path arff = temporaryDirectory.resolve("enriched.arff");
        loader.saveArff(enriched, arff.toString());

        PredictInputBuilder builder = new PredictInputBuilder(loader);
        ReflectionTestUtils.setField(builder, "enrichedArffPath", arff.toString());
        builder.init();
        Instances predictionHeader = (Instances) ReflectionTestUtils.getField(builder, "template");

        Remove removeId = new Remove();
        removeId.setAttributeIndicesArray(new int[]{enriched.attribute("ID").index()});
        removeId.setInputFormat(enriched);
        Instances trainingHeader = new Instances(Filter.useFilter(enriched, removeId), 0);
        assertNull(trainingHeader.equalHeadersMsg(predictionHeader));
    }

    @Test
    void smoteIsAClassifierFilterSoCrossValidationFitsItInsideEachTrainingFold() {
        ClassificationService service = new ClassificationService(null, null, null, null, null);
        Classifier classifier = Phase5Pipeline.classifierFor(
                service, ClassificationService.Algo.J48, true);

        FilteredClassifier filtered = assertInstanceOf(FilteredClassifier.class, classifier);
        assertInstanceOf(SMOTE.class, filtered.getFilter());
    }

    @Test
    void modelFactoryPropagatesRequestedSeedToEveryRandomizableLayer() {
        ModelFactory factory = new ModelFactory();

        FilteredClassifier smote = assertInstanceOf(FilteredClassifier.class,
                factory.create(ModelFactory.Algorithm.RANDOMFOREST,
                        ModelFactory.Variant.smote, 17));
        assertEquals(17, smote.getSeed());
        assertEquals(17, assertInstanceOf(SMOTE.class, smote.getFilter()).getRandomSeed());
        assertEquals(17, assertInstanceOf(RandomForest.class, smote.getClassifier()).getSeed());

        CostSensitiveClassifier cost = assertInstanceOf(CostSensitiveClassifier.class,
                factory.create(ModelFactory.Algorithm.RANDOMFOREST,
                        ModelFactory.Variant.cost, 23));
        assertEquals(23, cost.getSeed());
        assertEquals(23, assertInstanceOf(RandomForest.class, cost.getClassifier()).getSeed());
        assertEquals(23, assertInstanceOf(Randomizable.class, cost).getSeed());

        FilteredClassifier chained = assertInstanceOf(FilteredClassifier.class,
                factory.create(ModelFactory.Algorithm.NAIVEBAYES,
                        ModelFactory.Variant.smote, 31));
        MultiFilter filters = assertInstanceOf(MultiFilter.class, chained.getFilter());
        assertEquals(31, filters.getSeed());
        assertEquals(31, assertInstanceOf(SMOTE.class, filters.getFilters()[0]).getRandomSeed());
    }

    @Test
    void classificationServiceAcceptsAndPropagatesARequestedSeed() {
        ClassificationService service = new ClassificationService(null, null, null, null, null);

        RandomForest forest = assertInstanceOf(RandomForest.class,
                service.build(ClassificationService.Algo.RandomForest, 73));
        assertEquals(73, forest.getSeed());

        CostSensitiveClassifier cost = service.costSensitive(new RandomForest(), 79);
        assertEquals(79, cost.getSeed());
    }

    @Test
    void predictionMicrosAreDerivedFromRoundedMilliseconds() {
        assertEquals(7.51, Phase5Pipeline.predictMicrosPerRecord(45, 5_993));
    }

    @Test
    void splitIsReproducibleEightyTwentyAndStratified() {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("feature"));
        attributes.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        Instances data = new Instances("split", attributes, 100);
        data.setClassIndex(1);
        for (int i = 0; i < 80; i++) data.add(new DenseInstance(1, new double[]{i, 0}));
        for (int i = 80; i < 100; i++) data.add(new DenseInstance(1, new double[]{i, 1}));

        Splitter.Split first = new Splitter().stratified(data, 0.8, 42);
        Splitter.Split second = new Splitter().stratified(data, 0.8, 42);

        assertEquals(80, first.train().numInstances());
        assertEquals(20, first.test().numInstances());
        assertEquals(16, countClass(first.train(), 1));
        assertEquals(4, countClass(first.test(), 1));
        assertEquals(first.train().toString(), second.train().toString());
    }

    @Test
    void downsampleEvenlyKeepsEndpointsAndNeverExceedsLimit() {
        List<Integer> source = IntStream.range(0, 251).boxed().toList();

        List<Integer> sampled = Phase5Pipeline.downsampleEvenly(source, 100);

        assertEquals(100, sampled.size());
        assertEquals(source.get(0), sampled.get(0));
        assertEquals(source.get(source.size() - 1), sampled.get(sampled.size() - 1));

        int smallestGap = Integer.MAX_VALUE;
        int largestGap = Integer.MIN_VALUE;
        for (int i = 1; i < sampled.size(); i++) {
            int gap = sampled.get(i) - sampled.get(i - 1);
            smallestGap = Math.min(smallestGap, gap);
            largestGap = Math.max(largestGap, gap);
        }
        assertTrue(largestGap - smallestGap <= 1, "sample indices should be evenly spaced");
    }

    @Test
    void downsampleEvenlyLeavesShortCurvesUnchanged() {
        List<Integer> source = List.of(0, 1, 2, 3);

        List<Integer> sampled = Phase5Pipeline.downsampleEvenly(source, 100);

        assertEquals(source, sampled);
    }

    @Test
    void sanitizeCurveDropsNonFinitePointAndKeepsValidEndpoints() {
        List<Map<String, Object>> source = List.of(
                curvePoint(0.0, 1.0, 1.0),
                curvePoint(0.4, Double.NaN, 0.5),
                curvePoint(1.0, 0.2, 0.0));

        List<Map<String, Object>> sanitized = Phase5Pipeline.sanitizeCurve(
                source, "recall", "precision", "threshold");

        assertEquals(2, sanitized.size());
        assertEquals(source.get(0), sanitized.get(0));
        assertEquals(source.get(2), sanitized.get(1));
    }

    private static Map<String, Object> curvePoint(double recall, double precision, double threshold) {
        Map<String, Object> point = new LinkedHashMap<>();
        point.put("recall", recall);
        point.put("precision", precision);
        point.put("threshold", threshold);
        return point;
    }

    private static List<Map<String, Object>> minimumCandidates() {
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(metrics("J48", "baseline", 0.80, 0.85, 0.10));
        rows.add(metrics("RandomForest", "baseline", 0.50, 0.70, 0.50));
        rows.add(metrics("NaiveBayes", "baseline", 0.40, 0.65, 0.40));
        rows.add(metrics("Logistic", "baseline", 0.30, 0.60, 0.30));
        return rows;
    }

    private static Map<String, Object> metrics(
            String algo, String variant, double cvF1, double cvRoc, double testF1) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("algo", algo);
        row.put("variant", variant);
        row.put("cv_f1_default", cvF1);
        row.put("cv_roc_auc", cvRoc);
        row.put("test_f1_default", testF1);
        return row;
    }

    private Path writeRawCsv() throws Exception {
        Path csv = temporaryDirectory.resolve("raw.csv");
        Files.writeString(csv, """
                ID,LIMIT_BAL,SEX,EDUCATION,MARRIAGE,AGE,PAY_0,PAY_2,PAY_3,PAY_4,PAY_5,PAY_6,BILL_AMT1,BILL_AMT2,BILL_AMT3,BILL_AMT4,BILL_AMT5,BILL_AMT6,PAY_AMT1,PAY_AMT2,PAY_AMT3,PAY_AMT4,PAY_AMT5,PAY_AMT6,default payment next month
                1,10000,1,4,3,30,0,0,0,0,0,0,100,100,100,100,100,100,10,10,10,10,10,10,0
                2,20000,2,5,1,40,1,0,0,0,0,0,200,200,200,200,200,200,20,20,20,20,20,20,1
                3,30000,1,6,2,50,2,0,0,0,0,0,300,300,300,300,300,300,30,30,30,30,30,30,0
                """);
        return csv;
    }

    private static Instances riskBoundaryFixture() {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("LIMIT_BAL"));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("PAY_" + month));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("BILL_AMT" + month));
        for (int month = 1; month <= 6; month++) attributes.add(new Attribute("PAY_AMT" + month));
        attributes.add(new Attribute("Default", new ArrayList<>(List.of("No", "Yes"))));
        Instances data = new Instances("risk-boundaries", attributes, 6);
        data.setClassIndex(data.numAttributes() - 1);
        addRiskRow(data, new double[]{0, 0, 0, 0, 0, 0}, 49);
        addRiskRow(data, new double[]{1, 0, 0, 0, 0, 0}, 50);
        addRiskRow(data, new double[]{2, 0, 0, 0, 0, 0}, 0);
        addRiskRow(data, new double[]{0, 0, 0, 0, 0, 0}, 100);
        addRiskRow(data, new double[]{0, 0, 0, 0, 0, 0}, 600);
        addRiskRow(data, new double[]{0, 0, 0, 0, 0, 0}, -200);
        return data;
    }

    private static void addRiskRow(Instances data, double[] statuses, double bill) {
        double[] values = new double[data.numAttributes()];
        values[0] = 100;
        System.arraycopy(statuses, 0, values, 1, statuses.length);
        for (int index = 7; index <= 12; index++) values[index] = bill;
        values[data.classIndex()] = 0;
        data.add(new DenseInstance(1, values));
    }

    private static String tier(Instances data, int row) {
        return data.instance(row).stringValue(data.attribute("RISK_TIER"));
    }

    private static int countClass(Instances data, int classIndex) {
        int count = 0;
        for (int i = 0; i < data.numInstances(); i++) {
            if ((int) data.instance(i).classValue() == classIndex) count++;
        }
        return count;
    }
}
