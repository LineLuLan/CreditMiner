# Database migrations

Migrations are manually reviewed and applied. They never run automatically at application startup.

`2026-09-26_uci_credit_default.sql` is destructive: it drops and recreates all affected tables.
It requires explicit written approval, a current backup, and a tested restore plan. The application
owner records application time and operator after it is applied.

The earlier insight refresh file is retained as a no-op so historical references remain valid.
