package com.creditminer.service;

import com.creditminer.dto.response.ClusterResponse;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

class PersonaNamingTest {
    @Test
    void namesFourObservedCentroidsInOriginalUnits() {
        var clusters = List.of(profile(0, 5.15, .08, .62), profile(1, 1.64, .25, .43),
                profile(2, 0, .16, .50), profile(3, .10, .88, .09));
        PersonaNaming.apply(clusters);
        assertThat(clusters).extracting(ClusterResponse::getDisplayName).containsExactly(
                "Persistent delayers", "Occasional delayers", "Revolvers, never late", "Transactors");
        assertThat(clusters.get(3).getTagline()).isEqualTo("Pay bills in full, high limits");
        assertThat(clusters.get(2).getTagline()).isEqualTo("Carry a balance, pay on time");
    }

    @Test
    void preservesStoredNamesAndDoesNotInferMissingCentroids() {
        var missingDelay = ClusterResponse.builder().clusterId(4).personaName("Legacy persona")
                .centroid(Map.of("PAY_RATIO", .9)).build();
        var missingRatio = ClusterResponse.builder().clusterId(5).personaName("Stored persona")
                .centroid(Map.of("MONTHS_DELAYED", 4.)).build();
        var missingAll = ClusterResponse.builder().clusterId(6).centroid(null).build();
        PersonaNaming.apply(List.of(missingDelay, missingRatio, missingAll));
        assertThat(missingDelay.getPersonaName()).isEqualTo("Legacy persona");
        assertThat(missingRatio.getPersonaName()).isEqualTo("Stored persona");
        assertThat(List.of(missingDelay, missingRatio, missingAll))
                .extracting(ClusterResponse::getDisplayName).containsExactly("Cluster 4", "Cluster 5", "Cluster 6");
        assertThat(List.of(missingDelay, missingRatio, missingAll))
                .extracting(ClusterResponse::getTagline).containsOnlyNulls();
    }

    @Test
    void disambiguatesCollisionByUtilizationWithoutReorderingIds() {
        var high = profile(7, 1, .2, .8);
        var low = profile(2, 2, .3, .2);
        PersonaNaming.apply(List.of(high, low));
        assertThat(high.getDisplayName()).isEqualTo("Occasional delayers (higher utilization)");
        assertThat(low.getDisplayName()).isEqualTo("Occasional delayers (lower utilization)");
        assertThat(high.getClusterId()).isEqualTo(7);
    }

    private static ClusterResponse profile(int id, double delay, double ratio, double utilization) {
        return ClusterResponse.builder().clusterId(id).centroid(Map.of("MONTHS_DELAYED", delay,
                "PAY_RATIO", ratio, "AVG_UTILIZATION", utilization)).build();
    }

    @Test
    void namesThreeWayCollisionByDescendingUtilizationWithoutReordering() {
        var clusters = List.of(profile(2, 1, .2, .2), profile(7, 1, .2, .8), profile(5, 1, .2, .5));
        PersonaNaming.apply(clusters);
        assertThat(clusters).extracting(ClusterResponse::getDisplayName).containsExactly(
                "Occasional delayers (lowest utilization)", "Occasional delayers (highest utilization)",
                "Occasional delayers (middle utilization)");
        assertThat(clusters).extracting(ClusterResponse::getClusterId).containsExactly(2, 7, 5);
    }

    @Test
    void ranksLargerCollisionsDescendingWithStableIdTies() {
        var clusters = List.of(profile(9, 1, .2, .8), profile(2, 1, .2, .2),
                profile(7, 1, .2, .8), profile(5, 1, .2, .5));
        PersonaNaming.apply(clusters);
        assertThat(clusters).extracting(ClusterResponse::getDisplayName).containsExactly(
                "Occasional delayers (utilization rank 2)", "Occasional delayers (utilization rank 4)",
                "Occasional delayers (utilization rank 1)", "Occasional delayers (utilization rank 3)");
    }
}
