package com.creditminer.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI / OpenAPI spec for the REST API.
 *
 * <p>Once running, browse to:
 * <ul>
 *   <li>{@code /swagger-ui.html} — interactive UI</li>
 *   <li>{@code /v3/api-docs} — raw OpenAPI 3 JSON</li>
 *   <li>{@code /v3/api-docs.yaml} — YAML version</li>
 * </ul>
 * </p>
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI creditMinerOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CreditMiner API")
                        .version("v1")
                        .description("REST API for credit card customer behavior mining and risk detection. "
                                + "See docs/BE_Handoff.md for the canonical contract.")
                        .contact(new Contact()
                                .name("CreditMiner Team")
                                .email("team@creditminer.local"))
                        .license(new License()
                                .name("MIT")
                                .url("https://opensource.org/licenses/MIT")));
    }
}
