package com.creditminer.service;

import com.creditminer.entity.Customer;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.repository.RuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.test.util.ReflectionTestUtils;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.StreamSupport;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatabaseSeederTest {

    @TempDir
    Path tempDir;

    private CustomerRepository customerRepo;
    private ClusterRepository clusterRepo;
    private RuleRepository ruleRepo;
    private DataLoader dataLoader;
    private ClusterService clusterService;
    private DatabaseSeeder seeder;

    @BeforeEach
    void setUp() throws Exception {
        customerRepo = mock(CustomerRepository.class);
        clusterRepo = mock(ClusterRepository.class);
        ruleRepo = mock(RuleRepository.class);
        dataLoader = mock(DataLoader.class);
        clusterService = mock(ClusterService.class);
        seeder = new DatabaseSeeder(customerRepo, clusterRepo, ruleRepo, dataLoader, clusterService);

        ReflectionTestUtils.setField(seeder, "enrichedArffPath", tempDir.resolve("enriched.arff").toString());
        ReflectionTestUtils.setField(seeder, "clustersJsonPath", write("clusters.json", validClusters()));
        ReflectionTestUtils.setField(seeder, "rulesJsonPath", write("rules.json", validRules()));
        ReflectionTestUtils.setField(seeder, "pcaJsonPath", write("pca.json", validPca()));
        ReflectionTestUtils.setField(seeder, "anomaliesJsonPath", write("anomalies.json", validAnomalies()));
        when(dataLoader.loadArff(anyString())).thenReturn(customers(1, 2));
    }

    @Test
    void malformedAnomalyRecordThrowsBeforeSavingCustomers() throws Exception {
        ReflectionTestUtils.setField(seeder, "anomaliesJsonPath", write("bad-anomalies.json", """
                {"records":[{"clientId":1,"phase2Outlier":true,
                  "clusterMildOutlier":true,"clusterStrongOutlier":true,"isAnomaly":true}]}
                """));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).saveAll(org.mockito.ArgumentMatchers.any());
        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void missingPcaFileThrows() {
        ReflectionTestUtils.setField(seeder, "pcaJsonPath", tempDir.resolve("missing-pca.json").toString());

        assertThrows(IllegalStateException.class, () -> seeder.seed());
    }

    @Test
    void fractionalArtifactClientIdThrowsBeforeDeletes() throws Exception {
        ReflectionTestUtils.setField(seeder, "pcaJsonPath", write("fractional-pca.json", """
                {"points":[{"clientId":1.5,"clusterId":2},{"clientId":2,"clusterId":2}]}
                """));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void precisionLosingDecimalArtifactClientIdThrowsBeforeDeletes() throws Exception {
        ReflectionTestUtils.setField(seeder, "pcaJsonPath", write("rounded-pca.json", """
                {"points":[{"clientId":1.00000000000000001,"clusterId":2},
                  {"clientId":2,"clusterId":2}]}
                """));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void duplicateArffClientIdThrowsBeforeDeletes() throws Exception {
        when(dataLoader.loadArff(anyString())).thenReturn(customers(1, 1));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void fractionalArffClientIdThrowsBeforeDeletes() throws Exception {
        when(dataLoader.loadArff(anyString())).thenReturn(customers(1.5, 2));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void missingArffClientIdThrowsBeforeDeletes() throws Exception {
        when(dataLoader.loadArff(anyString())).thenReturn(customers(Double.NaN, 2));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void arffClientIdAboveLongRangeThrowsBeforeDeletes() throws Exception {
        when(dataLoader.loadArff(anyString())).thenReturn(customers(0x1p63, 2));
        ReflectionTestUtils.setField(seeder, "pcaJsonPath", write("max-pca.json", """
                {"points":[{"clientId":9223372036854775807,"clusterId":2},
                  {"clientId":2,"clusterId":2}]}
                """));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void pcaAssignmentToUndefinedClusterThrowsBeforeDeletes() throws Exception {
        ReflectionTestUtils.setField(seeder, "pcaJsonPath", write("orphan-pca.json", """
                {"points":[{"clientId":1,"clusterId":9},{"clientId":2,"clusterId":2}]}
                """));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void incompletePcaCoverageReportsMissingCountBeforeDeletes() throws Exception {
        ReflectionTestUtils.setField(seeder, "pcaJsonPath", write("incomplete-pca.json", """
                {"points":[{"clientId":1,"clusterId":2}]}
                """));

        IllegalStateException error = assertThrows(IllegalStateException.class, () -> seeder.seed());

        assertTrue(error.getMessage().contains("1 customer rows"));
        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void invalidClusterSizeThrowsBeforeDeletes() throws Exception {
        ReflectionTestUtils.setField(seeder, "clustersJsonPath", write("bad-clusters.json", """
                [{"clusterId":2,"size":0,"defaultRate":0.25}]
                """));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void duplicateClusterIdThrowsBeforeDeletes() throws Exception {
        ReflectionTestUtils.setField(seeder, "clustersJsonPath", write("duplicate-clusters.json", """
                [{"clusterId":2,"size":1,"defaultRate":0.25},
                  {"clusterId":2,"size":1,"defaultRate":0.30}]
                """));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    void missingRuleCategoryThrowsBeforeDeletes() throws Exception {
        ReflectionTestUtils.setField(seeder, "rulesJsonPath", write("bad-rules.json", """
                {"rules":[{"lhs":"PAY_1=2","rhs":"Default=Yes","support":0.1,
                  "confidence":0.8,"lift":1.6}]}
                """));

        assertThrows(IllegalStateException.class, () -> seeder.seed());

        verify(customerRepo, never()).deleteAllInBatch();
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void happyPathSeedsCustomersWithNullableCentroidDistance() throws Exception {
        seeder.seed();

        ArgumentCaptor<Iterable<Customer>> captor = ArgumentCaptor.forClass((Class) Iterable.class);
        verify(customerRepo).saveAll(captor.capture());
        List<Customer> saved = StreamSupport.stream(captor.getValue().spliterator(), false).toList();

        assertEquals(2, saved.size());
        assertEquals(new BigDecimal("0.6123"), saved.get(0).getCentroidDistance());
        assertEquals(2, saved.get(0).getClusterId());
        assertEquals(true, saved.get(0).getIsOutlier());
        assertEquals(true, saved.get(0).getIsAnomaly());
        assertNull(saved.get(1).getCentroidDistance());
        assertFalse(saved.get(1).getIsOutlier());
        assertFalse(saved.get(1).getIsAnomaly());
        verify(customerRepo).flush();
        InOrder order = inOrder(customerRepo, clusterService);
        order.verify(customerRepo).flush();
        order.verify(clusterService).invalidate();
        verify(clusterService).invalidate();
    }

    private String write(String fileName, String contents) throws Exception {
        Path path = tempDir.resolve(fileName);
        Files.writeString(path, contents);
        return path.toString();
    }

    private static Instances customers(double... ids) {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("ID"));
        Instances data = new Instances("customers", attributes, ids.length);
        for (double id : ids) {
            data.add(new DenseInstance(1.0, new double[] {id}));
        }
        return data;
    }

    private static String validClusters() {
        return """
                [{"clusterId":2,"personaName":"Test","size":2,"centroid":{},
                  "avgRisk":0.5,"defaultRate":0.25,"description":"Test cluster"}]
                """;
    }

    private static String validRules() {
        return """
                {"rules":[{"lhs":"PAY_1=2","rhs":"Default=Yes","support":0.1,
                  "confidence":0.8,"lift":1.6,"category":"default"}]}
                """;
    }

    private static String validPca() {
        return """
                {"totalRows":2,"points":[
                  {"clientId":1,"clusterId":2,"x":0.1,"y":0.2},
                  {"clientId":2,"clusterId":2,"x":0.2,"y":0.3}
                ]}
                """;
    }

    private static String validAnomalies() {
        return """
                {"records":[{"clientId":1,"clusterId":2,"centroidDistance":0.6123,
                  "phase2Outlier":true,"clusterMildOutlier":true,
                  "clusterStrongOutlier":true,"isAnomaly":true}]}
                """;
    }
}
