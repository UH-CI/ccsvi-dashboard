-- Phase 4 of MOE_RELIABILITY_PLAN.md: adds pp-margin, CV, and derived-margin columns to metric_values.
--
-- docker exec -i ccsvi-pg psql -U ccsvi -d ccsvi < backend/db/init/04_moe_reliability.sql
--
-- After running: re-run the census loader (ingest/load_cleaned_census.py) so these columns
-- get populated for existing rows, then:
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW block_group_metrics;"
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW hawaiian_homeland_metrics;"

ALTER TABLE metric_values ADD COLUMN IF NOT EXISTS moe_percentage_points NUMERIC;
ALTER TABLE metric_values ADD COLUMN IF NOT EXISTS cv                    NUMERIC;
ALTER TABLE metric_values ADD COLUMN IF NOT EXISTS moe_derived           BOOLEAN;
