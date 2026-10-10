package com.creditminer.controller;

import com.creditminer.entity.Cluster;
import com.creditminer.repository.ClusterRepository;
import com.creditminer.repository.CustomerRepository;
import com.creditminer.service.ClusterService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ClusterControllerTest {
    @TempDir Path temp;

    @Test
    void retainsArrayAndStoredFieldsWhileAddingPortfolioComparison() throws Exception {
        ClusterRepository clusters = mock(ClusterRepository.class);
        when(clusters.findAll()).thenReturn(List.of(cluster(0, 20, ".5", 3), cluster(1, 80, ".125", .5)));
        EntityManager em = mock(EntityManager.class);
        @SuppressWarnings("unchecked") TypedQuery<Object[]> query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Object[].class))).thenReturn(query);
        when(query.getSingleResult()).thenReturn(new Object[]{100L, 20L,
                .4, .25, .4, .25, .4, .25, 1., 2., 1., 2., .1, .02, 100000., 2e10, 40., 1700.});
        ClusterService service = new ClusterService(em, new ObjectMapper());
        Path elbow = temp.resolve("elbow.json");
        Files.writeString(elbow, "{\"bestK\":2,\"strategy\":\"argmax silhouette\",\"scores\":[{\"k\":2,\"silhouette\":0.46}]}");
        ReflectionTestUtils.setField(service, "elbowPath", elbow.toString());
        var mvc = MockMvcBuilders.standaloneSetup(new ClusterController(clusters,
                mock(CustomerRepository.class), service)).build();
        mvc.perform(get("/api/clusters"))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].personaName").value("Legacy persona"))
                .andExpect(jsonPath("$[0].displayName").value("Persistent delayers"))
                .andExpect(jsonPath("$[1].displayName").value("Mostly current"))
                .andExpect(jsonPath("$[0].shareOfClients").value(.2))
                .andExpect(jsonPath("$[0].shareOfDefaults").value(.5))
                .andExpect(jsonPath("$[0].defaultRateMultiplier").value(2.5))
                .andExpect(jsonPath("$[0].baseline.size").value(100))
                .andExpect(jsonPath("$[0].centroidDelta.MONTHS_DELAYED").value(2.0))
                .andExpect(jsonPath("$[0].traits[0]").value("3.0 late months vs 1.0"))
                .andExpect(jsonPath("$[0].evidence.k").value(2))
                .andExpect(jsonPath("$[0].evidence.method").value("argmax silhouette"));
    }

    private Cluster cluster(int id, int size, String rate, double delay) {
        return Cluster.builder().clusterId(id).size(size).personaName("Legacy persona")
                .defaultRate(new BigDecimal(rate)).centroidJson("{\"MONTHS_DELAYED\":" + delay + "}").build();
    }
}
