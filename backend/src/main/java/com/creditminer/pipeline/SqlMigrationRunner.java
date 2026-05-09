package com.creditminer.pipeline;

import lombok.extern.slf4j.Slf4j;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

/**
 * Lightweight one-shot SQL runner that executes a single .sql file against the Neon DB
 * via JDBC. Used for ad-hoc migrations like {@code db/migrations/*.sql} that don't
 * warrant a full Flyway/Liquibase setup.
 *
 * <p>Reads {@code DATABASE_URL}, {@code DB_USER}, {@code DB_PASSWORD} from env.
 * The SQL file path is the first CLI arg.</p>
 *
 * <p>Run with:
 * <pre>{@code
 * mvn -q exec:java -Dexec.mainClass=com.creditminer.pipeline.SqlMigrationRunner \
 *   -Dexec.args="../db/migrations/2026-05-09_refresh_insights.sql"
 * }</pre>
 * </p>
 */
@Slf4j
public class SqlMigrationRunner {

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("Usage: SqlMigrationRunner <path-to-sql-file>");
            System.exit(2);
        }
        Path sqlPath = Path.of(args[0]);
        String sql = Files.readString(sqlPath);
        log.info("Applying {} ({} chars)", sqlPath, sql.length());

        String url = System.getenv("DATABASE_URL");
        String user = System.getenv("DB_USER");
        String password = System.getenv("DB_PASSWORD");
        if (url == null || user == null || password == null) {
            System.err.println("DATABASE_URL / DB_USER / DB_PASSWORD env vars must all be set");
            System.exit(3);
        }

        Class.forName("org.postgresql.Driver");
        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement st = conn.createStatement()) {
            st.execute(sql);
            log.info("SQL applied successfully");
        }
    }
}
