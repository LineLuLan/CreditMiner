package com.creditminer;

import com.creditminer.service.DatabaseSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

/** Proves that the local demo configuration boots without an external database. */
@SpringBootTest(properties = {
        "creditminer.data.enriched-arff=target/test-missing/enriched.arff",
        "creditminer.models.classifier=target/test-missing/rf.model",
        "creditminer.models.clusterer=target/test-missing/kmeans.model",
        "creditminer.models.clusterer-normalizer=target/test-missing/normalizer.model",
        "creditminer.models.kmeans-input-header=target/test-missing/header.model"
})
@ActiveProfiles("demo")
class CreditMinerApplicationTests {
    @MockBean
    private DatabaseSeeder databaseSeeder;

    @Test
    void contextLoads() {
    }
}
