package com.creditminer.service;

import com.creditminer.dto.response.ClusterResponse;
import com.creditminer.entity.Customer;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ClusterAggregateTest {
    @Test
    void queryExecutesAgainstIsolatedInMemoryCustomerTable() {
        // A throwaway test database only: no application profile, seeder or external connection.
        Configuration configuration = new Configuration().addAnnotatedClass(Customer.class)
                .setProperty("hibernate.connection.driver_class", "org.h2.Driver")
                .setProperty("hibernate.connection.url", "jdbc:h2:mem:cluster_profile_test")
                .setProperty("hibernate.hbm2ddl.auto", "create-drop")
                .setProperty("hibernate.show_sql", "false");
        try (var factory = configuration.buildSessionFactory(); var session = factory.openSession()) {
            session.beginTransaction();
            for (int i = 1; i <= 4; i++) {
                session.persist(Customer.builder().clientId((long) i).defaultFlag(i == 1 ? "Yes" : "No")
                        .monthsDelayed(i == 1 ? 4 : 0).maxDelay(i == 1 ? 2 : 0).age(40)
                        .limitBal(BigDecimal.valueOf(100000)).payRatio(BigDecimal.valueOf(.4))
                        .avgUtilization(BigDecimal.valueOf(.3)).utilization1(BigDecimal.valueOf(.5))
                        .billTrend(BigDecimal.valueOf(.1)).build());
            }
            session.flush();
            ClusterService service = new ClusterService(session, new ObjectMapper());
            ReflectionTestUtils.setField(service, "elbowPath", "data/processed/phase6_elbow.json");
            var cluster = ClusterResponse.builder().clusterId(0).size(4).defaultRate(.25)
                    .centroid(Map.of("MONTHS_DELAYED", 4.)).build();
            service.enrich(List.of(cluster));
            assertThat(cluster.getBaseline().getSize()).isEqualTo(4);
            assertThat(cluster.getBaseline().getDefaultRate()).isEqualTo(.25);
            assertThat(cluster.getBaseline().getCentroid()).containsEntry("MONTHS_DELAYED", 1.)
                    .containsEntry("PAY_RATIO", .4).containsEntry("LIMIT_BAL", 100000.);
            assertThat(cluster.getCentroidDelta()).containsEntry("MONTHS_DELAYED", 3.);
            session.getTransaction().rollback();
        }
    }
}
