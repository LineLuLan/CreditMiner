package com.creditminer.config;

import com.creditminer.entity.Insight;
import com.creditminer.repository.InsightRepository;
import com.creditminer.service.DatabaseSeeder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds the demo in-memory database from generated artifacts at startup.
 */
@Slf4j
@Component
@Profile("demo")
@RequiredArgsConstructor
public class DemoDataInitializer implements ApplicationRunner {

    private final DatabaseSeeder databaseSeeder;
    private final InsightRepository insightRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        log.info("Demo profile active: seeding in-memory database from local artifacts");
        databaseSeeder.seed();
        seedInsights();
        log.info("Demo in-memory database ready");
    }

    private void seedInsights() throws Exception {
        try (InputStream in = new ClassPathResource("insights.json").getInputStream()) {
            JsonNode arr = objectMapper.readTree(in);
            List<Insight> rows = new ArrayList<>();
            for (JsonNode n : arr) {
                rows.add(Insight.builder()
                        .title(n.path("title").asText())
                        .discovery(n.path("discovery").asText())
                        .evidence(n.path("evidence").asText())
                        .recommendation(n.path("recommendation").asText())
                        .category(n.path("category").asText())
                        .priority(n.path("priority").asInt(1))
                        .build());
            }
            insightRepository.deleteAllInBatch();
            insightRepository.saveAll(rows);
            log.info("Seeded {} demo insights", rows.size());
        }
    }
}
