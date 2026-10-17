package com.creditminer.service;

import com.creditminer.dto.response.ClusterResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ClusterServiceTest {
    @TempDir Path temporaryDirectory;

    @Test
    void comparesTwoClustersToCachedDatabaseBaselineAndNamesByBehaviour() throws Exception {
        EntityManager em = mock(EntityManager.class);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
        // count, defaults, then means and second moments in CLUSTER_FEATURES order.
        when(query.getSingleResult()).thenReturn(new Object[]{100L, 20L,
                .4, .25, .4, .25, .4, .25, 1., 2., 1., 2., .1, .02, 100000., 2e10, 40., 1700., 1.});
        ClusterService service = new ClusterService(em, new ObjectMapper());
        Path elbow = temporaryDirectory.resolve("elbow.json");
        Files.writeString(elbow, "{\"bestK\":2,\"strategy\":\"argmax silhouette\",\"scores\":[{\"k\":2,\"silhouette\":0.46}]}");
        ReflectionTestUtils.setField(service, "elbowPath", elbow.toString());
        var high = cluster(9, 20, .5, 3);
        var low = cluster(2, 80, .125, .5);
        service.enrich(List.of(high, low));
        assertThat(high.getPersonaName()).isEqualTo("Stored name");
        assertThat(high.getDisplayName()).isEqualTo("Persistent delayers");
        assertThat(low.getDisplayName()).isEqualTo("Revolvers, never late");
        assertThat(high.getShareOfClients()).isEqualTo(.2);
        assertThat(high.getShareOfDefaults()).isEqualTo(.5);
        assertThat(high.getDefaultRateMultiplier()).isEqualTo(2.5);
        assertThat(high.getBaseline().getSize()).isEqualTo(100);
        assertThat(high.getBaseline().getDefaultRate()).isEqualTo(.2);
        assertThat(high.getBaseline()).isSameAs(low.getBaseline());
        assertThat(high.getCentroidDelta().get("MONTHS_DELAYED")).isEqualTo(2);
        assertThat(high.getTraits()).hasSize(3).startsWith("Late months (of 6): 3.0 vs 1.0");
        assertThat(high.getEvidence().getSilhouette()).isNull();
        assertThat(high.getEvidence().getMethod()).isEqualTo("final-model silhouette unavailable");
        service.enrich(List.of(high, low));
        verify(query, times(1)).getSingleResult();
    }

    @Test
    void emptyBaselineIsReturnedButRecomputedAfterCustomersAppear() throws Exception {
        EntityManager em = mock(EntityManager.class);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
        Object[] empty = new Object[19];
        empty[0] = 0L;
        when(query.getSingleResult()).thenReturn(empty, populatedRow());
        ClusterService service = new ClusterService(em, new ObjectMapper());
        Path elbow = temporaryDirectory.resolve("elbow-empty.json");
        Files.writeString(elbow, "{\"bestK\":2}");
        ReflectionTestUtils.setField(service, "elbowPath", elbow.toString());

        var before = cluster(2, 20, .5, 3);
        service.enrich(List.of(before));
        assertThat(before.getBaseline().getSize()).isZero();
        assertThat(before.getShareOfClients()).isNull();
        assertThat(ReflectionTestUtils.getField(service, "cached")).isNull();

        var after = cluster(2, 20, .5, 3);
        service.enrich(List.of(after));
        assertThat(after.getBaseline().getSize()).isEqualTo(100);
        assertThat(after.getShareOfClients()).isEqualTo(.2);
        assertThat(ReflectionTestUtils.getField(service, "cached")).isNotNull();
        verify(query, times(2)).getSingleResult();
    }

    @Test
    void missingCentroidMeanIsNotCached() throws Exception {
        EntityManager em = mock(EntityManager.class);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
        Object[] incomplete = populatedRow();
        incomplete[2] = null;
        when(query.getSingleResult()).thenReturn(incomplete, populatedRow());
        ClusterService service = new ClusterService(em, new ObjectMapper());
        Path elbow = temporaryDirectory.resolve("elbow-incomplete.json");
        Files.writeString(elbow, "{\"bestK\":2}");
        ReflectionTestUtils.setField(service, "elbowPath", elbow.toString());

        service.enrich(List.of(cluster(2, 20, .5, 3)));
        assertThat(ReflectionTestUtils.getField(service, "cached")).isNull();
        service.enrich(List.of(cluster(2, 20, .5, 3)));
        assertThat(ReflectionTestUtils.getField(service, "cached")).isNotNull();
        verify(query, times(2)).getSingleResult();
    }

    @Test
    void nullCentroidStillReturnsGenericProfile() {
        var cluster = ClusterResponse.builder().clusterId(3).personaName("Stored name").build();
        ClusterService.applyProfiles(List.of(cluster), ClusterResponse.Baseline.builder()
                .size(0).centroid(Map.of()).build(), Map.of(), null);
        assertThat(cluster.getDisplayName()).isEqualTo("Cluster 3");
        assertThat(cluster.getPersonaName()).isEqualTo("Stored name");
        assertThat(cluster.getTagline()).isNull();
        assertThat(cluster.getTraits()).isEmpty();
    }

    @Test
    void reportsFinalModelSilhouetteInsteadOfSweepScore() throws Exception {
        Path elbow = temporaryDirectory.resolve("final-elbow.json");
        Files.writeString(elbow, """
                {"bestK":4,"chosenK":4,"strategy":"deterministic restarts",
                 "finalSilhouette":0.27,"scores":[{"k":4,"silhouette":0.25}]}
                """);
        var service = new ClusterService(mock(EntityManager.class), new ObjectMapper());
        ReflectionTestUtils.setField(service, "elbowPath", elbow.toString());
        ClusterResponse.Evidence evidence = ReflectionTestUtils.invokeMethod(service, "loadEvidence");
        assertThat(evidence.getK()).isEqualTo(4);
        assertThat(evidence.getSilhouette()).isEqualTo(.27);
    }

    @Test
    void missingFinalSilhouetteDoesNotUseSweepScore() throws Exception {
        Path elbow = temporaryDirectory.resolve("sweep-only-elbow.json");
        Files.writeString(elbow, """
                {"bestK":4,"chosenK":4,"strategy":"deterministic restarts",
                 "scores":[{"k":4,"silhouette":0.2594}]}
                """);
        var service = new ClusterService(mock(EntityManager.class), new ObjectMapper());
        ReflectionTestUtils.setField(service, "elbowPath", elbow.toString());
        ClusterResponse.Evidence evidence = ReflectionTestUtils.invokeMethod(service, "loadEvidence");
        assertThat(evidence.getK()).isEqualTo(4);
        assertThat(evidence.getSilhouette()).isNull();
        assertThat(evidence.getMethod()).isEqualTo("final-model silhouette unavailable");
        Files.writeString(elbow, "{\"bestK\":4,\"scores\":[{\"k\":4,\"silhouette\":0.2594}]}");
        evidence = ReflectionTestUtils.invokeMethod(service, "loadEvidence");
        assertThat(evidence.getK()).isEqualTo(4);
        assertThat(evidence.getSilhouette()).isNull();
        assertThat(evidence.getMethod()).isEqualTo("final-model silhouette unavailable");
    }

    @Test
    void tiedDelayMeansGetCollisionNamesAndZeroDenominatorsAreNull() throws Exception {
        var a = cluster(0, 0, 0, 1);
        var b = cluster(1, 0, 0, 1);
        ClusterService.applyProfiles(List.of(a, b), ClusterResponse.Baseline.builder()
                .size(0).defaultRate(0).centroid(Map.of("MONTHS_DELAYED", 0.)).build(), Map.of(), null);
        assertThat(a.getDisplayName()).isEqualTo("Occasional delayers (lower utilization)");
        assertThat(b.getDisplayName()).isEqualTo("Occasional delayers (higher utilization)");
        assertThat(a.getShareOfClients()).isNull();
        assertThat(a.getShareOfDefaults()).isNull();
        assertThat(a.getDefaultRateMultiplier()).isNull();
    }

    private static ClusterResponse cluster(int id, int size, double rate, double delay) {
        return ClusterResponse.builder().clusterId(id).personaName("Stored name").size(size)
                .defaultRate(rate).centroid(Map.of("MONTHS_DELAYED", delay,
                        "PAY_RATIO", .3, "LIMIT_BAL", 90000.)).build();
    }

    private static Object[] populatedRow() {
        return new Object[]{100L, 20L,
                .4, .25, .4, .25, .4, .25, 1., 2., 1., 2., .1, .02, 100000., 2e10, 40., 1700., 1.};
    }
}
