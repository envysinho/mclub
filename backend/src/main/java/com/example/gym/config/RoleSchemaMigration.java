package com.example.gym.config;

import java.sql.SQLException;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(0)
public class RoleSchemaMigration implements ApplicationRunner {

    private static final String ROLE_CHECK_CONSTRAINT = "users_role_check";

    private final JdbcTemplate jdbcTemplate;

    public RoleSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) throws SQLException {
        String databaseProductName = databaseProductName();
        if (databaseProductName == null || !databaseProductName.toLowerCase().contains("postgresql")) {
            return;
        }

        dropExistingRoleChecks();
        jdbcTemplate.execute("""
                ALTER TABLE users
                ADD CONSTRAINT users_role_check
                CHECK (role IN ('SUDO', 'ADMIN', 'USER', 'ACCESS'))
                """);
    }

    private String databaseProductName() throws SQLException {
        try (var connection = jdbcTemplate.getDataSource().getConnection()) {
            return connection.getMetaData().getDatabaseProductName();
        }
    }

    private void dropExistingRoleChecks() {
        List<String> constraints = jdbcTemplate.queryForList("""
                SELECT c.conname
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE n.nspname = current_schema()
                  AND t.relname = 'users'
                  AND c.contype = 'c'
                  AND pg_get_constraintdef(c.oid) ILIKE '%role%'
                  AND (
                    pg_get_constraintdef(c.oid) ILIKE '%SUDO%'
                    OR pg_get_constraintdef(c.oid) ILIKE '%ADMIN%'
                    OR pg_get_constraintdef(c.oid) ILIKE '%USER%'
                    OR pg_get_constraintdef(c.oid) ILIKE '%ACCESS%'
                  )
                """, String.class);

        for (String constraint : constraints) {
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS " + quoteIdentifier(constraint));
        }

        jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS " + ROLE_CHECK_CONSTRAINT);
    }

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }
}
