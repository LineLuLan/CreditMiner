-- =============================================================================
-- CreditMiner — reset (DEV ONLY — DESTRUCTIVE)
-- Drops all tables. Re-run schema.sql + seed.sql afterwards.
-- =============================================================================

DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS rules CASCADE;
DROP TABLE IF EXISTS insights CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS clusters CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'All CreditMiner tables dropped. Re-apply schema.sql + seed.sql.';
END $$;
