package com.creditminer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entrypoint for the CreditMiner REST API.
 *
 * <p>Run with: {@code mvn spring-boot:run}</p>
 *
 * <p>For the offline training pipeline, see
 * {@link com.creditminer.pipeline.TrainPipeline} (a separate {@code main} class).</p>
 */
@SpringBootApplication
public class CreditMinerApplication {

    public static void main(String[] args) {
        SpringApplication.run(CreditMinerApplication.class, args);
    }
}
