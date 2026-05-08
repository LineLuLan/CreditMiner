package com.creditminer;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

/**
 * Sanity test that proves Spring context boots.
 *
 * <p>Disabled by default because it needs a live Postgres (or H2 swap-in).
 * Enable in CI once {@code application-test.yml} provisions an H2 datasource.</p>
 */
@Disabled("TODO: enable after configuring application-test.yml with H2 datasource")
class CreditMinerApplicationTests {

    @Test
    void contextLoads() {
        // Spring Boot will fail fast if any bean wiring is broken.
    }
}
