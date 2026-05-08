package com.creditminer.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Cross-origin policy for the Next.js frontend.
 *
 * <p>Allowed origins are loaded from {@code creditminer.cors.allowed-origins}.
 * In dev this includes {@code http://localhost:3000}; in prod the Vercel URL.</p>
 *
 * <p>Credentials are NOT allowed — this academic project uses no cookies.</p>
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${creditminer.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.toArray(new String[0]))
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("Content-Type", "Accept", "X-Requested-With")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
