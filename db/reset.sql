-- Development-only destructive reset. Apply schema.sql afterwards.
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS rules CASCADE;
DROP TABLE IF EXISTS insights CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS clusters CASCADE;
