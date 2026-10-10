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
                .4, .25, .4, .25, .4, .25, 1., 2., 1., 2., .1, .02, 100000., 2e10, 40., 1700.});
        ClusterService service = new ClusterService(em, new ObjectMapper());
        Path elbow = temporaryDirectory.resolve("elbow.json");
        Files.writeString(elbow, "{\"bestK\":2,\"strategy\":\"argmax silhouette\",\"scores\":[{\"k\":2,\"silhouette\":0.46}]}");
        ReflectionTestUtils.setField(service, "elbowPath", elbow.toString());
        var high = cluster(9, 20, .5, 3);
        var low = cluster(2, 80, .125, .5);
        service.enrich(List.of(high, low));
        assertThat(high.getPersonaName()).isEqualTo("Stored name");
        assertThat(high.getDisplayName()).isEqualTo("Persistent delayers");
        assertThat(low.getDisplayName()).isEqualTo("Mostly current");
        assertThat(high.getShareOfClients()).isEqualTo(.2);
        assertThat(high.getShareOfDefaults()).isEqualTo(.5);
        assertThat(high.getDefaultRateMultiplier()).isEqualTo(2.5);
        assertThat(high.getBaseline().getSize()).isEqualTo(100);
        assertThat(high.getBaseline().getDefaultRate()).isEqualTo(.2);
        assertThat(high.getBaseline()).isSameAs(low.getBaseline());
        assertThat(high.getCentroidDelta().get("MONTHS_DELAYED")).isEqualTo(2);
        assertThat(high.getTraits()).hasSize(3).startsWith("3.0 late months vs 1.0");
        assertThat(high.getEvidence().getSilhouette()).isEqualTo(.46);
        service.enrich(List.of(high, low));
        verify(query, times(1)).getSingleResult();
    }

    @Test
    void tiedDelayMeansKeepGenericNamesAndZeroDenominatorsAreNull() throws Exception {
        var a = cluster(0, 0, 0, 1);
        var b = cluster(1, 0, 0, 1);
        ClusterService.applyProfiles(List.of(a, b), ClusterResponse.Baseline.builder()
                .size(0).defaultRate(0).centroid(Map.of("MONTHS_DELAYED", 0.)).build(), Map.of(), null);
        assertThat(a.getDisplayName()).isEqualTo("Cluster 0");
        assertThat(b.getDisplayName()).isEqualTo("Cluster 1");
        assertThat(a.getShareOfClients()).isNull();
        assertThat(a.getShareOfDefaults()).isNull();
        assertThat(a.getDefaultRateMultiplier()).isNull();
    }

    private static ClusterResponse cluster(int id, int size, double rate, double delay) {
        return ClusterResponse.builder().clusterId(id).personaName("Stored name").size(size)
                .defaultRate(rate).centroid(Map.of("MONTHS_DELAYED", delay,
                        "PAY_RATIO", .3, "LIMIT_BAL", 90000.)).build();
    }
}
