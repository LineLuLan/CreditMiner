package com.creditminer.pipeline;

import com.creditminer.CreditMinerApplication;
import com.creditminer.service.DatabaseSeeder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * OFFLINE Phase 8 — Database seeder (BE-81).
 *
 * <p>Run with:
 * <pre>{@code
 * DATABASE_URL=...  DB_USER=...  DB_PASSWORD=...  SPRING_PROFILES_ACTIVE=prod \
 *   mvn exec:java -Dexec.mainClass="com.creditminer.pipeline.Phase8Seeder"
 * }</pre>
 * </p>
 *
 * <p>Reuses the main {@link CreditMinerApplication} context to acquire JPA
 * repositories, then invokes {@link DatabaseSeeder#seed()}. The web server is
 * disabled (this is a one-shot tool, not a server). Truncates and re-populates
 * the {@code customers}, {@code clusters}, and {@code rules} tables; insights
 * are intentionally untouched.</p>
 */
@Slf4j
public class Phase8Seeder {

    public static void main(String[] args) {
        System.setProperty("spring.main.web-application-type", "none");
        int exit = 0;
        try (ConfigurableApplicationContext ctx =
                     SpringApplication.run(CreditMinerApplication.class, args)) {
            DatabaseSeeder seeder = ctx.getBean(DatabaseSeeder.class);
            seeder.seed();
            log.info("Phase8Seeder DONE");
        } catch (Exception e) {
            log.error("Seeder failed", e);
            exit = 1;
        }
        System.exit(exit);
    }
}
