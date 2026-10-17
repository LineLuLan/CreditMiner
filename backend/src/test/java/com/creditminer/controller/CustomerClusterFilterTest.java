package com.creditminer.controller;

import com.creditminer.entity.Customer;
import com.creditminer.repository.CustomerRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CustomerClusterFilterTest {
    @Test
    void filtersAndPaginatesCustomersForEveryRegeneratedArtifactClusterId() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode personas = mapper.readTree(Path.of("data/processed/phase6_clusters.json").toFile());
        JsonNode points = mapper.readTree(Path.of("data/processed/phase6_pca_2d.json").toFile()).path("points");
        assertThat(personas.size()).isPositive();
        Map<Integer, List<Customer>> customers = new LinkedHashMap<>();
        for (JsonNode persona : personas) customers.put(persona.path("clusterId").asInt(), new ArrayList<>());
        for (JsonNode point : points) {
            int clusterId = point.path("clusterId").asInt();
            assertThat(customers).containsKey(clusterId);
            customers.get(clusterId).add(Customer.builder()
                    .clientId(point.path("clientId").asLong()).clusterId(clusterId).build());
        }
        customers.values().forEach(rows -> rows.sort(Comparator.comparing(Customer::getClientId)));

        CustomerRepository repo = mock(CustomerRepository.class);
        when(repo.findByClusterId(anyInt(), any(Pageable.class))).thenAnswer(invocation -> {
            int clusterId = invocation.getArgument(0);
            Pageable page = invocation.getArgument(1);
            assertThat(page.getSort()).isEqualTo(Sort.by("clientId"));
            List<Customer> rows = customers.get(clusterId);
            int first = Math.min((int) page.getOffset(), rows.size());
            int last = Math.min(first + page.getPageSize(), rows.size());
            return new PageImpl<>(rows.subList(first, last), page, rows.size());
        });
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new CustomerController(repo)).build();
        for (JsonNode persona : personas) {
            int clusterId = persona.path("clusterId").asInt();
            List<Customer> expected = customers.get(clusterId);
            assertThat(expected).hasSize(persona.path("size").asInt());
            for (int page = 1; page <= 2; page++) {
                String response = mvc.perform(get("/api/customers").param("clusterId", Integer.toString(clusterId))
                                .param("page", Integer.toString(page)).param("size", "5"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.total").value(expected.size()))
                        .andExpect(jsonPath("$.page").value(page))
                        .andExpect(jsonPath("$.size").value(5))
                        .andReturn().getResponse().getContentAsString();
                JsonNode items = mapper.readTree(response).path("items");
                int offset = Math.min((page - 1) * 5, expected.size());
                assertThat(items.size()).isEqualTo(Math.min(5, expected.size() - offset));
                for (int index = 0; index < items.size(); index++) {
                    assertThat(items.get(index).path("clusterId").asInt()).isEqualTo(clusterId);
                    assertThat(items.get(index).path("clientId").asLong())
                            .isEqualTo(expected.get(offset + index).getClientId());
                }
            }
            verify(repo, times(2)).findByClusterId(eq(clusterId), any(Pageable.class));
        }
        verify(repo, never()).findAll(any(Pageable.class));
        verify(repo, never()).findByDefaultFlag(anyString(), any(Pageable.class));
    }
}
